import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  verifyWebhookSignature,
  planFromProductId,
  PLAN_QUOTA,
  topupFromProductId,
} from "@/utils/polar";

export const runtime = "nodejs";

/** Normalize Polar status strings to our canonical DB values. */
function normalizeStatus(polarStatus: string | undefined): string {
  switch (polarStatus) {
    case "canceled":            return "cancelled";
    case "revoked":             return "expired";
    case "trialing":            return "trialing";
    case "past_due":            return "past_due";
    case "unpaid":              return "unpaid";
    case "incomplete":
    case "incomplete_expired":  return "past_due";
    default:                    return polarStatus ?? "active";
  }
}

function idempotencyError(error: { code?: string; message?: string } | null) {
  if (!error) return null;
  if (error.code === "23505") return "duplicate";
  console.error("[polar-webhook] Failed to claim event:", error.message ?? error);
  return NextResponse.json(
    {
      error: "Failed to claim webhook event",
      code: error.code ?? "unknown",
      message: error.message ?? "Unknown Supabase error",
    },
    { status: 500 },
  );
}

function webhookWriteError(action: string, error: { message?: string } | null) {
  if (!error) return null;
  console.error(`[polar-webhook] ${action}:`, error.message ?? error);
  return NextResponse.json({ error: action }, { status: 500 });
}

function getWebhookUserId(data: Record<string, unknown> | undefined) {
  const metadata = data?.metadata as Record<string, unknown> | undefined;
  const customer = data?.customer as Record<string, unknown> | undefined;
  const customerMetadata = customer?.metadata as Record<string, unknown> | undefined;
  return (
    (metadata?.user_id as string | undefined) ||
    (data?.external_customer_id as string | undefined) ||
    (customer?.external_id as string | undefined) ||
    (customerMetadata?.user_id as string | undefined)
  );
}

function getPolarProductId(data: Record<string, unknown>) {
  const product = data.product as Record<string, unknown> | undefined;
  const products = data.products as Record<string, unknown>[] | undefined;
  const items = data.items as Record<string, unknown>[] | undefined;
  const firstItem = items?.[0];
  const firstItemProduct = firstItem?.product as Record<string, unknown> | undefined;

  return (
    (data.product_id as string | undefined) ||
    (product?.id as string | undefined) ||
    (products?.[0]?.id as string | undefined) ||
    (firstItem?.product_id as string | undefined) ||
    (firstItemProduct?.id as string | undefined)
  );
}

function getTopUpEventKey(data: Record<string, unknown>) {
  const orderId = data.id as string | undefined;
  const checkoutId = data.checkout_id as string | undefined;
  const id = orderId || checkoutId;
  return id ? `topup:${orderId ? "order" : "checkout"}:${id}` : null;
}

/** Credit a paid top-up order, guarded by an idempotency key. */
async function fulfillOrder(
  supabase: ReturnType<typeof import("@/utils/supabase/admin").createAdminClient>,
  userId: string,
  data: Record<string, unknown>,
  eventType: string,
): Promise<NextResponse | null> {
  const productId = getPolarProductId(data);
  const pack = topupFromProductId(productId ?? "");
  if (!pack) return null;

  const eventKey = getTopUpEventKey(data);
  if (!eventKey) return NextResponse.json({ error: "Missing top-up event ID" }, { status: 400 });
  const orderId = data.id as string | undefined;
  const checkoutId = data.checkout_id as string | undefined;

  if (checkoutId) {
    const { data: existingCheckoutCredit, error } = await supabase
      .from("quota_transactions")
      .select("id")
      .eq("user_id", userId)
      .eq("reason", "purchase")
      .contains("metadata", { checkout_id: checkoutId })
      .limit(1)
      .maybeSingle();
    const errRes = webhookWriteError("Failed to verify top-up checkout credit", error);
    if (errRes) return errRes;
    if (existingCheckoutCredit) return null;
  }

  // Atomic idempotency: only one delivery wins the INSERT
  const { error: orderClaimErr } = await supabase
    .from("processed_billing_events")
    .insert({ provider: "polar", event_key: eventKey });
  const orderClaimResult = idempotencyError(orderClaimErr);
  let eventWasAlreadyClaimed = false;
  if (orderClaimResult === "duplicate") {
    eventWasAlreadyClaimed = true;
    const { data: existingCredit, error } = await supabase
      .from("quota_transactions")
      .select("id")
      .eq("user_id", userId)
      .eq("reason", "purchase")
      .contains("metadata", { event_key: eventKey })
      .limit(1)
      .maybeSingle();
    const errRes = webhookWriteError("Failed to verify top-up credit", error);
    if (errRes) return errRes;
    if (existingCredit) return null;
  } else if (orderClaimResult) {
    return orderClaimResult;
  }

  if (pack.chars > 0) {
    const { error } = await supabase.rpc("refund_quota", {
      p_user_id:          userId,
      p_resource:         "chars",
      p_requested_amount: pack.chars,
      p_reason:           "purchase",
      p_metadata:         { event_key: eventKey, order_id: orderId, checkout_id: checkoutId, pack: pack.label, event: eventType },
    });
    if (error) {
      console.error("[polar-webhook] Failed to credit char top-up:", error.message);
      if (!eventWasAlreadyClaimed) {
        await supabase.from("processed_billing_events").delete().eq("provider", "polar").eq("event_key", eventKey);
      }
      return NextResponse.json({ error: "Failed to credit top-up" }, { status: 500 });
    }
  }
  if (pack.sessions > 0) {
    const { error } = await supabase.rpc("refund_quota", {
      p_user_id:          userId,
      p_resource:         "tutor_sessions",
      p_requested_amount: pack.sessions,
      p_reason:           "purchase",
      p_metadata:         { event_key: eventKey, order_id: orderId, checkout_id: checkoutId, pack: pack.label, event: eventType },
    });
    if (error) {
      console.error("[polar-webhook] Failed to credit session top-up:", error.message);
      if (!eventWasAlreadyClaimed) {
        await supabase.from("processed_billing_events").delete().eq("provider", "polar").eq("event_key", eventKey);
      }
      return NextResponse.json({ error: "Failed to credit top-up" }, { status: 500 });
    }
  }
  return null;
}

async function applySubscriptionGrant({
  supabase,
  userId,
  productId,
  subscriptionId,
  customerId,
  periodEnd,
  status,
  eventType,
}: {
  supabase: ReturnType<typeof import("@/utils/supabase/admin").createAdminClient>;
  userId: string;
  productId: string | undefined;
  subscriptionId: string | undefined;
  customerId: string | undefined;
  periodEnd: string | undefined;
  status: string;
  eventType: string;
}): Promise<NextResponse | null> {
  if (!subscriptionId) return null;

  const plan = planFromProductId(productId ?? "");
  if (!plan) return null;

  const effectivePlan = status === "active" || status === "trialing" ? plan : "free";
  const effectiveQuota = PLAN_QUOTA[effectivePlan] ?? PLAN_QUOTA.free;
  const grantKey = `subscription:${subscriptionId}:${periodEnd ?? "none"}`;
  const { error: grantClaimErr } = await supabase
    .from("processed_billing_events")
    .insert({ provider: "polar", event_key: grantKey });
  const grantClaimResult = idempotencyError(grantClaimErr);

  if (grantClaimResult === "duplicate") {
    const { error } = await supabase
      .from("user_subscriptions")
      .upsert({
        user_id: userId,
        plan: effectivePlan,
        billing_customer_id:     customerId ?? "",
        billing_subscription_id: subscriptionId,
        subscription_status:     status,
        plan_expires_at:         periodEnd ?? null,
        updated_at:              new Date().toISOString(),
      }, { onConflict: "user_id" });
    const errRes = webhookWriteError("Failed to update duplicate subscription event", error);
    if (errRes) return errRes;
    return null;
  }
  if (grantClaimResult) return grantClaimResult;

  const { error: subscriptionUpdateError } = await supabase
    .from("user_subscriptions")
    .upsert({
      user_id: userId,
      plan:                    effectivePlan,
      billing_customer_id:     customerId ?? "",
      billing_subscription_id: subscriptionId,
      subscription_status:     status,
      chars_balance:           effectiveQuota.chars,
      tutor_sessions_balance:  effectiveQuota.sessions,
      plan_expires_at:         periodEnd ?? null,
      updated_at:              new Date().toISOString(),
    }, { onConflict: "user_id" });
  const subscriptionUpdateErrRes = webhookWriteError(
    "Failed to apply subscription grant",
    subscriptionUpdateError,
  );
  if (subscriptionUpdateErrRes) {
    await supabase.from("processed_billing_events").delete().eq("event_key", grantKey);
    return subscriptionUpdateErrRes;
  }

  const { error: quotaTxError } = await supabase.from("quota_transactions").insert([
    {
      user_id:  userId,
      resource: "chars",
      amount:   effectiveQuota.chars,
      reason:   "monthly_grant",
      metadata: { plan: effectivePlan, event: eventType, period_end: periodEnd },
    },
    {
      user_id:  userId,
      resource: "tutor_sessions",
      amount:   effectiveQuota.sessions,
      reason:   "monthly_grant",
      metadata: { plan: effectivePlan, event: eventType, period_end: periodEnd },
    },
  ]);
  const quotaTxErrRes = webhookWriteError("Failed to record subscription grant", quotaTxError);
  if (quotaTxErrRes) {
    await supabase.from("processed_billing_events").delete().eq("event_key", grantKey);
    return quotaTxErrRes;
  }

  return null;
}

export async function POST(req: NextRequest) {
  const webhookId        = req.headers.get("webhook-id") ?? "";
  const webhookTimestamp = req.headers.get("webhook-timestamp") ?? "";
  const webhookSignature = req.headers.get("webhook-signature") ?? "";
  const rawBody = await req.text();

  if (!verifyWebhookSignature(rawBody, webhookId, webhookTimestamp, webhookSignature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = payload.type as string | undefined;
  const data = payload.data as Record<string, unknown> | undefined;

  const userId = getWebhookUserId(data);
  if (!userId) {
    return NextResponse.json({ ok: true });
  }

  const supabase = createAdminClient();

  switch (eventType) {
    case "subscription.created":
    case "subscription.updated":
    case "subscription.active": {
      const productId      = data?.product_id as string | undefined;
      const subscriptionId = data?.id as string | undefined;
      const customerId     = data?.customer_id as string | undefined;
      const polarStatus    = data?.status as string | undefined;
      const periodEnd      = data?.current_period_end as string | undefined;
      const cancelAtEnd    = data?.cancel_at_period_end as boolean | undefined;

      // cancel_at_period_end=true: user cancelled but still active until period end
      if (cancelAtEnd) {
        const { error } = await supabase
          .from("user_subscriptions")
          .upsert({
            user_id: userId,
            billing_customer_id:     customerId ?? "",
            billing_subscription_id: subscriptionId ?? "",
            subscription_status:     "cancelled",
            plan_expires_at:         periodEnd ?? null,
            updated_at:              new Date().toISOString(),
          }, { onConflict: "user_id" });
        const errRes = webhookWriteError("Failed to mark subscription cancelled", error);
        if (errRes) return errRes;
        break;
      }

      const status = normalizeStatus(polarStatus);

      // Non-active statuses: update metadata only, no quota grant
      if (status === "cancelled" || status === "expired" || status === "past_due" || status === "unpaid") {
        const { error } = await supabase
          .from("user_subscriptions")
          .upsert({
            user_id: userId,
            billing_customer_id:     customerId ?? "",
            billing_subscription_id: subscriptionId ?? "",
            subscription_status:     status,
            plan_expires_at:         periodEnd ?? null,
            updated_at:              new Date().toISOString(),
          }, { onConflict: "user_id" });
        const errRes = webhookWriteError("Failed to update inactive subscription", error);
        if (errRes) return errRes;
        break;
      }

      const errRes = await applySubscriptionGrant({
        supabase,
        userId,
        productId,
        subscriptionId,
        customerId,
        periodEnd,
        status,
        eventType,
      });
      if (errRes) return errRes;
      break;
    }

    case "subscription.canceled": {
      const periodEnd      = data?.current_period_end as string | undefined;
      const subscriptionId = data?.id as string | undefined;
      const customerId     = data?.customer_id as string | undefined;
      const { error } = await supabase
        .from("user_subscriptions")
        .upsert({
          user_id: userId,
          billing_customer_id:     customerId ?? "",
          billing_subscription_id: subscriptionId ?? "",
          subscription_status:     "cancelled",
          plan_expires_at:         periodEnd ?? null,
          updated_at:              new Date().toISOString(),
        }, { onConflict: "user_id" });
      const errRes = webhookWriteError("Failed to handle subscription cancellation", error);
      if (errRes) return errRes;
      break;
    }

    case "subscription.revoked": {
      const { error } = await supabase
        .from("user_subscriptions")
        .upsert({
          user_id: userId,
          plan:                "free",
          subscription_status: "expired",
          chars_balance:          0,
          tutor_sessions_balance: 0,
          plan_expires_at:        null,
          updated_at:             new Date().toISOString(),
        }, { onConflict: "user_id" });
      const errRes = webhookWriteError("Failed to revoke subscription", error);
      if (errRes) return errRes;
      break;
    }

    // order.paid is the reliable fulfillment event for one-time purchases.
    // order.created may fire before payment is confirmed — skip it.
    case "order.paid": {
      if (!data) break;
      const errRes = await fulfillOrder(supabase, userId, data, eventType);
      if (errRes) return errRes;

      const subscription = data.subscription as Record<string, unknown> | undefined;
      const status = normalizeStatus(subscription?.status as string | undefined);
      const subscriptionErrRes = await applySubscriptionGrant({
        supabase,
        userId,
        productId: data.product_id as string | undefined,
        subscriptionId:
          (data.subscription_id as string | undefined) ||
          (subscription?.id as string | undefined),
        customerId: data.customer_id as string | undefined,
        periodEnd: subscription?.current_period_end as string | undefined,
        status,
        eventType,
      });
      if (subscriptionErrRes) return subscriptionErrRes;
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ ok: true });
}
