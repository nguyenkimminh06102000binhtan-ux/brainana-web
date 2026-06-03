-- ── Drop duplicate provider subscription columns ────────────────────────────
-- The app now uses billing_customer_id, billing_subscription_id, and
-- subscription_status on user_subscriptions. These provider_* columns were
-- transitional duplicates from the Lemon Squeezy → Polar migration.

ALTER TABLE public.user_subscriptions
  DROP CONSTRAINT IF EXISTS user_subscriptions_provider_subscription_status_check;

ALTER TABLE public.user_subscriptions
  DROP COLUMN IF EXISTS billing_provider,
  DROP COLUMN IF EXISTS provider_customer_id,
  DROP COLUMN IF EXISTS provider_subscription_id,
  DROP COLUMN IF EXISTS provider_subscription_status;
