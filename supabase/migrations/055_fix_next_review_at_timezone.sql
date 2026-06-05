-- Before this fix, nextReviewDay() used local-time midnight on the client.
-- Users in UTC+ timezones (e.g. Vietnam UTC+7) stored "tomorrow local midnight"
-- as e.g. "2026-06-05T17:00:00Z" instead of "2026-06-06T00:00:00Z", causing
-- those cards to appear due immediately on the server (which runs UTC).
--
-- Fix: for all future next_review_at values that are not already at UTC midnight,
-- ceil them to the next UTC midnight. This corrects early-due cards for UTC+
-- users. UTC- users (rare) get at most a 1-day delay, which is acceptable.

update item_progress
set next_review_at = date_trunc('day', next_review_at + interval '1 day')
where next_review_at > now()
  and next_review_at <> date_trunc('day', next_review_at);
