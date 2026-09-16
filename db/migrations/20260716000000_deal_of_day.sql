-- "Deals of the Day" flag: products marked here surface in the homepage
-- Deals of the Day section (independent of the general `featured` flag).
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS deal_of_day boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_products_deal_of_day
  ON public.products USING btree (deal_of_day);

COMMENT ON COLUMN public.products.deal_of_day IS
  'When true, the product appears in the "Deals of the Day" section on the homepage';
