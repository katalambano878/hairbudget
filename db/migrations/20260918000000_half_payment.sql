-- Half payment (deposit) support.
--
-- Customers may pay 50% at checkout and settle the balance later. The amount
-- charged for any single attempt is always metadata.payable_now, which every
-- payment route already verifies against, so the gateway plumbing is unchanged.
-- What this migration adds is the ledger: how much has been received, how much
-- is still owed, and a payment_status that can express "partially paid".

-- 1. New payment_status value ------------------------------------------------
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction block in older
-- servers, and IF NOT EXISTS keeps the migration re-runnable.
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'partially_paid';

-- 2. Ledger columns ----------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS amount_paid numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_plan text NOT NULL DEFAULT 'full';

COMMENT ON COLUMN public.orders.amount_paid IS
  'Total confirmed payments received for this order, across deposit and balance.';
COMMENT ON COLUMN public.orders.payment_plan IS
  'full = paid in one go; half = 50% deposit with the balance collected later.';

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_plan_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_plan_check CHECK (payment_plan IN ('full', 'half'));

-- balance_due is derived, so it can never drift from the ledger.
ALTER TABLE public.orders DROP COLUMN IF EXISTS balance_due;
ALTER TABLE public.orders
  ADD COLUMN balance_due numeric
  GENERATED ALWAYS AS (GREATEST(total - amount_paid, 0)) STORED;

CREATE INDEX IF NOT EXISTS idx_orders_outstanding_balance
  ON public.orders (payment_status)
  WHERE balance_due > 0;

-- Orders already settled before this migration are fully paid by definition.
UPDATE public.orders
SET amount_paid = total
WHERE payment_status = 'paid' AND amount_paid = 0;

-- 3. Partial-payment aware mark_order_paid -----------------------------------
-- Credits a single confirmed payment. Idempotent per transaction reference so
-- gateway retries and the callback/webhook/verify paths racing each other
-- cannot credit the same money twice.
--
-- The old two-argument signature must go: adding a third defaulted parameter
-- creates an overload rather than replacing it, which would leave the existing
-- two-argument calls in the payment routes ambiguous and failing.
DROP FUNCTION IF EXISTS public.mark_order_paid(text, text);

CREATE OR REPLACE FUNCTION public.mark_order_paid(
  order_ref text,
  moolre_ref text DEFAULT NULL,
  paid_amount numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_order   orders;
  updated_order  orders;
  credit         numeric;
  new_paid       numeric;
  already_applied boolean;
  payment_key    text;
BEGIN
  SELECT * INTO target_order FROM orders WHERE order_number = order_ref;

  IF target_order.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Amount for this attempt: explicit argument wins, else the amount the
  -- checkout/balance flow asked the gateway for, else the whole total.
  credit := COALESCE(
    paid_amount,
    NULLIF((target_order.metadata->>'payable_now')::numeric, 0),
    target_order.total
  );
  IF credit IS NULL OR credit <= 0 THEN
    credit := target_order.total;
  END IF;

  -- Idempotency: a reference is only ever credited once.
  payment_key := COALESCE(moolre_ref, 'no-ref');
  already_applied := EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(target_order.metadata->'payments', '[]'::jsonb)) AS p
    WHERE p->>'reference' = payment_key AND payment_key <> 'no-ref'
  );

  IF already_applied THEN
    RETURN to_jsonb(target_order);
  END IF;

  -- A reference-less call on an already settled order is a duplicate callback.
  IF payment_key = 'no-ref' AND target_order.payment_status = 'paid' THEN
    RETURN to_jsonb(target_order);
  END IF;

  new_paid := COALESCE(target_order.amount_paid, 0) + credit;

  UPDATE orders
  SET
    amount_paid = new_paid,
    -- Half a cent of tolerance keeps rounding at the gateway from leaving an
    -- order permanently one pesewa short of settled.
    payment_status = CASE
        WHEN new_paid >= total - 0.005 THEN 'paid'::payment_status
        ELSE 'partially_paid'::payment_status
    END,
    status = CASE
        WHEN status = 'pending' THEN 'processing'::order_status
        WHEN status = 'awaiting_payment' THEN 'processing'::order_status
        ELSE status
    END,
    metadata = COALESCE(metadata, '{}'::jsonb)
               || jsonb_build_object(
                    'moolre_reference', moolre_ref,
                    'payment_verified_at', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                    'payments', COALESCE(metadata->'payments', '[]'::jsonb) || jsonb_build_array(
                       jsonb_build_object(
                         'reference', moolre_ref,
                         'amount', credit,
                         'at', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
                       )
                    )
                  ),
    updated_at = now()
  WHERE id = target_order.id
  RETURNING * INTO updated_order;

  -- Stock is reserved by the deposit, so this runs on the first confirmed
  -- payment rather than waiting for the balance.
  IF (updated_order.metadata->>'stock_reduced') IS NULL THEN
      UPDATE products p
      SET quantity = GREATEST(0, p.quantity - oi.quantity)
      FROM order_items oi
      WHERE oi.order_id = updated_order.id
        AND oi.product_id = p.id;

      UPDATE product_variants pv
      SET quantity = GREATEST(0, pv.quantity - oi.quantity)
      FROM order_items oi
      WHERE oi.order_id = updated_order.id
        AND oi.product_id = pv.product_id
        AND oi.variant_name IS NOT NULL
        AND oi.variant_name = pv.name;

      UPDATE orders
      SET metadata = metadata || '{"stock_reduced": true}'::jsonb
      WHERE id = updated_order.id
      RETURNING * INTO updated_order;
  END IF;

  RETURN to_jsonb(updated_order);
END;
$$;

-- 4. Record a balance payment taken off-platform (cash on delivery, POS) -----
CREATE OR REPLACE FUNCTION public.record_manual_payment(
  order_ref text,
  amount numeric,
  note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_order  orders;
  updated_order orders;
  new_paid      numeric;
BEGIN
  IF amount IS NULL OR amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  SELECT * INTO target_order FROM orders WHERE order_number = order_ref;
  IF target_order.id IS NULL THEN
    RETURN NULL;
  END IF;

  new_paid := COALESCE(target_order.amount_paid, 0) + amount;

  UPDATE orders
  SET
    amount_paid = new_paid,
    payment_status = CASE
        WHEN new_paid >= total - 0.005 THEN 'paid'::payment_status
        ELSE 'partially_paid'::payment_status
    END,
    metadata = COALESCE(metadata, '{}'::jsonb)
               || jsonb_build_object(
                    'payments', COALESCE(metadata->'payments', '[]'::jsonb) || jsonb_build_array(
                       jsonb_build_object(
                         'reference', 'manual-' || to_char(now(), 'YYYYMMDDHH24MISS'),
                         'amount', amount,
                         'method', 'manual',
                         'note', note,
                         'at', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
                       )
                    )
                  ),
    updated_at = now()
  WHERE id = target_order.id
  RETURNING * INTO updated_order;

  RETURN to_jsonb(updated_order);
END;
$$;
