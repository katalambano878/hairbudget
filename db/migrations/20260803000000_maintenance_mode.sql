-- Maintenance mode settings (storefront gate + countdown page)
INSERT INTO public.store_settings (key, value, description) VALUES
  ('maintenance_mode', 'false'::jsonb, 'When true, storefront redirects to /maintenance'),
  ('maintenance_countdown_minutes', '30'::jsonb, 'Countdown shown on the maintenance page')
ON CONFLICT (key) DO NOTHING;
