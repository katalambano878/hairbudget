import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { outstandingBalance } from '@/lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Look up an order so a shopper can settle an outstanding balance.
 *
 * Order numbers embed a timestamp and are therefore guessable, so the email or
 * phone on the order is required as a second factor and the response carries
 * only what the balance page needs — never the delivery address.
 */
export async function POST(req: Request) {
  const clientId = getClientIdentifier(req);
  const rl = checkRateLimit(`order-balance:${clientId}`, { maxRequests: 12, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json(
      { success: false, message: 'Too many attempts. Please wait a moment and try again.' },
      { status: 429 },
    );
  }

  let body: { orderNumber?: unknown; contact?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid request' }, { status: 400 });
  }

  const orderNumber = typeof body.orderNumber === 'string' ? body.orderNumber.trim() : '';
  const contact = typeof body.contact === 'string' ? body.contact.trim() : '';

  if (!orderNumber || !contact) {
    return NextResponse.json(
      { success: false, message: 'Enter your order number and the email or phone used to order.' },
      { status: 400 },
    );
  }

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, email, phone, status, payment_status, payment_plan, payment_method, total, amount_paid, currency, created_at, metadata')
    .eq('order_number', orderNumber)
    .maybeSingle();

  // One message for "no such order" and "contact does not match" so this
  // endpoint cannot be used to probe which order numbers exist.
  const mismatch = NextResponse.json(
    { success: false, message: 'We could not find an order with those details. Please check and try again.' },
    { status: 404 },
  );

  if (error || !order) return mismatch;

  const needle = contact.toLowerCase();
  const digits = (value: string) => value.replace(/\D/g, '');
  const emailMatches = (order.email || '').toLowerCase() === needle;
  const phoneMatches =
    digits(contact).length >= 9 &&
    digits(order.phone || '').endsWith(digits(contact).slice(-9));

  if (!emailMatches && !phoneMatches) return mismatch;

  const { data: items } = await supabaseAdmin
    .from('order_items')
    .select('product_name, variant_name, quantity, unit_price, total_price, metadata')
    .eq('order_id', order.id);

  const balance = outstandingBalance(order);

  return NextResponse.json({
    success: true,
    order: {
      order_number: order.order_number,
      status: order.status,
      payment_status: order.payment_status,
      payment_plan: order.payment_plan,
      payment_method: order.payment_method,
      currency: order.currency || 'GHS',
      total: Number(order.total) || 0,
      amount_paid: Number(order.amount_paid) || 0,
      balance_due: balance,
      created_at: order.created_at,
      tracking_number: order.metadata?.tracking_number ?? null,
      first_name: order.metadata?.first_name ?? null,
    },
    items: (items || []).map((item) => ({
      product_name: item.product_name,
      variant_name: item.variant_name,
      quantity: item.quantity,
      unit_price: Number(item.unit_price) || 0,
      total_price: Number(item.total_price) || 0,
      image: item.metadata?.image ?? null,
      slug: item.metadata?.slug ?? null,
    })),
  });
}
