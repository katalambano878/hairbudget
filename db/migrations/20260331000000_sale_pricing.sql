-- Optional sale price (used when store_pricing.sales_active is true)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sale_price numeric;

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS sale_price numeric;

COMMENT ON COLUMN public.products.sale_price IS 'Discounted price when site-wide sale mode is ON; NULL or 0 means use regular price';
COMMENT ON COLUMN public.product_variants.sale_price IS 'Variant sale price; falls back to product.sale_price then variant/product price';

INSERT INTO public.site_settings (key, value, category)
VALUES ('store_pricing', '{"sales_active": false}'::jsonb, 'pricing')
ON CONFLICT (key) DO NOTHING;
