"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import {
  createCheckout,
  PLAN_PRODUCT_IDS,
  PLAN_QUOTA,
  topupProductId,
  cancelPolarSubscription,
  updatePolarSubscriptionProduct,
  type BillingInterval,
  type PaidPlan,
} from "@/utils/polar";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Polar errors meaning the stored subscription can't be changed any more
 * (canceled, or gone — e.g. the customer was deleted). In that case we start a
 * fresh checkout instead of updating it in place.
 */
function isDeadSubscriptionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /AlreadyCanceledSubscription|ResourceNotFound|NotFound|"status":\s*404/i.test(message);
}

const PLAN_RANK = {
  free: 0,
  plus: 1,
  pro: 2,
} as const;

export async function startCheckout(plan: PaidPlan, interval: BillingInterval = "monthly") {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const productId = PLAN_PRODUCT_IDS[plan]?.[interval];
  if (!productId) throw new Error(`No product ID configured for plan: ${plan} (${interval})`);

  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("plan, billing_subscription_id, subscription_status")
    .eq("user_id", user.id)
    .single();

  const currentPlan = ((sub?.plan as string | null) ?? "free") as keyof typeof PLAN_RANK;
  if ((PLAN_RANK[currentPlan] ?? 0) >= PLAN_RANK[plan]) {
    redirect("/billing");
  }

  const currentSubscriptionId = sub?.billing_subscription_id as string | null | undefined;
  const currentStatus = sub?.subscription_status as string | null | undefined;
  const hasActiveSubscription =
    currentSubscriptionId &&
    currentPlan !== "free" &&
    currentStatus !== "expired" &&
    currentStatus !== "unpaid" &&
    // Polar refuses to change a subscription that is canceled (even if it is
    // still running until period end) — those users get a new checkout.
    currentStatus !== "cancelled" &&
    currentStatus !== "canceled";

  let updated: Awaited<ReturnType<typeof updatePolarSubscriptionProduct>> = null;
  if (hasActiveSubscription) {
    let subscriptionIsDead = false;
    try {
      updated = await updatePolarSubscriptionProduct({
        subscriptionId: currentSubscriptionId,
        productId,
        prorationBehavior: "invoice",
      });
    } catch (error) {
      if (!isDeadSubscriptionError(error)) throw error;
      subscriptionIsDead = true;
      console.warn("[billing] Stored subscription is no longer updatable; starting a new checkout:", currentSubscriptionId);
    }
    if (!updated && !subscriptionIsDead) throw new Error("Polar did not return an updated subscription");
  }

  if (updated) {
    const admin = createAdminClient();
    const currentQuota = PLAN_QUOTA[currentPlan] ?? PLAN_QUOTA.free;
    const nextQuota = PLAN_QUOTA[plan];
    const charsDelta = Math.max(0, nextQuota.chars - currentQuota.chars);
    const sessionsDelta = Math.max(0, nextQuota.sessions - currentQuota.sessions);
    const eventKey = `plan-change:${updated.id}:${currentPlan}:${plan}:${updated.periodEnd ?? "none"}`;
    const { error: claimError } = await admin
      .from("processed_billing_events")
      .insert({ provider: "polar", event_key: eventKey });
    if (claimError && claimError.code !== "23505") {
      throw new Error(`Failed to claim plan change: ${claimError.message}`);
    }

    const shouldGrantDelta = !claimError;
    if (shouldGrantDelta && charsDelta > 0) {
      const { error } = await admin.rpc("refund_quota", {
        p_user_id: user.id,
        p_resource: "chars",
        p_requested_amount: charsDelta,
        p_reason: "monthly_grant",
        p_metadata: {
          event_key: eventKey,
          from_plan: currentPlan,
          to_plan: plan,
          type: "plan_change",
        },
      });
      if (error) throw new Error(`Failed to grant upgraded character quota: ${error.message}`);
    }

    if (shouldGrantDelta && sessionsDelta > 0) {
      const { error } = await admin.rpc("refund_quota", {
        p_user_id: user.id,
        p_resource: "tutor_sessions",
        p_requested_amount: sessionsDelta,
        p_reason: "monthly_grant",
        p_metadata: {
          event_key: eventKey,
          from_plan: currentPlan,
          to_plan: plan,
          type: "plan_change",
        },
      });
      if (error) throw new Error(`Failed to grant upgraded tutor sessions: ${error.message}`);
    }

    const { error: updateError } = await admin
      .from("user_subscriptions")
      .upsert({
        user_id: user.id,
        plan,
        billing_customer_id: updated.customerId,
        billing_subscription_id: updated.id,
        subscription_status: updated.status,
        plan_expires_at: updated.periodEnd,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    if (updateError) throw new Error(`Failed to update local subscription: ${updateError.message}`);

    redirect("/billing?upgraded=1");
  }

  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const redirectUrl = `${origin}/billing?upgraded=1&checkout_id={CHECKOUT_ID}`;

  const checkoutUrl = await createCheckout({
    productId,
    email: user.email ?? "",
    userId: user.id,
    redirectUrl,
    metadata: { provider: "polar", kind: "subscription", plan, interval },
  });

  redirect(checkoutUrl);
}

export async function startTopUpCheckout(packKey: string) {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const productId = topupProductId(packKey);
  if (!productId) throw new Error(`No product ID configured for top-up pack: ${packKey}`);

  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const redirectUrl = `${origin}/billing?topup=1&checkout_id={CHECKOUT_ID}`;

  const checkoutUrl = await createCheckout({
    productId,
    email: user.email ?? "",
    userId: user.id,
    redirectUrl,
    metadata: { provider: "polar", kind: "topup", key: packKey },
  });

  redirect(checkoutUrl);
}

export async function cancelSubscription() {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("billing_subscription_id")
    .eq("user_id", user.id)
    .single();

  const subscriptionId = sub?.billing_subscription_id;
  if (!subscriptionId) throw new Error("No active subscription found");

  const ok = await cancelPolarSubscription(subscriptionId);
  if (!ok) throw new Error("Failed to cancel subscription — please try again or contact support");

  // Write cancelled status immediately so the billing page shows the correct UI
  // before the webhook arrives.
  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from("user_subscriptions")
    .update({ subscription_status: "cancelled" })
    .eq("user_id", user.id);
  if (updateError) throw new Error(`Failed to update subscription status: ${updateError.message}`);

  redirect("/billing?cancelled=1");
}
