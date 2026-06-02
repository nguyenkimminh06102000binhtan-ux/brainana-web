-- Track the Lemon Squeezy subscription lifecycle status so the billing page
-- can distinguish "active, renewing" from "cancelled, expiring" without an
-- extra API call. Kept in sync by the webhook handler.

ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS lemon_subscription_status text
    DEFAULT 'none'
    CHECK (lemon_subscription_status IN (
      'none',        -- no paid subscription ever created
      'active',
      'on_trial',
      'cancelled',   -- cancelled by user, access until plan_expires_at
      'expired',
      'paused',
      'past_due',
      'unpaid'
    ));
