-- Reset all users to trial quota (500 chars, 1 tutor session).
-- All current users are testers — overwrite whatever balance they have.

update user_subscriptions
set chars_balance          = 500,
    tutor_sessions_balance = 1;

insert into quota_transactions (user_id, resource, amount, reason, metadata)
select user_id, 'chars', 500, 'monthly_grant',
       '{"plan": "free", "type": "initial_trial", "backfill": true}'::jsonb
from user_subscriptions;

insert into quota_transactions (user_id, resource, amount, reason, metadata)
select user_id, 'tutor_sessions', 1, 'monthly_grant',
       '{"plan": "free", "type": "initial_trial", "backfill": true}'::jsonb
from user_subscriptions;
