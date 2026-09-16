import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendOrderConfirmation } from '@/lib/notifications';

function appBaseUrl(req: Request): string {
  const requestUrl = new URL(req.url);
  return (process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin).replace(/\/+$/, '');
}

/**
 * Browser redirect after Paystack checkout. Verifies via Paystack API then
 * redirects to order success (or failure). Webhook remains authoritative for
 * closing the loop if this redirect is skipped.
 */
export async function GET(req: Request) {
  const baseUrl = appBaseUrl(req);
  const url = new URL(req.url);

  try {
    const reference = url.searchParams.get('reference') || url.searchParams.get('trxref');
    const orderId = url.searchParams.get('order');

    if (!reference) {
      return NextResponse.redirect(new URL('/order-failed?reason=missing_reference', baseUrl));
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      console.error('[Paystack Callback] Missing PAYSTACK_SECRET_KEY');
      return NextResponse.redirect(new URL('/order-failed?reason=config_error', baseUrl));
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const result = await response.json();
    console.log('[Paystack Callback] Verification:', {
      status: result.status,
      txStatus: result.data?.status,
      amount: result.data?.amount,
      reference,
    });

    if (!(result.status && result.data?.status === 'success')) {
      console.warn('[Paystack Callback] Payment not successful:', result.data?.status, result.message);
      return NextResponse.redirect(
        new URL(
          `/order-failed?order=${encodeURIComponent(orderId || '')}&reason=payment_failed`,
          baseUrl,
        ),
      );
    }

    const orderRef: string | undefined =
      orderId || (typeof result.data.metadata?.order_id === 'string' ? result.data.metadata.order_id : undefined);

    if (!orderRef) {
      console.error('[Paystack Callback] No order reference on verified transaction');
      return NextResponse.redirect(new URL('/order-failed?reason=missing_order', baseUrl));
    }

    const { data: existingOrder, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, payment_status, total, metadata')
      .eq('order_number', orderRef)
      .single();

    if (fetchError || !existingOrder) {
      console.error('[Paystack Callback] Order not found:', orderRef);
      return NextResponse.redirect(new URL('/order-failed?reason=order_not_found', baseUrl));
    }

    if (existingOrder.payment_status === 'paid') {
      console.log('[Paystack Callback] Already marked paid (likely by webhook):', orderRef);
      return NextResponse.redirect(
        new URL(
          `/order-success?order=${encodeURIComponent(orderRef)}&payment_success=true&trxref=${encodeURIComponent(reference)}`,
          baseUrl,
        ),
      );
    }

    const paystackAmount = Number(result.data.amount) / 100;
    const payableNow = Number(existingOrder.metadata?.payable_now);
    const expectedAmount =
      Number.isFinite(payableNow) && payableNow > 0 ? payableNow : Number(existingOrder.total);

    if (Math.abs(paystackAmount - expectedAmount) > 0.01) {
      console.error(
        '[Paystack Callback] AMOUNT MISMATCH. Expected:',
        expectedAmount,
        '| Got:',
        paystackAmount,
      );
      return NextResponse.redirect(
        new URL(`/order-failed?order=${encodeURIComponent(orderRef)}&reason=amount_mismatch`, baseUrl),
      );
    }

    const { data: updatedOrder, error: rpcError } = await supabaseAdmin.rpc('mark_order_paid', {
      order_ref: orderRef,
      moolre_ref: String(reference),
    });

    if (rpcError) {
      console.error('[Paystack Callback] RPC error:', rpcError);
      return NextResponse.redirect(
        new URL(`/order-failed?order=${encodeURIComponent(orderRef)}&reason=update_failed`, baseUrl),
      );
    }

    if (updatedOrder) {
      try {
        await sendOrderConfirmation(updatedOrder);
      } catch (notifyErr: unknown) {
        console.error(
          '[Paystack Callback] Notification failed (non-blocking):',
          notifyErr instanceof Error ? notifyErr.message : notifyErr,
        );
      }
    }

    return NextResponse.redirect(
      new URL(
        `/order-success?order=${encodeURIComponent(orderRef)}&payment_success=true&trxref=${encodeURIComponent(reference)}`,
        baseUrl,
      ),
    );
  } catch (error: unknown) {
    console.error('[Paystack Callback] Error:', error);
    return NextResponse.redirect(new URL('/order-failed?reason=verification_error', baseUrl));
  }
}
