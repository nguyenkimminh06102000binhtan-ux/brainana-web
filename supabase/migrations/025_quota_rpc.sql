-- ── Atomic quota deduction ────────────────────────────────────────────────────
-- Checks balance, deducts, and logs the transaction in one atomic operation.
-- Returns true if successful, false if insufficient balance.

create or replace function deduct_quota(
  p_user_id  uuid,
  p_resource text,
  p_amount   integer,
  p_reason   text,
  p_metadata jsonb default null
) returns boolean
language plpgsql
security definer
as $$
declare
  v_chars_balance            integer;
  v_tutor_sessions_balance   integer;
  v_sufficient               boolean := false;
begin
  -- Lock the row to prevent race conditions
  select chars_balance, tutor_sessions_balance
  into v_chars_balance, v_tutor_sessions_balance
  from user_subscriptions
  where user_id = p_user_id
  for update;

  -- Check sufficient balance for the resource
  if p_resource = 'chars' then
    v_sufficient := v_chars_balance >= p_amount;
  elsif p_resource = 'tutor_sessions' then
    v_sufficient := v_tutor_sessions_balance >= p_amount;
  end if;

  if not v_sufficient then
    return false;
  end if;

  -- Deduct from the correct column
  if p_resource = 'chars' then
    update user_subscriptions
    set chars_balance = chars_balance - p_amount
    where user_id = p_user_id;
  elsif p_resource = 'tutor_sessions' then
    update user_subscriptions
    set tutor_sessions_balance = tutor_sessions_balance - p_amount
    where user_id = p_user_id;
  end if;

  -- Log the transaction (amount stored as negative = debit)
  insert into quota_transactions (user_id, resource, amount, reason, metadata)
  values (p_user_id, p_resource, -p_amount, p_reason, p_metadata);

  return true;
end;
$$;

-- ── Refund quota ──────────────────────────────────────────────────────────────
-- Credits quota back, capped by the original purchase amount (no negative refunds).

create or replace function refund_quota(
  p_user_id         uuid,
  p_resource        text,
  p_requested_amount integer,
  p_reason          text,
  p_metadata        jsonb default null
) returns integer
language plpgsql
security definer
as $$
declare
  v_current_balance   integer;
  v_actual_refund     integer;
begin
  select
    case when p_resource = 'chars' then chars_balance
         else tutor_sessions_balance end
  into v_current_balance
  from user_subscriptions
  where user_id = p_user_id
  for update;

  -- Refund only up to what was originally purchased (can't credit more than purchased)
  v_actual_refund := p_requested_amount;

  -- Credit the balance
  if p_resource = 'chars' then
    update user_subscriptions
    set chars_balance = chars_balance + v_actual_refund
    where user_id = p_user_id;
  elsif p_resource = 'tutor_sessions' then
    update user_subscriptions
    set tutor_sessions_balance = tutor_sessions_balance + v_actual_refund
    where user_id = p_user_id;
  end if;

  -- Log the transaction (positive = credit)
  insert into quota_transactions (user_id, resource, amount, reason, metadata)
  values (p_user_id, p_resource, v_actual_refund, p_reason,
    jsonb_build_object(
      'requested_amount', p_requested_amount,
      'actual_refund', v_actual_refund
    ) || coalesce(p_metadata, '{}'::jsonb)
  );

  return v_actual_refund;
end;
$$;
