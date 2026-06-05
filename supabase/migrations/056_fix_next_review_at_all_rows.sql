-- Migration 055 missed rows where next_review_at had already passed now()
-- (e.g. "2026-06-05T17:00:00Z" = Vietnam midnight, now in the past after midnight local).
-- Fix: update ALL rows whose next_review_at is not at UTC midnight, past or future,
-- by ceiling to the next UTC midnight. Uses explicit AT TIME ZONE 'UTC' so the result
-- is independent of the Supabase session timezone setting.

update item_progress
set next_review_at =
  (date_trunc('day', next_review_at at time zone 'UTC') + interval '1 day')
  at time zone 'UTC'
where (next_review_at at time zone 'UTC')::time <> time '00:00:00';
