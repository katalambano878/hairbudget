-- Contact form submissions (used by /contact page)
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  handled_by uuid REFERENCES auth.users(id),
  handled_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON public.contact_submissions USING btree (status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created ON public.contact_submissions USING btree (created_at DESC);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit contact form" ON public.contact_submissions;
CREATE POLICY "Anyone can submit contact form"
  ON public.contact_submissions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Staff manage contact submissions" ON public.contact_submissions;
CREATE POLICY "Staff manage contact submissions"
  ON public.contact_submissions FOR ALL USING (is_admin_or_staff()) WITH CHECK (is_admin_or_staff());
