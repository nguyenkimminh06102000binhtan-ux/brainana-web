-- ── Free plan: one-time 5,000 chars instead of a monthly refill ─────────────
-- 058 refilled every plan monthly. Free accounts now get their 5,000 AI
-- characters once (on first use); only paid plans refill monthly.

ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS free_chars_granted boolean NOT NULL DEFAULT false;

-- Free accounts that already received a refill under 058 have had their grant.
UPDATE user_subscriptions us
SET free_chars_granted = true
WHERE EXISTS (
  SELECT 1
  FROM quota_transactions qt
  WHERE qt.user_id = us.user_id
    AND qt.resource = 'chars'
    AND qt.reason = 'monthly_grant'
    AND qt.metadata->>'event' = 'monthly_refresh'
    AND qt.metadata->>'plan' = 'free'
);

-- Character allowance per plan: one-time for 'free', monthly for paid plans.
-- Must match PLAN_QUOTA in utils/polar.ts.
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

-- Free plan: grant the one-time allowance if not yet given.
-- Paid plans: refill to the monthly allowance once the reset time has passed.
-- Returns true when a grant happened.
CREATE OR REPLACE FUNCTION refresh_quota_if_due(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan          text;
  v_reset_at      timestamptz;
  v_free_granted  boolean;
  v_next          timestamptz;
  v_months        integer := 1;
  v_allowance     integer;
BEGIN
  -- auth.uid() is NULL for service-role calls (no JWT), so those pass through.
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: cannot refresh quota for another user';
  END IF;

  SELECT plan, quota_reset_at, free_chars_granted
  INTO v_plan, v_reset_at, v_free_granted
  FROM user_subscriptions
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  v_allowance := plan_monthly_chars(v_plan);

  -- ── Free: one-time grant ──
  IF v_plan = 'free' THEN
    IF v_free_granted THEN
      RETURN false;
    END IF;

    UPDATE user_subscriptions
    SET chars_balance      = chars_balance + v_allowance,
        free_chars_granted = true,
        quota_reset_at     = NULL
    WHERE user_id = p_user_id;

    INSERT INTO quota_transactions (user_id, resource, amount, reason, metadata)
    VALUES (
      p_user_id, 'chars', v_allowance, 'monthly_grant',
      jsonb_build_object('plan', v_plan, 'event', 'free_grant')
    );

    RETURN true;
  END IF;

  -- ── Paid: monthly refill ──
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
