-- One-time codes for verifying email addresses and phone numbers.
CREATE TABLE IF NOT EXISTS public.verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email', 'phone')),
  code_hash text NOT NULL,          -- sha256 of the 6-digit code
  target text NOT NULL,             -- the email / phone being verified
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_user
  ON public.verification_codes USING btree (user_id, channel);

-- Track phone verification on the auth user (email_confirmed_at already exists)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone_confirmed_at timestamp with time zone;
