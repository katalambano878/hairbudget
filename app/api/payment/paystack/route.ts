import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * Initialize Paystack checkout. Amount and reference are derived server-side
 * from the order row — never trust client-supplied totals.
 */
export async function POST(req: Request) {
  try {
    const clientId = getClientIdentifier(req);
    const rl = checkRateLimit(`paystack-init:${clientId}`, RATE_LIMITS.payment);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, message: 'Too many payment attempts. Please wait a moment.' },
        { status: 429 },
      );
    }

    const body = await req.json();
    const { orderId, customerEmail } = body;

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ success: false, message: 'Missing or invalid orderId' }, { status: 400 });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      console.error('[Paystack] Missing PAYSTACK_SECRET_KEY');
      return NextResponse.json({ success: false, message: 'Payment gateway configuration error' }, { status: 500 });
    }

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
    const query = supabaseAdmin
      .from('orders')
      .select('id, order_number, total, email, phone, payment_status, metadata, payment_method');

    const { data: order, error: orderError } = isUUID
      ? await query.eq('id', orderId).single()
      : await query.eq('order_number', orderId).single();

    if (orderError || !order) {
      console.error('[Paystack] Order not found:', orderId);
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    if (order.payment_status === 'paid') {
      return NextResponse.json({ success: false, message: 'Order is already paid' }, { status: 400 });
    }

    if (order.payment_method !== 'paystack') {
      return NextResponse.json(
        { success: false, message: 'Order payment method does not match card checkout' },
        { status: 400 },
      );
    }

    const payableNow = Number(order.metadata?.payable_now);
    const amountGhs =
      Number.isFinite(payableNow) && payableNow > 0 ? payableNow : Number(order.total);
    if (!amountGhs || amountGhs <= 0) {
      return NextResponse.json({ success: false, message: 'Invalid order amount' }, { status: 400 });
    }

    const orderRef = order.order_number || orderId;
    const requestUrl = new URL(req.url);
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin).replace(/\/+$/, '');

    const emailRaw = (
      typeof customerEmail === 'string' && customerEmail.includes('@') ? customerEmail : order.email || ''
    ).trim();
    if (!emailRaw.includes('@')) {
      return NextResponse.json(
        { success: false, message: 'A valid customer email is required for card payments' },
        { status: 400 },
      );
    }

    const reference = `PAY-${orderRef}-${Date.now()}`;

    const payload = {
      email: emailRaw,
      amount: Math.round(amountGhs * 100),
      currency: 'GHS',
      reference,
      callback_url: `${baseUrl}/api/payment/paystack/callback?order=${encodeURIComponent(orderRef)}`,
      metadata: {
        order_id: orderRef,
        customer_phone: order.phone,
      },
    };

    console.log('[Paystack] Initialize for order:', orderRef, '| amount (GHS):', amountGhs);

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (result.status && result.data?.authorization_url) {
      const finalReference = result.data.reference || reference;
      try {
        await supabaseAdmin
          .from('orders')
          .update({
            metadata: {
              ...(order.metadata || {}),
              paystack_reference: finalReference,
              paystack_initialized_at: new Date().toISOString(),
            },
          })
          .eq('id', order.id);
      } catch (persistErr: unknown) {
        console.warn(
          '[Paystack] Failed to persist reference (non-blocking):',
          persistErr instanceof Error ? persistErr.message : persistErr,
        );
      }

      return NextResponse.json({
        success: true,
        url: result.data.authorization_url,
        reference: finalReference,
        access_code: result.data.access_code,
      });
    }

    console.error('[Paystack] Initialize rejected:', result);
    return NextResponse.json(
      { success: false, message: result.message || 'Failed to initialize payment' },
      { status: 400 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[Paystack] API error:', error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
