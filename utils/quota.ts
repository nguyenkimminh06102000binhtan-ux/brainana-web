import type { SupabaseClient } from "@supabase/supabase-js";

export type QuotaResource = "chars" | "tutor_sessions";
export type QuotaReason =
  | "monthly_grant"
  | "purchase"
  | "usage"
  | "refund"
  | "chargeback"
  | "admin_grant"
  | "compensation";

export interface QuotaBalance {
  plan: string;
  chars_balance: number;
  tutor_sessions_balance: number;
}

/**
 * Refill the user's monthly AI-character allowance if their reset date has
 * passed. Call before reading chars_balance for display; deduct_quota() already
 * does this itself. Failures are logged, not thrown — a stale balance is
 * better than a broken page.
 */
export async function refreshQuotaIfDue(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase.rpc("refresh_quota_if_due", { p_user_id: userId });
  if (error) console.error("[quota] refreshQuotaIfDue error:", error.message);
}

/** Fetch a user's current quota balance and plan */
export async function getQuotaBalance(
  supabase: SupabaseClient,
  userId: string,
): Promise<QuotaBalance | null> {
  await refreshQuotaIfDue(supabase, userId);
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("plan, chars_balance, tutor_sessions_balance")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return data as QuotaBalance;
}

/**
 * Atomically deduct quota from a user's balance.
 * Returns true if successful, false if insufficient balance.
 */
export async function deductQuota(
  supabase: SupabaseClient,
  userId: string,
  resource: QuotaResource,
  amount: number,
  metadata?: Record<string, unknown>,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("deduct_quota", {
    p_user_id:  userId,
    p_resource: resource,
    p_amount:   amount,
    p_reason:   "usage",
    p_metadata: metadata ?? null,
  });

  if (error) {
    console.error("[quota] deductQuota error:", error.message);
    return false;
  }
  return data === true;
}

/**
 * Refund quota back to a user's balance.
 * Returns the actual amount refunded.
 */
export async function refundQuota(
  supabase: SupabaseClient,
  userId: string,
  resource: QuotaResource,
  amount: number,
  reason: QuotaReason = "refund",
  metadata?: Record<string, unknown>,
): Promise<number> {
  const { data, error } = await supabase.rpc("refund_quota", {
    p_user_id:          userId,
    p_resource:         resource,
    p_requested_amount: amount,
    p_reason:           reason,
    p_metadata:         metadata ?? null,
  });

  if (error) {
    console.error("[quota] refundQuota error:", error.message);
    return 0;
  }
  return data as number;
}

// ── Quota costs per feature ───────────────────────────────────────────────────

/** Characters consumed by AI features — based on input text length */
export function aiCharCost(text: string): number {
  return text.trim().length;
}

/** Characters consumed by TTS — based on synthesized text length */
export function ttsCharCost(text: string): number {
  return text.trim().length;
}
