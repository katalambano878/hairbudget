-- Sales hub: persist coupon codes on orders and keep a closeable end-of-day report.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_code text;

CREATE TABLE IF NOT EXISTS public.end_of_day_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date date NOT NULL UNIQUE,
  opening_cash numeric NOT NULL DEFAULT 0,
  counted_cash numeric,
  expected_cash numeric NOT NULL DEFAULT 0,
  variance numeric,
  website_collected numeric NOT NULL DEFAULT 0,
  pos_collected numeric NOT NULL DEFAULT 0,
  cash_collected numeric NOT NULL DEFAULT 0,
  card_collected numeric NOT NULL DEFAULT 0,
  momo_collected numeric NOT NULL DEFAULT 0,
  paystack_collected numeric NOT NULL DEFAULT 0,
  other_collected numeric NOT NULL DEFAULT 0,
  orders_count integer NOT NULL DEFAULT 0,
  items_sold integer NOT NULL DEFAULT 0,
  order_total numeric NOT NULL DEFAULT 0,
  amount_paid_total numeric NOT NULL DEFAULT 0,
  outstanding_total numeric NOT NULL DEFAULT 0,
  notes text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  closed_by uuid,
  closed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eod_reports_date ON public.end_of_day_reports (report_date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at);
CREATE INDEX IF NOT EXISTS idx_orders_coupon_code ON public.orders (coupon_code);

CREATE OR REPLACE FUNCTION public.redeem_coupon(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  updated integer;
BEGIN
  UPDATE public.coupons
  SET usage_count = COALESCE(usage_count, 0) + 1,
      updated_at = now()
  WHERE upper(btrim(code)) = upper(btrim(p_code))
    AND COALESCE(is_active, false) = true
    AND (usage_limit IS NULL OR COALESCE(usage_count, 0) < usage_limit)
    AND (start_date IS NULL OR start_date <= now())
    AND (end_date IS NULL OR end_date >= now());
  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated > 0;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'store_hairbudget') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.end_of_day_reports TO store_hairbudget;
    GRANT EXECUTE ON FUNCTION public.redeem_coupon(text) TO store_hairbudget;
  END IF;
END $$;
