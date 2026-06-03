-- ── Provider-aware billing event idempotency ─────────────────────────────────
-- Some environments already have a provider column on processed_billing_events.
-- Ensure all environments accept provider-scoped inserts from the Polar webhook.

ALTER TABLE public.processed_billing_events
  ADD COLUMN IF NOT EXISTS provider text;

UPDATE public.processed_billing_events
SET provider = 'polar'
WHERE provider IS NULL;

ALTER TABLE public.processed_billing_events
  ALTER COLUMN provider SET DEFAULT 'polar';

ALTER TABLE public.processed_billing_events
  ALTER COLUMN provider SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS processed_billing_events_provider_event_key_key
  ON public.processed_billing_events (provider, event_key);
