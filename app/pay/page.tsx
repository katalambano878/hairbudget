'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePageTitle } from '@/hooks/usePageTitle';
import { formatGhs } from '@/lib/payments';

interface BalanceItem {
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  image: string | null;
  slug: string | null;
}

interface BalanceOrder {
  order_number: string;
  status: string;
  payment_status: string;
  payment_plan: string;
  payment_method: string | null;
  total: number;
  amount_paid: number;
  balance_due: number;
  created_at: string;
  tracking_number: string | null;
  first_name: string | null;
}

export default function PayBalancePage() {
  usePageTitle('Pay Balance');

  const [orderNumber, setOrderNumber] = useState('');
  const [contact, setContact] = useState('');
  const [order, setOrder] = useState<BalanceOrder | null>(null);
  const [items, setItems] = useState<BalanceItem[]>([]);
  const [looking, setLooking] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOrder(null);
    setItems([]);
    setLooking(true);

    try {
      const res = await fetch('/api/storefront/order-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: orderNumber.trim(), contact: contact.trim() }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.message || 'We could not find that order.');
        return;
      }

      setOrder(data.order);
      setItems(data.items || []);
    } catch {
      setError('Something went wrong looking up your order. Please try again.');
    } finally {
      setLooking(false);
    }
  };

  const handlePayBalance = async () => {
    if (!order) return;
    setPaying(true);
    setError(null);

    const endpoint = order.payment_method === 'paystack' ? '/api/payment/paystack' : '/api/payment/moolre';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.order_number }),
      });
      const data = await res.json();

      if (!data.success || !data.url) {
        throw new Error(data.message || 'Could not start the payment.');
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the payment.');
      setPaying(false);
    }
  };

  const settled = order && order.balance_due <= 0.005;

  return (
    <main className="min-h-screen bg-brand-cream/30 py-14 px-4">
      <div className="max-w-2xl mx-auto">

        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-2 text-brand-mid text-xs tracking-[0.35em] uppercase font-semibold mb-3">
            <span className="w-5 h-[1px] bg-brand-gold" />
            Outstanding balance
            <span className="w-5 h-[1px] bg-brand-gold" />
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-brand-ink">Pay your balance</h1>
          <p className="text-brand-mid mt-3 text-sm sm:text-base">
            Paid half at checkout? Enter your order number to see what&apos;s left and settle it.
          </p>
        </div>

        <form onSubmit={handleLookup} className="bg-white rounded-2xl shadow-sm p-6 sm:p-7 mb-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="orderNumber" className="block text-sm font-semibold text-brand-ink mb-1.5">
                Order number
              </label>
              <input
                id="orderNumber"
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="ORD-1234567890-123"
                required
                className="w-full px-4 py-3 rounded-xl border border-brand-forest/20 focus:border-brand-forest focus:ring-1 focus:ring-brand-forest outline-none text-brand-ink"
              />
              <p className="text-xs text-brand-mid mt-1.5">
                It&apos;s on your order confirmation email and receipt.
              </p>
            </div>

            <div>
              <label htmlFor="contact" className="block text-sm font-semibold text-brand-ink mb-1.5">
                Email or phone used to order
              </label>
              <input
                id="contact"
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="you@email.com or 024xxxxxxx"
                required
                className="w-full px-4 py-3 rounded-xl border border-brand-forest/20 focus:border-brand-forest focus:ring-1 focus:ring-brand-forest outline-none text-brand-ink"
              />
              <p className="text-xs text-brand-mid mt-1.5">
                We ask for this so only you can see your order.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={looking}
            className="mt-6 w-full bg-brand-forest hover:bg-brand-deep text-brand-ivory py-3.5 rounded-xl font-bold text-sm tracking-[0.15em] uppercase transition-colors disabled:opacity-60 cursor-pointer"
          >
            {looking ? 'Finding your order…' : 'Find my order'}
          </button>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <i className="ri-error-warning-line text-red-600 text-lg mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {order && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-brand-cream flex items-center justify-between gap-4">
              <div>
                <p className="text-[9px] font-black tracking-[0.4em] uppercase text-brand-mid mb-1">Order</p>
                <p className="font-bold text-brand-ink">{order.order_number}</p>
              </div>
              <span
                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  settled
                    ? 'bg-brand-forest/10 text-brand-forest'
                    : 'bg-brand-gold/25 text-brand-ink'
                }`}
              >
                {settled ? 'Fully paid' : 'Balance due'}
              </span>
            </div>

            <div className="px-6 py-5 space-y-4 border-b border-brand-cream">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-brand-cream/60 flex-shrink-0">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="flex items-center justify-center w-full h-full text-brand-mid text-xs">
                        <i className="ri-image-line" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-brand-ink text-sm truncate">{item.product_name}</p>
                    <p className="text-xs text-brand-mid mt-0.5">
                      {item.variant_name ? `${item.variant_name} · ` : ''}Qty {item.quantity}
                    </p>
                  </div>
                  <p className="font-bold text-brand-ink text-sm whitespace-nowrap">{formatGhs(item.total_price)}</p>
                </div>
              ))}
            </div>

            <div className="px-6 py-5 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-brand-mid">Order total</span>
                <span className="font-semibold text-brand-ink">{formatGhs(order.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-brand-mid">Already paid</span>
                <span className="font-semibold text-brand-forest">{formatGhs(order.amount_paid)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-brand-cream">
                <span className="font-bold text-brand-ink">Balance due</span>
                <span className="text-2xl font-bold text-brand-ink">{formatGhs(order.balance_due)}</span>
              </div>
            </div>

            <div className="px-6 pb-6">
              {settled ? (
                <div className="rounded-xl bg-brand-forest/8 border border-brand-forest/20 p-4 flex items-start gap-3">
                  <i className="ri-checkbox-circle-line text-brand-forest text-lg mt-0.5" />
                  <p className="text-sm text-brand-ink/80">
                    This order is fully paid — nothing more to do. We&apos;ll be in touch about delivery.
                  </p>
                </div>
              ) : (
                <>
                  <button
                    onClick={handlePayBalance}
                    disabled={paying}
                    className="w-full bg-brand-gold hover:bg-brand-champagne text-brand-deep py-4 rounded-xl font-black text-sm tracking-[0.15em] uppercase transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {paying ? 'Starting payment…' : `Pay ${formatGhs(order.balance_due)} now`}
                  </button>
                  <p className="text-xs text-brand-mid text-center mt-3">
                    Or pay this balance in cash when your order is delivered.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        <p className="text-center text-sm text-brand-mid mt-8">
          Need help? <Link href="/contact" className="text-brand-forest font-semibold hover:underline">Contact us</Link>
          {' · '}
          <Link href="/order-tracking" className="text-brand-forest font-semibold hover:underline">Track an order</Link>
        </p>
      </div>
    </main>
  );
}
