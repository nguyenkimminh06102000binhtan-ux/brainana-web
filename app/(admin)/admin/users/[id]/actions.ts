"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { refundQuota } from "@/utils/quota";
import type { QuotaResource, QuotaReason } from "@/utils/quota";
import { PLAN_QUOTA, nextQuotaResetAt } from "@/utils/polar";

/** Guard: only admins can call these actions */
async function requireAdmin() {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) throw new Error("Forbidden");
  return { adminId: user.id, supabase };
}

/** Grant quota to a user (admin_grant or compensation) */
export async function adminGrantQuota(formData: FormData) {
  await requireAdmin();

  const targetUserId = formData.get("user_id") as string;
  const resource     = formData.get("resource") as QuotaResource;
  const amount       = parseInt(formData.get("amount") as string);
  const reason       = (formData.get("reason") as QuotaReason) ?? "admin_grant";
  const note         = formData.get("note") as string;

  if (!targetUserId || !resource || !amount || amount <= 0) {
    throw new Error("Invalid form data");
  }

  const admin = createAdminClient();

  // Credit the balance
  const col = resource === "chars" ? "chars_balance" : "tutor_sessions_balance";
  const { data: sub } = await admin
    .from("user_subscriptions")
    .select(col)
    .eq("user_id", targetUserId)
    .single();

  if (!sub) throw new Error("User subscription not found");

  await admin
    .from("user_subscriptions")
    .update({ [col]: (sub[col as keyof typeof sub] as number) + amount })
    .eq("user_id", targetUserId);

  await admin.from("quota_transactions").insert({
    user_id:  targetUserId,
    resource,
    amount,
    reason,
    metadata: { note, granted_by: (await requireAdmin()).adminId },
  });

  redirect(`/admin/users/${targetUserId}`);
}

/** Refund quota to a user after a billing refund */
export async function adminRefundQuota(formData: FormData) {
  const { adminId } = await requireAdmin();

  const targetUserId = formData.get("user_id") as string;
  const resource     = formData.get("resource") as QuotaResource;
  const amount       = parseInt(formData.get("amount") as string);
  const reason       = (formData.get("reason") as QuotaReason) ?? "refund";
  const refundId     = formData.get("refund_id") as string | null;

  if (!targetUserId || !resource || !amount || amount <= 0) {
    throw new Error("Invalid form data");
  }

  const admin = createAdminClient();

  await refundQuota(admin, targetUserId, resource, amount, reason, {
    refund_id: refundId ?? undefined,
    granted_by: adminId,
  });

  redirect(`/admin/users/${targetUserId}`);
}

/** Override a user's plan, quota, expiry, and manual-subscription flag */
export async function adminSetPlan(formData: FormData) {
  const { adminId } = await requireAdmin();

  const targetUserId  = formData.get("user_id") as string;
  const plan          = formData.get("plan") as string;
  const expiresAtRaw  = (formData.get("expires_at") as string | null)?.trim() || null;
  const isManual      = formData.get("is_manual") === "on";

  if (!targetUserId || !["free", "plus", "pro"].includes(plan)) {
    throw new Error("Invalid form data");
  }

  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw).toISOString() : null;
  const quota     = PLAN_QUOTA[plan] ?? PLAN_QUOTA.free;
  const admin     = createAdminClient();

  await admin
    .from("user_subscriptions")
    .update({
      plan,
      chars_balance:             quota.chars,
      tutor_sessions_balance:    quota.sessions,
      quota_reset_at:            nextQuotaResetAt(),
      plan_expires_at:           expiresAt,
      is_manual_subscription:    isManual,
      subscription_status: plan === "free" ? "none" : "active",
      updated_at:                new Date().toISOString(),
    })
    .eq("user_id", targetUserId);

  // Log the quota grant so the transaction history reflects the change
  if (quota.chars > 0 || quota.sessions > 0) {
    const rows = [];
    if (quota.chars > 0)    rows.push({ user_id: targetUserId, resource: "chars",          amount: quota.chars,    reason: "admin_grant", metadata: { plan, granted_by: adminId, note: "plan override" } });
    if (quota.sessions > 0) rows.push({ user_id: targetUserId, resource: "tutor_sessions", amount: quota.sessions, reason: "admin_grant", metadata: { plan, granted_by: adminId, note: "plan override" } });
    await admin.from("quota_transactions").insert(rows);
  }

  redirect(`/admin/users/${targetUserId}`);
}
