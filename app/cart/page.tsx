'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import CartCountdown from '@/components/CartCountdown';
import AdvancedCouponSystem from '@/components/AdvancedCouponSystem';
import { useCart } from '@/context/CartContext';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function CartPage() {
  usePageTitle('Shopping Cart');
  const { cart: cartItems, removeFromCart, updateQuantity, subtotal, addToCart } = useCart();
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [savedItems, setSavedItems] = useState<any[]>([]);

  const saveForLater = (id: string) => {
    const item = cartItems.find(item => item.id === id);
    if (item) {
      setSavedItems([...savedItems, item]);
      removeFromCart(item.id, item.variant);
    }
  };

  const moveToCart = (id: string) => {
    const item = savedItems.find(item => item.id === id);
    if (item) {
      addToCart(item);
      setSavedItems(savedItems.filter(item => item.id !== id));
    }
  };

  const applyCoupon = (coupon: any) => setAppliedCoupon(coupon);
  const removeCoupon = () => setAppliedCoupon(null);

  const savings = 0;

  let couponDiscount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percentage') {
      couponDiscount = subtotal * (appliedCoupon.discount / 100);
    } else {
      couponDiscount = appliedCoupon.discount;
    }
  }

  const shipping = subtotal >= 200 ? 0 : 15;
  const total = subtotal - couponDiscount + shipping;

  return (
    <div className="min-h-screen bg-white">

      {/* ── HERO BANNER ──────────────────────────────────── */}
      <section className="relative bg-slate-950 overflow-hidden" style={{ minHeight: '38vh' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />

        {/* Ghost letter */}
        <div
          aria-hidden="true"
          className="absolute -right-4 bottom-0 font-serif italic text-white/[0.04] leading-none pointer-events-none select-none"
          style={{ fontSize: 'clamp(8rem, 22vw, 20rem)' }}
        >C</div>

        <div
          className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 flex flex-col justify-center"
          style={{ minHeight: '38vh' }}
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-8 h-px bg-blue-400" />
            <span className="text-blue-400 text-[9px] font-black tracking-[0.55em] uppercase">Your Bag</span>
          </div>
          <h1 className="font-serif italic text-white leading-[0.9]" style={{ fontSize: 'clamp(2.5rem, 7vw, 6rem)' }}>
            Shopping<br />
            <span className="text-blue-400">Cart</span>
          </h1>
        </div>
      </section>

      {/* ── MAIN CONTENT ─────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        <CartCountdown />

        {cartItems.length === 0 && savedItems.length === 0 ? (

          /* ── EMPTY STATE ── */
          <div className="min-h-[50vh] flex flex-col items-center justify-center text-center py-24">
            <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-6">
              <i className="ri-shopping-cart-line text-3xl text-slate-300" />
            </div>
            <h2 className="font-serif text-3xl italic text-slate-900 mb-3">Your cart is empty</h2>
            <p className="text-slate-400 text-sm max-w-xs mb-8 leading-relaxed">
              Looks like you haven&apos;t added anything yet. Discover something you&apos;ll love.
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-3 bg-slate-900 hover:bg-slate-700 text-white px-8 py-4 rounded-xl font-bold text-xs tracking-[0.25em] uppercase transition-colors"
            >
              Continue Shopping <i className="ri-arrow-right-line" />
            </Link>
          </div>

        ) : (

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">

            {/* ── CART ITEMS ─────────────────────────────── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Header row */}
              <div className="flex items-center justify-between pb-5 border-b border-slate-100">
                <div>
                  <p className="text-[9px] font-black tracking-[0.5em] uppercase text-slate-300 mb-1">Review</p>
                  <h2 className="font-serif text-2xl italic text-slate-900">
                    Cart Items <span className="text-slate-300 font-light">({cartItems.length})</span>
                  </h2>
                </div>
                {savings > 0 && (
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
                    You save GH₵{savings.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Items list */}
              <div className="divide-y divide-slate-100">
                {cartItems.map((item) => (
                  <div key={`${item.id}-${item.variant || ''}`} className="flex flex-col sm:flex-row gap-5 py-7 group">

                    {/* Image */}
                    <Link
                      href={`/product/${item.slug || item.id}`}
                      className="relative w-full sm:w-28 h-40 sm:h-28 flex-shrink-0 bg-slate-50 overflow-hidden rounded-xl"
                    >
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 100vw, 112px"
                        quality={70}
                      />
                    </Link>

                    {/* Details */}
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/product/${item.slug || item.id}`}
                            className="font-semibold text-slate-900 hover:text-slate-600 transition-colors line-clamp-2 text-base leading-snug"
                          >
                            {item.name}
                          </Link>
                          <div className="flex items-center gap-3 mt-1.5">
                            {item.variant && (
                              <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                                {item.variant}
                              </span>
                            )}
                            <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-600">In Stock</span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id, item.variant)}
                          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                        >
                          <i className="ri-close-line text-base" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between flex-wrap gap-4 mt-4">
                        <span className="text-xl font-black text-slate-900">GH₵{item.price.toFixed(2)}</span>

                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1, item.variant)}
                              className="w-9 h-9 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                              title={item.quantity <= (item.moq || 1) ? 'Remove item' : 'Decrease quantity'}
                            >
                              {item.quantity <= (item.moq || 1) ? (
                                <i className="ri-delete-bin-line text-red-400 text-sm" />
                              ) : (
                                <i className="ri-subtract-line text-sm" />
                              )}
                            </button>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || (item.moq || 1), item.variant)}
                              className="w-10 h-9 text-center text-sm font-bold text-slate-900 border-x border-slate-200 focus:outline-none bg-white"
                              min={item.moq || 1}
                              max={item.maxStock}
                            />
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1, item.variant)}
                              className="w-9 h-9 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                              <i className="ri-add-line text-sm" />
                            </button>
                          </div>
                          {(item.moq || 1) > 1 && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-blue-600">
                              Min. {item.moq} units
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Saved for later */}
              {savedItems.length > 0 && (
                <div className="pt-6 border-t border-slate-100">
                  <p className="text-[9px] font-black tracking-[0.5em] uppercase text-slate-300 mb-5">Saved for Later</p>
                  <div className="divide-y divide-slate-100">
                    {savedItems.map((item) => (
                      <div key={item.id} className="flex gap-4 py-5">
                        <div className="relative w-16 h-16 flex-shrink-0 bg-slate-50 rounded-xl overflow-hidden">
                          <Image src={item.image} alt={item.name} fill className="object-cover object-top" sizes="64px" quality={60} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 text-sm line-clamp-1">{item.name}</p>
                          <p className="text-base font-black text-slate-900 mt-0.5">GH₵{item.price.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── ORDER SUMMARY ──────────────────────────── */}
            <div>
              <div className="bg-slate-950 rounded-2xl p-7 sticky top-24 relative overflow-hidden">

                {/* Ghost text */}
                <div
                  aria-hidden="true"
                  className="absolute -right-3 -bottom-6 font-serif italic text-white/[0.04] leading-none pointer-events-none select-none"
                  style={{ fontSize: '7rem' }}
                >₵</div>

                <p className="text-[9px] font-black tracking-[0.5em] uppercase text-slate-500 mb-2">Breakdown</p>
                <h3 className="font-serif text-2xl italic text-white mb-7">Order Summary</h3>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Subtotal</span>
                    <span className="text-sm font-semibold text-white">GH₵{subtotal.toFixed(2)}</span>
                  </div>

                  {appliedCoupon && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-400">Coupon ({appliedCoupon.code})</span>
                      <span className="text-sm font-semibold text-blue-400">−GH₵{couponDiscount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Shipping</span>
                    <span className={`text-sm font-semibold ${shipping === 0 ? 'text-emerald-400' : 'text-white'}`}>
                      {shipping === 0 ? 'FREE' : `GH₵${shipping.toFixed(2)}`}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-5 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-white">Total</span>
                    <span className="text-2xl font-black text-white">GH₵{total.toFixed(2)}</span>
                  </div>
                </div>

                <AdvancedCouponSystem
                  subtotal={subtotal}
                  onApply={applyCoupon}
                  onRemove={removeCoupon}
                  appliedCoupon={appliedCoupon}
                />

                <Link
                  href="/checkout"
                  className="flex items-center justify-center gap-3 w-full bg-white hover:bg-blue-400 text-slate-900 py-4 rounded-xl font-bold text-xs tracking-[0.25em] uppercase transition-colors mt-6 mb-3"
                >
                  Proceed to Checkout <i className="ri-arrow-right-line" />
                </Link>

                <Link
                  href="/shop"
                  className="flex items-center justify-center gap-2 w-full text-center text-slate-500 hover:text-white text-xs font-bold tracking-[0.2em] uppercase py-2 transition-colors"
                >
                  <i className="ri-arrow-left-line" /> Continue Shopping
                </Link>

                {/* Trust signals */}
                <div className="mt-7 pt-6 border-t border-slate-800 grid grid-cols-3 gap-3">
                  {[
                    { icon: 'ri-shield-check-line', label: 'Secure' },
                    { icon: 'ri-arrow-left-right-line', label: '30-day returns' },
                    { icon: 'ri-customer-service-line', label: '24/7 support' },
                  ].map(t => (
                    <div key={t.label} className="flex flex-col items-center gap-1.5 text-center">
                      <i className={`${t.icon} text-blue-400 text-lg`} />
                      <span className="text-[8px] font-bold tracking-wider uppercase text-slate-600 leading-tight">{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
