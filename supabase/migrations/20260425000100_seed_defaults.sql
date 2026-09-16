-- Seed baseline rows used by the app (HairBudget).
-- Safe to re-run: uses ON CONFLICT DO NOTHING.

INSERT INTO public.site_settings (key, value, category) VALUES
  ('store_pricing', '{"sales_active": false}'::jsonb, 'pricing'),
  ('site_identity', '{"site_name":"HairBudget","site_tagline":"Confidence in every strand","site_logo":"/logo.png"}'::jsonb, 'general'),
  ('contact_info', '{"email":"info@hairbudgetgh.com","phone":"059 892 8819","address":"1 Kwei-Fio St, Adenta Municipality, Ghana"}'::jsonb, 'contact'),
  ('social_links', '{"facebook":"","instagram":"https://www.instagram.com/hairbudget_yassi/","twitter":"","tiktok":"https://www.tiktok.com/@hairbudget22","snapchat":"https://www.snapchat.com/add/hairbudget","youtube":""}'::jsonb, 'social'),
  ('branding_colors', '{"primary_color":"#0C4534","secondary_color":"#EEE5D4"}'::jsonb, 'branding')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.store_modules (id, enabled) VALUES
  ('notifications', true),
  ('cms', true),
  ('homepage', true),
  ('blog', true),
  ('customer-insights', false),
  ('flash-sales', false),
  ('loyalty-program', false),
  ('pwa-settings', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.cms_content (section, block_key, title, subtitle, content, is_active) VALUES
  ('contact','main','Contact HairBudget','We''re here to help','Have a question about our wigs, bundles or hair care? Send us a message and our team will get back to you as soon as possible.', true),
  ('home','hero','Confidence in every strand','Stylish hair at budget-friendly prices','Shop wigs, extensions, bundles and shapewear — retail and wholesale from Adenta, Ghana.', true),
  ('about','mission','Our Mission','Look and feel your best','HairBudget helps women look and feel their best without compromising quality or budget.', true)
ON CONFLICT (section, block_key) DO NOTHING;

INSERT INTO public.pages (title, slug, content, status, seo_title, seo_description) VALUES
  ('Terms of Service','terms','<h1>Terms of Service</h1><p>Welcome to HairBudget.</p>','published','Terms of Service | HairBudget','Terms and conditions for using HairBudget.'),
  ('Privacy Policy','privacy','<h1>Privacy Policy</h1><p>Your privacy matters at HairBudget.</p>','published','Privacy Policy | HairBudget','How HairBudget handles your information.'),
  ('Shipping & Returns','shipping-returns','<h1>Shipping &amp; Returns</h1><p>Shipping and return policies.</p>','published','Shipping & Returns | HairBudget','Shipping and return policies for HairBudget.')
ON CONFLICT (slug) DO NOTHING;
