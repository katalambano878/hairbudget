export type PaymentBucket = 'cash' | 'card' | 'momo' | 'paystack' | 'other';

export type DayOrder = {
  id: string;
  order_number?: string;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  payment_status?: string | null;
  payment_method?: string | null;
  total?: number | null;
  subtotal?: number | null;
  discount_total?: number | null;
  amount_paid?: number | null;
  balance_due?: number | null;
  created_at?: string;
  coupon_code?: string | null;
  metadata?: any;
  shipping_address?: any;
  billing_address?: any;
  order_items?: Array<{
    product_id?: string | null;
    product_name?: string | null;
    quantity?: number | null;
    unit_price?: number | null;
    total_price?: number | null;
  }>;
};

const VOID_STATUSES = new Set(['cancelled', 'canceled', 'refunded']);

export function accraDayBounds(dateStr: string): { start: string; end: string; label: string } {
  // Africa/Accra is UTC+0 with no DST, so the calendar day is the UTC day.
  const start = `${dateStr}T00:00:00.000Z`;
  const [y, m, d] = dateStr.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const end = next.toISOString();
  return { start, end, label: dateStr };
}

export function todayAccra(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isPosOrder(order: DayOrder): boolean {
  return Boolean(
    order?.metadata?.pos_sale ||
      order?.shipping_address?.pos_sale ||
      order?.billing_address?.pos_sale
  );
}

export function isVoidOrder(order: DayOrder): boolean {
  return VOID_STATUSES.has(String(order.status || '').toLowerCase());
}

export function moneyCollected(order: DayOrder): number {
  if (isVoidOrder(order)) return 0;
  const paid = Number(order.amount_paid || 0);
  if (paid > 0) return paid;
  if (order.payment_status === 'paid') return Number(order.total || 0);
  return 0;
}

export function paymentBucket(method: string | null | undefined): PaymentBucket {
  const m = String(method || '').toLowerCase();
  if (m === 'cash') return 'cash';
  if (m === 'card') return 'card';
  if (m === 'moolre' || m === 'momo' || m === 'mtn') return 'momo';
  if (m === 'paystack') return 'paystack';
  return 'other';
}

export function methodLabel(bucket: PaymentBucket): string {
  switch (bucket) {
    case 'cash': return 'Cash (POS)';
    case 'card': return 'Card (POS)';
    case 'momo': return 'Mobile Money';
    case 'paystack': return 'Paystack';
    default: return 'Other';
  }
}

export type DaySummary = {
  ordersCount: number;
  voidedCount: number;
  itemsSold: number;
  orderTotal: number;
  collected: number;
  outstanding: number;
  discounts: number;
  website: { orders: number; collected: number; outstanding: number };
  pos: { orders: number; collected: number; outstanding: number };
  byMethod: Record<PaymentBucket, number>;
  cashExpectedFromTill: number;
  topProducts: Array<{ name: string; qty: number; revenue: number }>;
  coupons: Array<{ code: string; uses: number; discount: number }>;
};

export function summarizeDay(orders: DayOrder[]): DaySummary {
  const byMethod: Record<PaymentBucket, number> = {
    cash: 0, card: 0, momo: 0, paystack: 0, other: 0,
  };
  const productMap = new Map<string, { name: string; qty: number; revenue: number }>();
  const couponMap = new Map<string, { code: string; uses: number; discount: number }>();

  const summary: DaySummary = {
    ordersCount: 0,
    voidedCount: 0,
    itemsSold: 0,
    orderTotal: 0,
    collected: 0,
    outstanding: 0,
    discounts: 0,
    website: { orders: 0, collected: 0, outstanding: 0 },
    pos: { orders: 0, collected: 0, outstanding: 0 },
    byMethod,
    cashExpectedFromTill: 0,
    topProducts: [],
    coupons: [],
  };

  for (const order of orders) {
    if (isVoidOrder(order)) {
      summary.voidedCount += 1;
      continue;
    }

    const collected = moneyCollected(order);
    const total = Number(order.total || 0);
    const outstanding = Math.max(total - collected, 0);
    const pos = isPosOrder(order);
    const bucket = paymentBucket(order.payment_method);

    summary.ordersCount += 1;
    summary.orderTotal += total;
    summary.collected += collected;
    summary.outstanding += outstanding;
    summary.discounts += Number(order.discount_total || 0);
    summary.byMethod[bucket] += collected;

    const channel = pos ? summary.pos : summary.website;
    channel.orders += 1;
    channel.collected += collected;
    channel.outstanding += outstanding;

    if (pos && bucket === 'cash') summary.cashExpectedFromTill += collected;

    if (order.coupon_code) {
      const code = String(order.coupon_code).toUpperCase();
      const cur = couponMap.get(code) || { code, uses: 0, discount: 0 };
      cur.uses += 1;
      cur.discount += Number(order.discount_total || 0);
      couponMap.set(code, cur);
    }

    for (const item of order.order_items || []) {
      const qty = Number(item.quantity || 0);
      const rev = Number(item.total_price || 0);
      summary.itemsSold += qty;
      const key = item.product_id || item.product_name || 'unknown';
      const cur = productMap.get(key) || {
        name: item.product_name || 'Product',
        qty: 0,
        revenue: 0,
      };
      cur.qty += qty;
      cur.revenue += rev;
      productMap.set(key, cur);
    }
  }

  summary.topProducts = [...productMap.values()]
    .sort((a, b) => b.revenue - a.revenue || b.qty - a.qty)
    .slice(0, 8);
  summary.coupons = [...couponMap.values()].sort((a, b) => b.discount - a.discount);

  return summary;
}

export function formatGhs(n: number): string {
  return `GH₵${(Number(n) || 0).toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
