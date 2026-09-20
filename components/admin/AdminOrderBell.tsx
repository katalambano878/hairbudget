'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const SEEN_KEY = 'hairbudget.admin.seenOrderIds';
const POLL_MS = 20000;

type OrderAlert = {
  id: string;
  order_number: string;
  email: string;
  total: number;
  created_at: string;
  payment_status: string;
};

function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

function saveSeen(ids: Set<string>) {
  localStorage.setItem(SEEN_KEY, JSON.stringify([...ids]));
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.max(0, Math.floor(ms / 60000));
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminOrderBell() {
  const [open, setOpen] = useState(false);
  const [orders, setOrders] = useState<OrderAlert[]>([]);
  const [unseen, setUnseen] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const knownIds = useRef<Set<string>>(new Set());
  const primed = useRef(false);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, email, total, created_at, payment_status')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !data) return;
    const rows = data as OrderAlert[];
    setOrders(rows);

    let seen = loadSeen();
    if (!localStorage.getItem(SEEN_KEY)) {
      const cutoff = Date.now() - 60 * 60 * 1000;
      rows
        .filter((o) => new Date(o.created_at).getTime() < cutoff)
        .forEach((o) => seen.add(o.id));
      saveSeen(seen);
    }
    const fresh = rows.filter((o) => !seen.has(o.id));
    setUnseen(fresh.length);

    if (primed.current) {
      const newcomers = rows.filter((o) => !knownIds.current.has(o.id));
      if (newcomers.length && typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          const latest = newcomers[0];
          new Notification('New HairBudget order', {
            body: `${latest.order_number} · GH₵${Number(latest.total).toFixed(2)}`,
          });
        }
      }
    } else {
      primed.current = true;
    }
    knownIds.current = new Set(rows.map((o) => o.id));
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const markAllRead = () => {
    const next = loadSeen();
    orders.forEach((o) => next.add(o.id));
    saveSeen(next);
    setUnseen(0);
  };

  const openBell = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
      refresh();
    }
  };

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={openBell}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl text-ui-500 hover:text-ui-900 hover:bg-ui-100 transition-all cursor-pointer"
        aria-label={unseen ? `${unseen} new orders` : 'Order notifications'}
      >
        <i className="ri-notification-3-line text-lg" />
        {unseen > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-brand-gold text-brand-deep text-[9px] font-black grid place-items-center">
            {unseen > 9 ? '9+' : unseen}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-ui-200 rounded-2xl shadow-xl overflow-hidden z-30 tracking-normal">
          <div className="px-4 py-3 border-b border-ui-100 flex items-center justify-between">
            <p className="text-sm font-bold text-ui-900">Orders</p>
            {unseen > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs font-semibold text-brand-forest">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {orders.length === 0 ? (
              <p className="px-4 py-8 text-sm text-ui-500 text-center">No orders yet.</p>
            ) : (
              orders.map((o) => {
                const isNew = !loadSeen().has(o.id);
                return (
                  <Link
                    key={o.id}
                    href={`/admin/orders/${o.id}`}
                    onClick={() => {
                      const next = loadSeen();
                      next.add(o.id);
                      saveSeen(next);
                      setUnseen((n) => Math.max(0, n - (isNew ? 1 : 0)));
                      setOpen(false);
                    }}
                    className={`block px-4 py-3 hover:bg-ui-50 border-b border-ui-50 ${isNew ? 'bg-brand-cream/40' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ui-900">{o.order_number}</p>
                      <span className="text-[11px] text-ui-500">{timeAgo(o.created_at)}</span>
                    </div>
                    <p className="text-xs text-ui-500 truncate">{o.email}</p>
                    <p className="text-xs font-semibold text-ui-800 mt-0.5">
                      GH₵{Number(o.total).toFixed(2)} · {o.payment_status}
                    </p>
                  </Link>
                );
              })
            )}
          </div>
          <Link
            href="/admin/orders"
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-center text-sm font-semibold text-brand-forest hover:bg-ui-50"
          >
            View all orders
          </Link>
        </div>
      )}
    </div>
  );
}
