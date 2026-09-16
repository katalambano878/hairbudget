-- First-party visitor analytics (page views + sessions)
CREATE TABLE IF NOT EXISTS public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL,
  session_id text NOT NULL,
  path text NOT NULL,
  title text,
  referrer text,
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device_type text CHECK (device_type IS NULL OR device_type IN ('mobile', 'tablet', 'desktop')),
  browser text,
  os text,
  country text,
  city text,
  duration_ms integer NOT NULL DEFAULT 0 CHECK (duration_ms >= 0),
  is_exit boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON public.page_views (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_visitor_created ON public.page_views (visitor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_session_created ON public.page_views (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_path_created ON public.page_views (path, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_referrer_host ON public.page_views (referrer_host, created_at DESC)
  WHERE referrer_host IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_page_views_device ON public.page_views (device_type, created_at DESC);

COMMENT ON TABLE public.page_views IS 'Anonymous first-party page views for admin Visitors analytics';
