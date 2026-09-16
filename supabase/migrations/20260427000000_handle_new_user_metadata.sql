-- Update handle_new_user so it captures the metadata sent from the
-- signup form (first_name, last_name, phone, newsletter) and stores
-- the relevant fields on the profiles row.
--
-- Existing trigger only inserted (id, email, 'customer') and discarded
-- everything else, so signed-up users had blank full_name/phone in
-- their profile and the welcome flow had no greeting name to use.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_first_name text;
  v_last_name  text;
  v_phone      text;
  v_newsletter boolean;
  v_full_name  text;
BEGIN
  v_first_name := NULLIF(trim(coalesce(NEW.raw_user_meta_data->>'first_name', '')), '');
  v_last_name  := NULLIF(trim(coalesce(NEW.raw_user_meta_data->>'last_name', '')), '');
  v_phone      := NULLIF(trim(coalesce(NEW.raw_user_meta_data->>'phone', '')), '');
  v_newsletter := COALESCE((NEW.raw_user_meta_data->>'newsletter')::boolean, false);

  v_full_name := NULLIF(
    trim(BOTH ' ' FROM concat_ws(' ', v_first_name, v_last_name)),
    ''
  );

  INSERT INTO public.profiles (id, email, role, full_name, phone, preferences)
  VALUES (
    NEW.id,
    NEW.email,
    'customer',
    v_full_name,
    v_phone,
    jsonb_build_object('newsletter', v_newsletter)
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name   = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        phone       = COALESCE(EXCLUDED.phone, public.profiles.phone),
        preferences = public.profiles.preferences || EXCLUDED.preferences;

  RETURN NEW;
END;
$$;

-- The trigger itself is unchanged; recreating it is harmless and
-- keeps this migration idempotent if it runs against a DB where the
-- trigger was dropped manually.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
