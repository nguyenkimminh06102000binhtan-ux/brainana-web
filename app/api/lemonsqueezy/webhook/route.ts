import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { verifyWebhookSignature, planFromVariantId, PLAN_QUOTA, topupFromVariantId } from "@/utils/lemonsqueezy";

export const runtime = "nodejs";

function idempotencyError(error: { code?: string; message?: string } | null) {
  if (!error) return null;
  if (error.code === "23505") return "duplicate";
  console.error("[lemonsqueezy-webhook] Failed to claim event:", error.message ?? error);
  return NextResponse.json({ error: "Failed to claim webhook event" }, { status: 500 });
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-signature") ?? "";
  const rawBody = await req.text();

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventName = payload.meta && (payload.meta as Record<string, unknown>).event_name as string;
  const data = payload.data as Record<string, unknown> | undefined;
  const attrs = data?.attributes as Record<string, unknown> | undefined;
  const customData = (payload.meta as Record<string, unknown>)?.custom_data as Record<string, unknown> | undefined;

  const userId = customData?.user_id as string | undefined;
  if (!userId) {
    // Some events (order_created for top-ups) may not carry user_id — skip gracefully
    return NextResponse.json({ ok: true });
  }

  const supabase = createAdminClient();

  switch (eventName) {
    case "subscription_created":
    case "subscription_updated":
    case "subscription_resumed": {
      const variantId = attrs?.variant_id;
      const lemonCustomerId     = attrs?.customer_id;
      const lemonSubscriptionId = data?.id;
      const status = attrs?.status as string | undefined;

      const renewsAt = attrs?.renews_at as string | undefined;
      const endsAt   = attrs?.ends_at   as string | undefined;

      // When a subscription is cancelled, LS also fires subscription_updated with
      // status "cancelled". Don't zero quota here — let subscription_cancelled /
      // subscription_expired handle that so users keep their balance until period end.
      if (status === "cancelled" || status === "expired") {
        await supabase
          .from("user_subscriptions")
          .update({
            lemon_customer_id:          String(lemonCustomerId ?? ""),
            lemon_subscription_id:      String(lemonSubscriptionId ?? ""),
            lemon_subscription_status:  status,
            plan_expires_at: endsAt ?? renewsAt ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
        break;
      }

      const plan = planFromVariantId(String(variantId)) ?? "free";
      const effectivePlan = (status === "active" || status === "on_trial") ? plan : "free";
      const effectiveQuota = PLAN_QUOTA[effectivePlan] ?? PLAN_QUOTA.free;

      await supabase
        .from("user_subscriptions")
        .update({
          plan: effectivePlan,
          lemon_customer_id:          String(lemonCustomerId ?? ""),
          lemon_subscription_id:      String(lemonSubscriptionId ?? ""),
          lemon_subscription_status:  status ?? "active",
          chars_balance:          effectiveQuota.chars,
          tutor_sessions_balance: effectiveQuota.sessions,
          plan_expires_at: endsAt ?? renewsAt ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      await supabase.from("quota_transactions").insert([
        {
          user_id:  userId,
          resource: "chars",
          amount:   effectiveQuota.chars,
          reason:   "monthly_grant",
          metadata: { plan: effectivePlan, event: eventName },
        },
        {
          user_id:  userId,
          resource: "tutor_sessions",
          amount:   effectiveQuota.sessions,
          reason:   "monthly_grant",
          metadata: { plan: effectivePlan, event: eventName },
        },
      ]);
      break;
    }

    case "subscription_cancelled": {
      // Subscription will expire at end of period — keep quota, just mark status
      const endsAt = attrs?.ends_at as string | undefined;
      await supabase
        .from("user_subscriptions")
        .update({
          lemon_subscription_status: "cancelled",
          plan_expires_at: endsAt ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      break;
    }

    case "subscription_expired": {
      // Billing period ended — downgrade to free with zero quota
      await supabase
        .from("user_subscriptions")
        .update({
          plan:                      "free",
          lemon_subscription_status: "expired",
          chars_balance:          0,
          tutor_sessions_balance: 0,
          plan_expires_at:        null,
          updated_at:             new Date().toISOString(),
        })
        .eq("user_id", userId);
      break;
    }

    case "subscription_payment_success": {
      // Monthly renewal — refresh quota to full plan allowance and reset status
      const lemonSubscriptionId = attrs?.subscription_id;
      const { data: sub } = await supabase
        .from("user_subscriptions")
        .select("plan")
        .eq("lemon_subscription_id", String(lemonSubscriptionId ?? ""))
        .single();

      const plan = sub?.plan ?? "free";
      const quota = PLAN_QUOTA[plan] ?? PLAN_QUOTA.free;
      const renewsAt = attrs?.renews_at as string | undefined;

      // Atomic idempotency: INSERT the unique event key first.
      // If it already exists (unique violation = 23505), this is a duplicate delivery.
      const renewalKey = `renewal:${String(lemonSubscriptionId ?? "")}:${renewsAt ?? ""}`;
      const { error: renewalClaimErr } = await supabase
        .from("processed_lemon_events")
        .insert({ event_key: renewalKey });
      const renewalClaimResult = idempotencyError(renewalClaimErr);
      if (renewalClaimResult === "duplicate") break;
      if (renewalClaimResult) return renewalClaimResult;

      const { error: renewalUpdateError } = await supabase
        .from("user_subscriptions")
        .update({
          lemon_subscription_status: "active",
          chars_balance:          quota.chars,
          tutor_sessions_balance: quota.sessions,
          plan_expires_at:        renewsAt ?? null,
          updated_at:             new Date().toISOString(),
        })
        .eq("user_id", userId);
      if (renewalUpdateError) {
        console.error("[lemonsqueezy-webhook] Failed to apply renewal:", renewalUpdateError.message);
        await supabase.from("processed_lemon_events").delete().eq("event_key", renewalKey);
        return NextResponse.json({ error: "Failed to apply renewal" }, { status: 500 });
      }

      const { error: renewalTxError } = await supabase.from("quota_transactions").insert([
        { user_id: userId, resource: "chars",          amount: quota.chars,    reason: "monthly_grant", metadata: { plan, event: eventName } },
        { user_id: userId, resource: "tutor_sessions", amount: quota.sessions, reason: "monthly_grant", metadata: { plan, event: eventName } },
      ]);
      if (renewalTxError) {
        console.error("[lemonsqueezy-webhook] Failed to log renewal:", renewalTxError.message);
        await supabase.from("processed_lemon_events").delete().eq("event_key", renewalKey);
        return NextResponse.json({ error: "Failed to log renewal" }, { status: 500 });
      }
      break;
    }

    case "order_created": {
      // One-time top-up purchase — only process paid orders
      if (attrs?.status !== "paid") break;

      const firstOrderItem = attrs?.first_order_item as Record<string, unknown> | undefined;
      const variantId = String(firstOrderItem?.variant_id ?? "");

      const pack = topupFromVariantId(variantId);
      if (!pack) break;

      const lsOrderId = String(data?.id ?? "");

      // Atomic idempotency: INSERT event key before crediting quota.
      // Concurrent retries both attempt the INSERT; only one wins.
      const { error: orderClaimErr } = await supabase
        .from("processed_lemon_events")
        .insert({ event_key: `order:${lsOrderId}` });
      const orderClaimResult = idempotencyError(orderClaimErr);
      if (orderClaimResult === "duplicate") break;
      if (orderClaimResult) return orderClaimResult;

      if (pack.chars > 0) {
        const { error: charsCreditError } = await supabase.rpc("refund_quota", {
          p_user_id:          userId,
          p_resource:         "chars",
          p_requested_amount: pack.chars,
          p_reason:           "purchase",
          p_metadata:         { lemon_order_id: lsOrderId, pack: pack.label, event: eventName },
        });
        if (charsCreditError) {
          console.error("[lemonsqueezy-webhook] Failed to credit character top-up:", charsCreditError.message);
          await supabase.from("processed_lemon_events").delete().eq("event_key", `order:${lsOrderId}`);
          return NextResponse.json({ error: "Failed to credit top-up" }, { status: 500 });
        }
      }
      if (pack.sessions > 0) {
        const { error: sessionsCreditError } = await supabase.rpc("refund_quota", {
          p_user_id:          userId,
          p_resource:         "tutor_sessions",
          p_requested_amount: pack.sessions,
          p_reason:           "purchase",
          p_metadata:         { lemon_order_id: lsOrderId, pack: pack.label, event: eventName },
        });
        if (sessionsCreditError) {
          console.error("[lemonsqueezy-webhook] Failed to credit session top-up:", sessionsCreditError.message);
          await supabase.from("processed_lemon_events").delete().eq("event_key", `order:${lsOrderId}`);
          return NextResponse.json({ error: "Failed to credit top-up" }, { status: 500 });
        }
      }
      break;
    }

    default:
      // Unhandled event — acknowledge and ignore
      break;
  }

  return NextResponse.json({ ok: true });
}
