-- Tracks accounts on manual/bank-transfer subscriptions so admins can
-- identify them and manage renewals outside of Lemon Squeezy.
ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS is_manual_subscription boolean NOT NULL DEFAULT false;
