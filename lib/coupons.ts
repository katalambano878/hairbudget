export type CouponType = 'percentage' | 'fixed_amount' | 'free_shipping';

export type CouponRow = {
  id?: string;
  code: string;
  description?: string | null;
  type: CouponType;
  value: number;
  minimum_purchase?: number | null;
  maximum_discount?: number | null;
  usage_limit?: number | null;
  usage_count?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean | null;
};

export type AppliedCoupon = {
  id?: string;
  code: string;
  type: CouponType;
  value: number;
  minimum_purchase?: number;
  maximum_discount?: number | null;
  description?: string;
};

export const COUPON_STORAGE_KEY = 'hairbudget.coupon';

export function normalizeCouponCode(code: string): string {
  return String(code || '').trim().toUpperCase();
}

export function couponStatus(c: CouponRow): 'active' | 'scheduled' | 'expired' | 'disabled' | 'exhausted' {
  if (!c.is_active) return 'disabled';
  const now = Date.now();
  if (c.start_date && new Date(c.start_date).getTime() > now) return 'scheduled';
  if (c.end_date && new Date(c.end_date).getTime() < now) return 'expired';
  if (c.usage_limit != null && Number(c.usage_count || 0) >= Number(c.usage_limit)) return 'exhausted';
  return 'active';
}

export function isCouponLive(c: CouponRow): boolean {
  return couponStatus(c) === 'active';
}

export function computeCouponDiscount(
  coupon: Pick<CouponRow, 'type' | 'value' | 'minimum_purchase' | 'maximum_discount'>,
  subtotal: number,
  shipping = 0
): { ok: true; discount: number } | { ok: false; error: string } {
  const min = Number(coupon.minimum_purchase || 0);
  if (min > 0 && subtotal < min) {
    return { ok: false, error: `Minimum purchase of GH₵${min.toFixed(2)} required` };
  }

  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = subtotal * (Number(coupon.value) || 0) / 100;
    const cap = coupon.maximum_discount != null ? Number(coupon.maximum_discount) : null;
    if (cap != null && cap > 0) discount = Math.min(discount, cap);
  } else if (coupon.type === 'fixed_amount') {
    discount = Number(coupon.value) || 0;
  } else if (coupon.type === 'free_shipping') {
    discount = shipping;
  }

  discount = Math.max(0, Math.min(discount, subtotal + shipping));
  return { ok: true, discount: Math.round(discount * 100) / 100 };
}

export function toAppliedCoupon(c: CouponRow): AppliedCoupon {
  return {
    id: c.id,
    code: normalizeCouponCode(c.code),
    type: c.type,
    value: Number(c.value) || 0,
    minimum_purchase: Number(c.minimum_purchase || 0),
    maximum_discount: c.maximum_discount != null ? Number(c.maximum_discount) : null,
    description: c.description || undefined,
  };
}

export function readStoredCoupon(): AppliedCoupon | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(COUPON_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.code) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function storeCoupon(coupon: AppliedCoupon | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!coupon) sessionStorage.removeItem(COUPON_STORAGE_KEY);
    else sessionStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(coupon));
  } catch {
    /* private mode */
  }
}
