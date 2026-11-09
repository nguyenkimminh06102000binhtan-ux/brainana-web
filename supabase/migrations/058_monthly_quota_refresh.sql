-- ── Monthly AI-character refresh ─────────────────────────────────────────────
-- Quota used to be granted only by Polar renewal webhooks. That no longer
-- covers everyone:
--   • Free users now get 5,000 chars/month but have no billing cycle.
--   • Yearly subscribers only renew once a year, but their allowance is monthly.
-- Each row now records when its allowance next refills. The refill happens
-- lazily: deduct_quota() and the app call refresh_quota_if_due() before using
-- or showing a balance, so no cron job is needed.

ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS quota_reset_at timestamptz;

-- Monthly character allowance per plan. Must match PLAN_QUOTA in utils/polar.ts.
CREATE OR REPLACE FUNCTION plan_monthly_chars(p_plan text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_plan
    WHEN 'plus' THEN 300000
    WHEN 'pro'  THEN 1000000
    ELSE 5000
  END;
$$;

-- Refill the user's chars balance to their plan allowance if the reset time
-- has passed (or was never set). Returns true when a refill happened.
CREATE OR REPLACE FUNCTION refresh_quota_if_due(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan      text;
  v_reset_at  timestamptz;
  v_next      timestamptz;
  v_months    integer := 1;
  v_allowance integer;
BEGIN
  -- auth.uid() is NULL for service-role calls (no JWT), so those pass through.
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: cannot refresh quota for another user';
  END IF;

  SELECT plan, quota_reset_at
  INTO v_plan, v_reset_at
  FROM user_subscriptions
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_reset_at IS NOT NULL AND v_reset_at > now() THEN
    RETURN false;
  END IF;

  -- Keep the original day-of-month anchor and skip months the user was away.
  IF v_reset_at IS NULL THEN
    v_next := now() + interval '1 month';
  ELSE
    LOOP
      v_next := v_reset_at + make_interval(months => v_months);
      EXIT WHEN v_next > now();
      v_months := v_months + 1;
    END LOOP;
  END IF;

  v_allowance := plan_monthly_chars(v_plan);

  UPDATE user_subscriptions
  SET chars_balance  = v_allowance,
      quota_reset_at = v_next
  WHERE user_id = p_user_id;

  INSERT INTO quota_transactions (user_id, resource, amount, reason, metadata)
  VALUES (
    p_user_id, 'chars', v_allowance, 'monthly_grant',
    jsonb_build_object('plan', v_plan, 'event', 'monthly_refresh', 'next_reset_at', v_next)
  );

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION refresh_quota_if_due(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION refresh_quota_if_due(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION refresh_quota_if_due(uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION refresh_quota_if_due(uuid) TO service_role;

-- ── deduct_quota: refill first ───────────────────────────────────────────────
-- Same as 036_security_hardening.sql, plus a refresh before the balance check
-- so a user whose month has rolled over is never blocked on a stale balance.

CREATE OR REPLACE FUNCTION deduct_quota(
  p_user_id  uuid,
  p_resource text,
  p_amount   integer,
  p_reason   text,
  p_metadata jsonb DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_chars_balance          integer;
  v_tutor_sessions_balance integer;
  v_sufficient             boolean := false;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid quota amount: must be a positive integer';
  END IF;

  IF p_resource NOT IN ('chars', 'tutor_sessions') THEN
    RAISE EXCEPTION 'Invalid quota resource: %', p_resource;
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: cannot deduct quota for another user';
  END IF;

  PERFORM refresh_quota_if_due(p_user_id);

  SELECT chars_balance, tutor_sessions_balance
  INTO v_chars_balance, v_tutor_sessions_balance
  FROM user_subscriptions
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF p_resource = 'chars' THEN
    v_sufficient := v_chars_balance >= p_amount;
  ELSIF p_resource = 'tutor_sessions' THEN
    v_sufficient := v_tutor_sessions_balance >= p_amount;
  END IF;

  IF NOT v_sufficient THEN
    RETURN false;
  END IF;

  IF p_resource = 'chars' THEN
    UPDATE user_subscriptions
    SET chars_balance = chars_balance - p_amount
    WHERE user_id = p_user_id;
  ELSIF p_resource = 'tutor_sessions' THEN
    UPDATE user_subscriptions
    SET tutor_sessions_balance = tutor_sessions_balance - p_amount
    WHERE user_id = p_user_id;
  END IF;

  INSERT INTO quota_transactions (user_id, resource, amount, reason, metadata)
  VALUES (p_user_id, p_resource, -p_amount, p_reason, p_metadata);

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION deduct_quota(uuid, text, integer, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION deduct_quota(uuid, text, integer, text, jsonb) FROM anon;
GRANT  EXECUTE ON FUNCTION deduct_quota(uuid, text, integer, text, jsonb) TO authenticated;
GRANT  EXECUTE ON FUNCTION deduct_quota(uuid, text, integer, text, jsonb) TO service_role;

-- ── Backfill ─────────────────────────────────────────────────────────────────
-- Paid subscribers: next refill lines up with their current Polar period end,
-- so nobody gets an early reset. Everyone else (free users, manual plans with
-- no expiry) keeps NULL and is refilled the next time they use or view quota.
UPDATE user_subscriptions
SET quota_reset_at = plan_expires_at
WHERE plan <> 'free'
  AND plan_expires_at > now()
  AND quota_reset_at IS NULL;
