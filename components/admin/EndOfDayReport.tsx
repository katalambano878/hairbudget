'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  accraDayBounds,
  formatGhs,
  methodLabel,
  summarizeDay,
  todayAccra,
  type DayOrder,
  type DaySummary,
  type PaymentBucket,
} from '@/lib/end-of-day';

type SavedReport = {
  id: string;
  report_date: string;
  opening_cash: number;
  counted_cash: number | null;
  expected_cash: number;
  variance: number | null;
  notes: string | null;
  closed_at: string | null;
};

const METHOD_KEYS: PaymentBucket[] = ['cash', 'card', 'momo', 'paystack', 'other'];

export default function EndOfDayReport() {
  const [date, setDate] = useState(todayAccra);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<DayOrder[]>([]);
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [saved, setSaved] = useState<SavedReport | null>(null);
  const [openingCash, setOpeningCash] = useState('0');
  const [countedCash, setCountedCash] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { start, end } = accraDayBounds(date);
      const [{ data: orderRows, error: orderError }, { data: reportRows }] = await Promise.all([
        supabase
          .from('orders')
          .select(
            'id, order_number, email, phone, status, payment_status, payment_method, total, subtotal, discount_total, amount_paid, balance_due, created_at, coupon_code, metadata, shipping_address, billing_address, order_items(product_id, product_name, quantity, unit_price, total_price)'
          )
          .gte('created_at', start)
          .lt('created_at', end)
          .order('created_at', { ascending: false }),
        supabase
          .from('end_of_day_reports')
          .select('id, report_date, opening_cash, counted_cash, expected_cash, variance, notes, closed_at')
          .eq('report_date', date)
          .maybeSingle(),
      ]);

      if (orderError) throw orderError;

      const rows = (orderRows || []) as DayOrder[];
      setOrders(rows);
      setSummary(summarizeDay(rows));

      if (reportRows) {
        setSaved(reportRows as SavedReport);
        setOpeningCash(String(reportRows.opening_cash ?? 0));
        setCountedCash(reportRows.counted_cash != null ? String(reportRows.counted_cash) : '');
        setNotes(reportRows.notes || '');
      } else {
        setSaved(null);
        setOpeningCash('0');
        setCountedCash('');
        setNotes('');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load the day');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const opening = Number(openingCash) || 0;
  const counted = countedCash === '' ? null : Number(countedCash);
  const expectedCash = opening + (summary?.cashExpectedFromTill || 0);
  const variance = counted == null ? null : counted - expectedCash;

  const closeDay = async () => {
    if (!summary) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        report_date: date,
        opening_cash: opening,
        counted_cash: counted,
        expected_cash: expectedCash,
        variance,
        website_collected: summary.website.collected,
        pos_collected: summary.pos.collected,
        cash_collected: summary.byMethod.cash,
        card_collected: summary.byMethod.card,
        momo_collected: summary.byMethod.momo,
        paystack_collected: summary.byMethod.paystack,
        other_collected: summary.byMethod.other,
        orders_count: summary.ordersCount,
        items_sold: summary.itemsSold,
        order_total: summary.orderTotal,
        amount_paid_total: summary.collected,
        outstanding_total: summary.outstanding,
        notes: notes || null,
        snapshot: summary,
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from('end_of_day_reports')
        .upsert(payload, { onConflict: 'report_date' });
      if (upsertError) throw upsertError;
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not close the day');
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const header = ['Order', 'Channel', 'Customer', 'Method', 'Status', 'Payment', 'Total', 'Collected', 'Time'];
    const lines = orders.map((o) => {
      const pos = o.metadata?.pos_sale || o.shipping_address?.pos_sale;
      return [
        o.order_number || o.id,
        pos ? 'POS' : 'Website',
        o.email || o.phone || '',
        o.payment_method || '',
        o.status || '',
        o.payment_status || '',
        Number(o.total || 0).toFixed(2),
        (o.amount_paid || 0).toString(),
        o.created_at || '',
      ].join(',');
    });
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hairbudget-eod-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxMethod = useMemo(
    () => Math.max(1, ...METHOD_KEYS.map((k) => summary?.byMethod[k] || 0)),
    [summary]
  );

  return (
    <div className="space-y-6 eod-print">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 no-print">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-ui-500 mb-1">Reconciliation</p>
          <h2 className="text-2xl font-bold text-ui-900">End of day</h2>
          <p className="text-sm text-ui-500 mt-1">
            Website checkout and POS till, Accra time. Collected is money actually received (including deposits).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-ui-200 bg-white text-sm"
          />
          <button
            type="button"
            onClick={load}
            className="px-3 py-2 rounded-xl border border-ui-200 text-sm font-semibold hover:bg-ui-50"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="px-3 py-2 rounded-xl border border-ui-200 text-sm font-semibold hover:bg-ui-50"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-2 rounded-xl bg-brand-forest text-brand-ivory text-sm font-semibold"
          >
            Print
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 text-red-800 text-sm border border-red-100">{error}</div>
      )}

      {loading || !summary ? (
        <div className="flex items-center gap-2 text-ui-500 py-16 justify-center">
          <i className="ri-loader-4-line text-2xl animate-spin" />
          Loading the day…
        </div>
      ) : (
        <>
          {saved?.closed_at && (
            <div className="rounded-xl border border-brand-gold/40 bg-brand-cream/40 px-4 py-3 text-sm text-brand-forest">
              Closed {new Date(saved.closed_at).toLocaleString()} — snapshot saved.
            </div>
          )}

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <Kpi label="Collected" value={formatGhs(summary.collected)} hint="Cash in from web + POS" accent />
            <Kpi label="Orders" value={String(summary.ordersCount)} hint={`${summary.itemsSold} items · ${summary.voidedCount} voided`} />
            <Kpi label="Website" value={formatGhs(summary.website.collected)} hint={`${summary.website.orders} orders`} />
            <Kpi label="POS" value={formatGhs(summary.pos.collected)} hint={`${summary.pos.orders} orders`} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 bg-white rounded-2xl border border-ui-200 p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ui-500 mb-4">Payment mix</p>
              <div className="space-y-3">
                {METHOD_KEYS.map((key) => {
                  const amount = summary.byMethod[key];
                  const pct = Math.round((amount / maxMethod) * 100);
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-ui-700">{methodLabel(key)}</span>
                        <span className="font-semibold tabular-nums">{formatGhs(amount)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-ui-100 overflow-hidden">
                        <div className="h-full bg-brand-forest rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-ui-50 p-3">
                  <p className="text-ui-500">Order value</p>
                  <p className="font-bold text-ui-900">{formatGhs(summary.orderTotal)}</p>
                </div>
                <div className="rounded-xl bg-ui-50 p-3">
                  <p className="text-ui-500">Still outstanding</p>
                  <p className="font-bold text-amber-700">{formatGhs(summary.outstanding)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-ui-200 p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ui-500 mb-4">Cash till</p>
              <label className="block text-xs text-ui-500 mb-1">Opening float</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                className="w-full mb-3 px-3 py-2 rounded-xl border border-ui-200"
              />
              <label className="block text-xs text-ui-500 mb-1">Counted cash</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
                className="w-full mb-4 px-3 py-2 rounded-xl border border-ui-200"
                placeholder="Count the drawer"
              />
              <dl className="space-y-2 text-sm">
                <Row k="POS cash sales" v={formatGhs(summary.cashExpectedFromTill)} />
                <Row k="Expected in drawer" v={formatGhs(expectedCash)} />
                <Row
                  k="Variance"
                  v={variance == null ? '—' : formatGhs(variance)}
                  tone={variance == null ? undefined : variance === 0 ? 'ok' : 'warn'}
                />
              </dl>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Notes for this close…"
                className="w-full mt-4 px-3 py-2 rounded-xl border border-ui-200 text-sm"
              />
              <button
                type="button"
                disabled={saving}
                onClick={closeDay}
                className="w-full mt-3 py-3 rounded-xl bg-brand-forest text-brand-ivory font-bold text-sm disabled:opacity-50"
              >
                {saving ? 'Saving…' : saved ? 'Update close' : 'Close day'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-ui-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-ui-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-ui-500">Top products today</p>
              </div>
              {summary.topProducts.length === 0 ? (
                <p className="p-6 text-sm text-ui-500">No items sold yet.</p>
              ) : (
                <ul className="divide-y divide-ui-100">
                  {summary.topProducts.map((p) => (
                    <li key={p.name} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ui-900">{p.name}</p>
                        <p className="text-xs text-ui-500">{p.qty} sold</p>
                      </div>
                      <p className="font-semibold tabular-nums">{formatGhs(p.revenue)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-ui-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-ui-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-ui-500">Coupons used</p>
              </div>
              {summary.coupons.length === 0 ? (
                <p className="p-6 text-sm text-ui-500">No discount codes on today’s orders.</p>
              ) : (
                <ul className="divide-y divide-ui-100">
                  {summary.coupons.map((c) => (
                    <li key={c.code} className="px-5 py-3 flex items-center justify-between">
                      <span className="font-mono font-bold">{c.code}</span>
                      <span className="text-sm text-ui-600">{c.uses} · {formatGhs(c.discount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-ui-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-ui-100 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ui-500">Orders</p>
              <Link href="/admin/orders" className="text-xs font-semibold text-brand-forest">Open orders</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-ui-50 text-left text-ui-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Order</th>
                    <th className="px-4 py-3 font-semibold">Channel</th>
                    <th className="px-4 py-3 font-semibold">Method</th>
                    <th className="px-4 py-3 font-semibold">Payment</th>
                    <th className="px-4 py-3 font-semibold text-right">Total</th>
                    <th className="px-4 py-3 font-semibold text-right">Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-ui-500">No orders on this date.</td>
                    </tr>
                  ) : (
                    orders.map((o) => {
                      const pos = Boolean(o.metadata?.pos_sale || o.shipping_address?.pos_sale);
                      return (
                        <tr key={o.id} className="border-t border-ui-100">
                          <td className="px-4 py-3">
                            <Link href={`/admin/orders/${o.id}`} className="font-semibold text-brand-forest hover:underline">
                              {o.order_number}
                            </Link>
                            <p className="text-xs text-ui-500">{o.created_at ? new Date(o.created_at).toLocaleTimeString() : ''}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${pos ? 'bg-brand-cream text-brand-forest' : 'bg-ui-100 text-ui-700'}`}>
                              {pos ? 'POS' : 'Website'}
                            </span>
                          </td>
                          <td className="px-4 py-3 capitalize">{o.payment_method || '—'}</td>
                          <td className="px-4 py-3 capitalize">{o.payment_status}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatGhs(Number(o.total || 0))}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatGhs(Number(o.amount_paid || 0))}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <style>{`
        @media print {
          aside, header, .no-print { display: none !important; }
          .eod-print { color: #111 !important; }
        }
      `}</style>
    </div>
  );
}

function Kpi({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'bg-brand-forest text-brand-ivory border-brand-forest' : 'bg-white border-ui-200'}`}>
      <p className={`text-[10px] font-bold uppercase tracking-widest ${accent ? 'text-brand-gold' : 'text-ui-500'}`}>{label}</p>
      <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
      {hint && <p className={`text-xs mt-1 ${accent ? 'text-brand-ivory/70' : 'text-ui-500'}`}>{hint}</p>}
    </div>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone?: 'ok' | 'warn' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ui-500">{k}</span>
      <span className={`font-semibold tabular-nums ${tone === 'ok' ? 'text-emerald-700' : tone === 'warn' ? 'text-red-700' : 'text-ui-900'}`}>
        {v}
      </span>
    </div>
  );
}
