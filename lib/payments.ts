/**
 * Half-payment (deposit) helpers.
 *
 * Every payment attempt charges `order.metadata.payable_now`, which the Moolre
 * and Paystack routes already verify against. Checkout writes the deposit there;
 * the balance flow overwrites it with whatever is still owed. Keeping one
 * meaning for that field is what lets the gateway code stay untouched.
 */

export type PaymentPlan = 'full' | 'half';

/** Deposit share when a customer chooses to pay half up front. */
export const DEPOSIT_RATE = 0.5;

/** Money in GHS is only ever shown and charged to the pesewa. */
export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/** Deposit payable now for a half-payment order. */
export function depositAmount(total: number): number {
  return roundMoney(total * DEPOSIT_RATE);
}

/** What the customer owes after paying the deposit. */
export function depositBalance(total: number): number {
  return roundMoney(total - depositAmount(total));
}

/** Amount to charge at checkout for the chosen plan. */
export function amountDueAtCheckout(total: number, plan: PaymentPlan): number {
  return plan === 'half' ? depositAmount(total) : roundMoney(total);
}

export interface OrderPaymentShape {
  total: number | string;
  amount_paid?: number | string | null;
  payment_status?: string | null;
}

/**
 * Outstanding balance on an order. Derived from the ledger rather than the
 * chosen plan, so it stays correct after manual or partial payments.
 */
export function outstandingBalance(order: OrderPaymentShape): number {
  const total = Number(order.total) || 0;
  const paid = Number(order.amount_paid) || 0;
  return roundMoney(Math.max(total - paid, 0));
}

/** True when money is still owed. Tolerates gateway rounding by a pesewa. */
export function hasOutstandingBalance(order: OrderPaymentShape): boolean {
  return outstandingBalance(order) > 0.005;
}

export function isFullyPaid(order: OrderPaymentShape): boolean {
  return !hasOutstandingBalance(order);
}

/**
 * Whether money has actually been received for an order.
 *
 * A deposit counts: stock is reserved and the order is fulfillable, so these
 * belong with confirmed orders rather than abandoned checkouts.
 */
export function isConfirmedPayment(paymentStatus: string | null | undefined): boolean {
  return paymentStatus === 'paid' || paymentStatus === 'partially_paid';
}

export function formatGhs(amount: number): string {
  return `GH₵ ${roundMoney(amount).toFixed(2)}`;
}

export interface ChargeableOrder extends OrderPaymentShape {
  metadata?: { payable_now?: unknown } | null;
}

/**
 * Amount to charge for the next payment attempt on an order.
 *
 * Once anything has been received the only sensible charge is what is still
 * owed — reusing the stored deposit would under- or over-charge on the balance
 * attempt. Callers must persist this back to metadata.payable_now before
 * redirecting, because the callback, webhook and verify routes all validate the
 * amount the gateway reports against that field.
 */
export function resolveChargeAmount(order: ChargeableOrder): number {
  const total = roundMoney(Number(order.total) || 0);
  const paid = Number(order.amount_paid) || 0;

  if (paid > 0.005) {
    return outstandingBalance(order);
  }

  const payableNow = Number(order.metadata?.payable_now);
  if (Number.isFinite(payableNow) && payableNow > 0) {
    return roundMoney(Math.min(payableNow, total));
  }

  return total;
}
