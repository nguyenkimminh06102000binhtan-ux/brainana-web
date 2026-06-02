-- ── Fix 1: profiles — restrict INSERT and UPDATE to safe columns ──────────────
-- The broad UPDATE policy (no WITH CHECK, no column restriction) allowed any
-- authenticated user to set is_admin = true via the REST API.
-- The INSERT policy had the same gap: privileged columns could be set on creation.
-- Profile rows are created by the handle_new_user() trigger, so no client code
-- ever needs to INSERT directly — we revoke that entirely.

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile"  ON profiles;

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING  ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- INSERT is handled by the handle_new_user() trigger (SECURITY DEFINER).
-- No client code should INSERT profiles directly.
REVOKE INSERT ON profiles FROM PUBLIC;
REVOKE INSERT ON profiles FROM anon;
REVOKE INSERT ON profiles FROM authenticated;

-- Revoke broad UPDATE from all roles then re-grant only safe columns.
-- is_admin, level, and any server-managed fields are intentionally excluded.
REVOKE UPDATE ON profiles FROM PUBLIC;
REVOKE UPDATE ON profiles FROM anon;
REVOKE UPDATE ON profiles FROM authenticated;

GRANT UPDATE (
  display_name,
  username,
  bio,
  avatar_url,
  website_url,
  twitter_handle,
  daily_goal,
  show_romanization,
  native_language,
  active_origin_language,
  onboarding_completed,
  purpose,
  interests,
  updated_at
) ON profiles TO authenticated;


-- ── Fix 2a: deduct_quota — input validation + caller-ownership guard ──────────
-- Without validating p_amount, a caller could pass a negative value:
--   balance >= -9999  →  true (check passes)
--   balance = balance - (-9999)  →  balance += 9999  (deduction becomes a credit)
-- Also make the access model explicit: revoke from PUBLIC/anon, grant to
-- authenticated (server actions use user cookies) and service_role.

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
  -- Validate inputs before touching any data.
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid quota amount: must be a positive integer';
  END IF;

  IF p_resource NOT IN ('chars', 'tutor_sessions') THEN
    RAISE EXCEPTION 'Invalid quota resource: %', p_resource;
  END IF;

  -- Prevent an authenticated caller from deducting another user's quota.
  -- auth.uid() is NULL for service-role calls (no JWT), so those pass through.
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: cannot deduct quota for another user';
  END IF;

  -- Lock the row to prevent race conditions.
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

  -- Log the transaction (negative amount = debit).
  INSERT INTO quota_transactions (user_id, resource, amount, reason, metadata)
  VALUES (p_user_id, p_resource, -p_amount, p_reason, p_metadata);

  RETURN true;
END;
$$;

-- Make access explicit: remove public default, allow authenticated server
-- actions and service-role webhook/admin calls.
REVOKE EXECUTE ON FUNCTION deduct_quota(uuid, text, integer, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION deduct_quota(uuid, text, integer, text, jsonb) FROM anon;
GRANT  EXECUTE ON FUNCTION deduct_quota(uuid, text, integer, text, jsonb) TO authenticated;
GRANT  EXECUTE ON FUNCTION deduct_quota(uuid, text, integer, text, jsonb) TO service_role;


-- ── Fix 2b: refund_quota — restrict to service_role only ─────────────────────
-- refund_quota is called exclusively from createAdminClient() code (webhook +
-- admin panel). No authenticated server action calls it. Revoking from PUBLIC
-- also removes access from anon and authenticated (which inherit from PUBLIC),
-- so revoke all three explicitly and grant only to service_role.

REVOKE EXECUTE ON FUNCTION refund_quota(uuid, text, integer, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION refund_quota(uuid, text, integer, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION refund_quota(uuid, text, integer, text, jsonb) FROM authenticated;
GRANT  EXECUTE ON FUNCTION refund_quota(uuid, text, integer, text, jsonb) TO service_role;


-- ── Fix 3: drop unused feature_flags table ───────────────────────────────────
-- The table was seeded in the initial schema but is never read or written by
-- any app code. Plan and feature gating is done via user_subscriptions.plan.

DROP TABLE IF EXISTS feature_flags;
