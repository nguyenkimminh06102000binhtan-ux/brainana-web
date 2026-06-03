-- ── Rename Lemon Squeezy columns to provider-agnostic names ──────────────────
-- Switched payment provider from Lemon Squeezy to Polar.
-- Fully idempotent: each block attempts the operation and silently ignores
-- the specific error that fires when the work was already done.

-- Rename lemon_customer_id → billing_customer_id
DO $$ BEGIN
  ALTER TABLE user_subscriptions RENAME COLUMN lemon_customer_id TO billing_customer_id;
EXCEPTION
  WHEN undefined_column THEN NULL;  -- already renamed
  WHEN duplicate_column THEN NULL;  -- target already exists
END $$;

-- Rename lemon_subscription_id → billing_subscription_id
DO $$ BEGIN
  ALTER TABLE user_subscriptions RENAME COLUMN lemon_subscription_id TO billing_subscription_id;
EXCEPTION
  WHEN undefined_column THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- Rename lemon_subscription_status → subscription_status
DO $$ BEGIN
  ALTER TABLE user_subscriptions RENAME COLUMN lemon_subscription_status TO subscription_status;
EXCEPTION
  WHEN undefined_column THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- Replace the LS-specific CHECK constraint with a provider-agnostic set.
ALTER TABLE user_subscriptions
  DROP CONSTRAINT IF EXISTS user_subscriptions_lemon_subscription_status_check;

ALTER TABLE user_subscriptions
  DROP CONSTRAINT IF EXISTS user_subscriptions_subscription_status_check;

ALTER TABLE user_subscriptions
  ADD CONSTRAINT user_subscriptions_subscription_status_check
  CHECK (subscription_status IN (
    'none',        -- no paid subscription ever created
    'active',
    'trialing',    -- in trial period
    'cancelled',   -- cancelled by user, access continues until plan_expires_at
    'expired',     -- billing period ended, access revoked
    'past_due',    -- payment failed, retrying
    'unpaid',      -- payment failed, not retrying
    'paused'       -- subscription paused
  ));

-- Rename processed_lemon_events → processed_billing_events.
-- If the target already exists (e.g. from a previous partial run) and the
-- source still exists too, drop the source — it is safe because we are
-- switching providers and any old Lemon Squeezy event keys are irrelevant.
DO $$ BEGIN
  ALTER TABLE processed_lemon_events RENAME TO processed_billing_events;
EXCEPTION
  WHEN duplicate_table THEN
    -- Target already exists; drop the now-redundant source if it still exists.
    DROP TABLE IF EXISTS processed_lemon_events;
  WHEN undefined_table THEN NULL;  -- source already gone, nothing to do
END $$;

-- Update table comments
COMMENT ON TABLE user_subscriptions IS
  'Billing, plan, and quota data. Insert/update/delete via Polar webhooks and server actions (service role only).';

COMMENT ON TABLE processed_billing_events IS
  'Atomic webhook idempotency guard — one row per processed event key. '
  'Only the webhook handler (service_role) writes here.';
