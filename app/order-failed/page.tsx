'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const REASON_COPY: Record<string, string> = {
  missing_reference: 'We could not read the payment reference from the bank. If you were charged, contact support with your order number.',
  payment_failed: 'The payment was not completed or was declined.',
  missing_order: 'We could not match this payment to an order. Please contact support.',
  order_not_found: 'We could not find your order. Check the link or contact support.',
  amount_mismatch: 'The amount paid does not match the order total. Please contact support before retrying.',
  update_failed: 'Payment was received but we could not update your order automatically. Contact support with your receipt.',
  verification_error: 'Something went wrong while confirming payment. Try again or contact support.',
  config_error: 'Payments are temporarily unavailable. Please try again later.',
};

function OrderFailedContent() {
  const searchParams = useSearchParams();
  const order = searchParams.get('order') || '';
  const reason = searchParams.get('reason') || 'unknown';
  const copy = REASON_COPY[reason] || 'Your payment could not be confirmed. If money left your account, contact support with details.';

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-red-50/30 px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-5">
          <i className="ri-close-circle-line text-3xl text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment not completed</h1>
        <p className="text-gray-600 mb-2 leading-relaxed">{copy}</p>
        {order ? (
          <p className="text-xs font-mono text-slate-500 mb-6 truncate" title={order}>
            Order: {order}
          </p>
        ) : (
          <div className="mb-6" />
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/checkout"
            className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            <i className="ri-arrow-left-line" /> Back to checkout
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 border-2 border-slate-200 hover:border-blue-300 text-slate-700 px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            <i className="ri-customer-service-line" /> Contact support
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function OrderFailedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="w-12 h-12 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      }
    >
      <OrderFailedContent />
    </Suspense>
  );
}
