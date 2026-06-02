-- Free plan no longer includes any AI quota (was: 500 chars, 1 tutor session).
-- Update the trigger so new users start with 0 of both.
create or replace function create_user_subscription()
returns trigger as $$
declare
  v_rows integer;
begin
  insert into user_subscriptions (user_id, plan, chars_balance, tutor_sessions_balance)
  values (new.id, 'free', 0, 0)
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

-- Zero out existing free-plan users who still have the old trial credits.
update user_subscriptions
set chars_balance          = 0,
    tutor_sessions_balance = 0
where plan = 'free'
  and (chars_balance > 0 or tutor_sessions_balance > 0);
