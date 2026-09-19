'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  computeCouponDiscount,
  isCouponLive,
  normalizeCouponCode,
  toAppliedCoupon,
  type AppliedCoupon,
  type CouponRow,
} from '@/lib/coupons';

interface AdvancedCouponSystemProps {
  subtotal: number;
  shipping?: number;
  onApply: (coupon: AppliedCoupon) => void;
  onRemove: () => void;
  appliedCoupon: AppliedCoupon | null;
}

export default function AdvancedCouponSystem({
  subtotal,
  shipping = 0,
  onApply,
  onRemove,
  appliedCoupon,
}: AdvancedCouponSystemProps) {
  const [couponCode, setCouponCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleApply = async () => {
    const code = normalizeCouponCode(couponCode);
    setError('');
    if (!code) {
      setError('Enter a coupon code');
      return;
    }
    setBusy(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('coupons')
        .select('*')
        .ilike('code', code)
        .maybeSingle();
      if (fetchError) throw fetchError;
      if (!data) {
        setError('Invalid coupon code');
        return;
      }
      const row = data as CouponRow;
      if (!isCouponLive(row)) {
        setError('This coupon is not available');
        return;
      }
      const computed = computeCouponDiscount(row, subtotal, shipping);
      if (!computed.ok) {
        setError(computed.error);
        return;
      }
      onApply(toAppliedCoupon(row));
      setCouponCode('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not apply coupon');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {appliedCoupon ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-forest/20 bg-brand-cream/40 px-4 py-3">
          <div>
            <p className="font-mono font-bold text-brand-forest">{appliedCoupon.code}</p>
            <p className="text-xs text-ui-500">{appliedCoupon.description || 'Discount applied'}</p>
          </div>
          <button type="button" onClick={onRemove} className="text-xs font-bold text-red-600">
            Remove
          </button>
        </div>
      ) : (
        <div>
          <div className="flex gap-2">
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Coupon code"
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono"
            />
            <button
              type="button"
              disabled={busy}
              onClick={handleApply}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50"
            >
              {busy ? '…' : 'Apply'}
            </button>
          </div>
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        </div>
      )}
    </div>
  );
}
