-- ── Polar billing migration safety fixes ─────────────────────────────────────
-- Repairs provider-agnostic billing columns/tables after the Lemon Squeezy →
-- Polar rename, including partially-applied migration states.

-- Ensure provider-agnostic subscription columns exist. If both the old and new
-- columns exist, preserve any data from the old column before dropping it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_subscriptions'
      AND column_name = 'lemon_customer_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_subscriptions'
      AND column_name = 'billing_customer_id'
  ) THEN
    ALTER TABLE public.user_subscriptions
      RENAME COLUMN lemon_customer_id TO billing_customer_id;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_subscriptions'
      AND column_name = 'lemon_customer_id'
  ) THEN
    UPDATE public.user_subscriptions
    SET billing_customer_id = COALESCE(billing_customer_id, lemon_customer_id);

    ALTER TABLE public.user_subscriptions
      DROP COLUMN lemon_customer_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_subscriptions'
      AND column_name = 'lemon_subscription_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_subscriptions'
      AND column_name = 'billing_subscription_id'
  ) THEN
    ALTER TABLE public.user_subscriptions
      RENAME COLUMN lemon_subscription_id TO billing_subscription_id;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_subscriptions'
      AND column_name = 'lemon_subscription_id'
  ) THEN
    UPDATE public.user_subscriptions
    SET billing_subscription_id = COALESCE(billing_subscription_id, lemon_subscription_id);

    ALTER TABLE public.user_subscriptions
      DROP COLUMN lemon_subscription_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_subscriptions'
      AND column_name = 'lemon_subscription_status'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_subscriptions'
      AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE public.user_subscriptions
      RENAME COLUMN lemon_subscription_status TO subscription_status;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_subscriptions'
      AND column_name = 'lemon_subscription_status'
  ) THEN
    UPDATE public.user_subscriptions
    SET subscription_status = COALESCE(subscription_status, lemon_subscription_status);

    ALTER TABLE public.user_subscriptions
      DROP COLUMN lemon_subscription_status;
  END IF;
END $$;

ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS billing_customer_id text;

ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS billing_subscription_id text;

ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'none';

UPDATE public.user_subscriptions
SET subscription_status = CASE subscription_status
  WHEN 'on_trial' THEN 'trialing'
  WHEN 'canceled' THEN 'cancelled'
  WHEN 'revoked' THEN 'expired'
  WHEN 'incomplete' THEN 'past_due'
  WHEN 'incomplete_expired' THEN 'past_due'
  ELSE COALESCE(subscription_status, 'none')
END;

ALTER TABLE public.user_subscriptions
  ALTER COLUMN subscription_status SET DEFAULT 'none';

ALTER TABLE public.user_subscriptions
  DROP CONSTRAINT IF EXISTS user_subscriptions_lemon_subscription_status_check;

ALTER TABLE public.user_subscriptions
  DROP CONSTRAINT IF EXISTS user_subscriptions_subscription_status_check;

ALTER TABLE public.user_subscriptions
  ADD CONSTRAINT user_subscriptions_subscription_status_check
  CHECK (subscription_status IN (
    'none',
    'active',
    'trialing',
    'cancelled',
    'expired',
    'past_due',
    'unpaid',
    'paused'
  ));

-- Ensure the provider-agnostic idempotency table exists and keeps any old event
-- keys if both the old and new tables are present.
CREATE TABLE IF NOT EXISTS public.processed_billing_events (
  event_key    text        PRIMARY KEY,
  processed_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'processed_lemon_events'
  ) THEN
    INSERT INTO public.processed_billing_events (event_key, processed_at)
    SELECT event_key, processed_at
    FROM public.processed_lemon_events
    ON CONFLICT (event_key) DO NOTHING;

    DROP TABLE public.processed_lemon_events;
  END IF;
END $$;

ALTER TABLE public.processed_billing_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.user_subscriptions IS
  'Billing, plan, and quota data. Insert/update/delete via Polar webhooks and server actions (service role only).';

COMMENT ON TABLE public.processed_billing_events IS
  'Atomic webhook idempotency guard — one row per processed event key. '
  'Only the webhook handler (service_role) writes here.';
