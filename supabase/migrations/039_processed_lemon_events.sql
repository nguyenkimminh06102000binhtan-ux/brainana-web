-- ── Atomic webhook idempotency ───────────────────────────────────────────────
-- A read-then-write check against quota_transactions is not safe under concurrent
-- webhook retries: two deliveries can both pass the read and double-credit quota.
-- This table provides a unique key per event/order so the INSERT itself is the
-- atomic guard — only one concurrent request can succeed; the other gets a
-- unique-constraint violation (code 23505) and is skipped.

CREATE TABLE processed_lemon_events (
  event_key    text        PRIMARY KEY,
  processed_at timestamptz NOT NULL DEFAULT now()
);

-- No client access needed — only the webhook handler (service_role) writes here.
ALTER TABLE processed_lemon_events ENABLE ROW LEVEL SECURITY;
