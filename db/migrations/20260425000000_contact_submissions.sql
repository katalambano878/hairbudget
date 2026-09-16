-- Contact form submissions (used by /contact page)
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  handled_by uuid REFERENCES public.users(id),
  handled_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON public.contact_submissions USING btree (status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created ON public.contact_submissions USING btree (created_at DESC);

-- Access control: anyone may insert; only staff may read/manage.
-- Enforced by the application's data-access layer (lib/db/rules.ts).
