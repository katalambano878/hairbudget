import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendOrderConfirmation } from '@/lib/notifications';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * Client/admin verification when returning to order-success before the webhook
 * lands, or manual reconcile. Requires Paystack transaction reference (URL
 * trxref or stored metadata).
 */
export async function POST(req: Request) {
  try {
    const clientId = getClientIdentifier(req);
    const rl = checkRateLimit(`paystack-verify:${clientId}`, RATE_LIMITS.payment);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, message: 'Too many verification requests. Please wait.' },
        { status: 429 },
      );
    }

    const body = await req.json();
    const orderNumber = body.orderNumber;
    const reference =
      typeof body.reference === 'string' && body.reference.length > 3 ? body.reference : undefined;

    if (!orderNumber || typeof orderNumber !== 'string') {
      return NextResponse.json({ success: false, message: 'Missing or invalid orderNumber' }, { status: 400 });
    }

    if (!/^[A-Z0-9-]{8,96}$/.test(orderNumber)) {
      return NextResponse.json({ success: false, message: 'Invalid order number format' }, { status: 400 });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      console.error('[Paystack Verify] Missing PAYSTACK_SECRET_KEY');
      return NextResponse.json(
        { success: false, message: 'Payment verification unavailable' },
        { status: 503 },
      );
    }

    const { data: order, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, payment_status, status, total, email, metadata, payment_method')
      .eq('order_number', orderNumber)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    if (order.payment_status === 'paid') {
      return NextResponse.json({
        success: true,
        status: order.status,
        payment_status: order.payment_status,
        message: 'Order already paid',
      });
    }

    const initRef = order.metadata?.paystack_reference;
    const settledRef = order.metadata?.moolre_reference;
    const fromMeta =
      order.payment_method === 'paystack'
        ? typeof initRef === 'string' && initRef.length >= 8
          ? initRef
          : typeof settledRef === 'string' && settledRef.length >= 8
            ? settledRef
            : undefined
        : undefined;
    const paystackReference = reference || fromMeta;

    if (!paystackReference) {
      return NextResponse.json({
        success: false,
        status: order.status,
        payment_status: order.payment_status,
        message:
          'No Paystack transaction reference yet — open the payment link from your email or wait for confirmation.',
      });
    }

    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(paystackReference)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } },
    );
    const verifyJson = await verifyRes.json();

    if (!(verifyJson.status && verifyJson.data?.status === 'success')) {
      return NextResponse.json({
        success: false,
        status: order.status,
        payment_status: order.payment_status,
        message: 'Payment not yet confirmed by Paystack',
      });
    }

    const paystackAmount = Number(verifyJson.data.amount) / 100;
    const payableNow = Number(order.metadata?.payable_now);
    const expectedAmount =
      Number.isFinite(payableNow) && payableNow > 0 ? payableNow : Number(order.total);

    if (!Number.isFinite(paystackAmount) || Math.abs(paystackAmount - expectedAmount) > 0.01) {
      console.error('[Paystack Verify] Amount mismatch. Expected:', expectedAmount, '| got:', paystackAmount);
      return NextResponse.json({
        success: false,
        status: order.status,
        payment_status: order.payment_status,
        message: 'Verified amount does not match order total',
      });
    }

    const { data: orderJson, error: updateError } = await supabaseAdmin.rpc('mark_order_paid', {
      order_ref: orderNumber,
      moolre_ref: String(verifyJson.data.reference || paystackReference),
    });

    if (updateError) {
      console.error('[Paystack Verify] RPC error:', updateError.message);
      return NextResponse.json({ success: false, message: 'Failed to update order' }, { status: 500 });
    }

    if (orderJson) {
      try {
        await sendOrderConfirmation(orderJson);
      } catch (notifyError: unknown) {
        console.error('[Paystack Verify] Notification failed: ', notifyError);
      }
    }

    return NextResponse.json({
      success: true,
      status: 'processing',
      payment_status: 'paid',
      message: 'Payment verified and order updated',
    });
  } catch (error: unknown) {
    console.error('[Paystack Verify] Error:', error);
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 });
  }
}
