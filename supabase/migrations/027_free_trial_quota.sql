-- Grant initial trial quota when a new subscription row is created.
-- Only fires on INSERT (new users), never on update.

create or replace function create_user_subscription()
returns trigger as $$
declare
  v_rows integer;
begin
  insert into user_subscriptions (user_id, plan, chars_balance, tutor_sessions_balance)
  values (new.id, 'free', 500, 1)
  on conflict (user_id) do nothing;

  get diagnostics v_rows = row_count;

  if v_rows > 0 then
    insert into quota_transactions (user_id, resource, amount, reason, metadata)
    values
      (new.id, 'chars',          500, 'monthly_grant', '{"plan": "free", "type": "initial_trial"}'::jsonb),
      (new.id, 'tutor_sessions',   1, 'monthly_grant', '{"plan": "free", "type": "initial_trial"}'::jsonb);
  end if;

  return new;
end;
$$ language plpgsql security definer;
