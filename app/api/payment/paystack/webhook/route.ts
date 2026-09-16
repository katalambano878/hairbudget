import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendOrderConfirmation } from '@/lib/notifications';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit';
import { orderNumberFromPaystackReference } from '@/lib/paystack-utils';

/**
 * Paystack server-to-server webhook. Authoritative when the customer closes
 * the tab before the browser callback. Signature: HMAC-SHA512(raw body).
 */
export async function POST(req: Request) {
  console.log('[Paystack Webhook] Received at', new Date().toISOString());

  try {
    const clientId = getClientIdentifier(req);
    const rl = checkRateLimit(`paystack-webhook:${clientId}`, RATE_LIMITS.callback);
    if (!rl.success) {
      console.warn('[Paystack Webhook] Rate limited:', clientId);
      return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      console.error('[Paystack Webhook] PAYSTACK_SECRET_KEY not configured');
      return NextResponse.json({ success: false, message: 'Server misconfigured' }, { status: 500 });
    }

    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature') || '';

    const computed = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');

    const sigMatches =
      signature.length === computed.length &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computed));

    if (!sigMatches) {
      console.error('[Paystack Webhook] Signature mismatch. Rejecting.');
      return NextResponse.json({ success: false, message: 'Invalid signature' }, { status: 403 });
    }

    let event: { event?: string; data?: Record<string, unknown> };
    try {
      event = JSON.parse(rawBody) as { event?: string; data?: Record<string, unknown> };
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });
    }

    const data = event.data || {};
    const refStr = typeof data.reference === 'string' ? data.reference : undefined;
    const meta = data.metadata as Record<string, unknown> | undefined;
    const metaOrder =
      meta && typeof meta.order_id === 'string' ? meta.order_id : undefined;

    console.log('[Paystack Webhook] Event:', event.event, '| reference:', refStr);

    if (event.event !== 'charge.success') {
      return NextResponse.json({ success: true, message: 'Event ignored' });
    }

    if (data.status !== 'success') {
      return NextResponse.json({
        success: true,
        message: 'Charge status not successful, ignoring',
      });
    }

    const orderRef = orderNumberFromPaystackReference(refStr, metaOrder);

    if (!orderRef) {
      console.error('[Paystack Webhook] Could not determine order reference');
      return NextResponse.json({ success: false, message: 'Missing order reference' }, { status: 400 });
    }

    const { data: existingOrder, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, payment_status, total, metadata')
      .eq('order_number', orderRef)
      .single();

    if (fetchError || !existingOrder) {
      console.error('[Paystack Webhook] Order not found:', orderRef);
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    if (existingOrder.payment_status === 'paid') {
      console.log('[Paystack Webhook] Already paid, idempotent skip:', orderRef);
      return NextResponse.json({ success: true, message: 'Order already processed' });
    }

    const paystackAmount = Number(data.amount) / 100;
    const payableNow = Number(existingOrder.metadata?.payable_now);
    const expectedAmount =
      Number.isFinite(payableNow) && payableNow > 0 ? payableNow : Number(existingOrder.total);

    if (!Number.isFinite(paystackAmount) || paystackAmount <= 0) {
      console.error('[Paystack Webhook] Invalid amount on event:', data.amount);
      return NextResponse.json({ success: false, message: 'Invalid amount' }, { status: 400 });
    }

    if (Math.abs(paystackAmount - expectedAmount) > 0.01) {
      console.error(
        '[Paystack Webhook] AMOUNT MISMATCH. Expected:',
        expectedAmount,
        '| Got:',
        paystackAmount,
      );
      return NextResponse.json(
        { success: false, message: 'Payment amount does not match order' },
        { status: 400 },
      );
    }

    const { data: updatedOrder, error: rpcError } = await supabaseAdmin.rpc('mark_order_paid', {
      order_ref: orderRef,
      moolre_ref: String(refStr || 'paystack'),
    });

    if (rpcError) {
      console.error('[Paystack Webhook] RPC error:', rpcError);
      return NextResponse.json({ success: false, message: 'Database update failed' }, { status: 500 });
    }

    console.log('[Paystack Webhook] Order marked paid:', orderRef, '| ref:', refStr);

    if (updatedOrder) {
      try {
        await sendOrderConfirmation(updatedOrder);
      } catch (notifyErr: unknown) {
        console.error(
          '[Paystack Webhook] Notification failed (non-blocking):',
          notifyErr instanceof Error ? notifyErr.message : notifyErr,
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified and order updated',
    });
  } catch (err: unknown) {
    console.error('[Paystack Webhook] Critical error:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Paystack webhook endpoint ready',
    timestamp: new Date().toISOString(),
  });
}
