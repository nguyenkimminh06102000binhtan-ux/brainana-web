-- ── Backfill missing subscription rows ───────────────────────────────────────
-- The app expects every profile to have exactly one user_subscriptions row.
-- Repair any drift and make the profile trigger resilient for future users.

INSERT INTO public.user_subscriptions (
  user_id,
  plan,
  chars_balance,
  tutor_sessions_balance,
  subscription_status
)
SELECT
  p.id,
  'free',
  0,
  0,
  'none'
FROM public.profiles p
LEFT JOIN public.user_subscriptions s ON s.user_id = p.id
WHERE s.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.create_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_subscriptions (
    user_id,
    plan,
    chars_balance,
    tutor_sessions_balance,
    subscription_status
  )
  VALUES (new.id, 'free', 0, 0, 'none')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_user_subscription();
