import type { Metadata } from "next";
export const metadata: Metadata = { title: "Billing — Brainana" };

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { getLocale } from "@/utils/i18n";
// Set to true to re-enable top-up pack purchasing
const TOPUP_ENABLED = false;

import { startTopUpCheckout } from "@/app/actions/billing";
import {
  TOPUP_PACKS,
  getSubscriptionUrls,
  fetchCompletedCheckout,
  fetchCompletedTopUpCheckout,
  planFromProductId,
  PLAN_QUOTA,
  topupFromProductId,
} from "@/utils/polar";
import { createAdminClient } from "@/utils/supabase/admin";
import { CancelSubscriptionButton } from "./CancelSubscriptionButton";

const PLAN_ALLOWANCES = {
  free:  { chars: 0,        sessions: 0  },
  plus:  { chars: 300_000,  sessions: 30 },
  pro:   { chars: 900_000,  sessions: 90 },
} as const;

const PLAN_LABELS = {
  free: { label: "Free",  color: "bg-ink/10 text-ink-2" },
  plus: { label: "Plus",  color: "bg-blue/20 text-blue" },
  pro:  { label: "Pro",   color: "bg-orange/20 text-orange" },
} as const;

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function BalanceBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-ink/10">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // When Polar redirects back after checkout it appends ?checkout_id=...
  // Sync the subscription directly from the Polar API so the page reflects
  // the new plan immediately, before any webhook arrives.
  if (params.topup === "1" && params.checkout_id) {
    const checkout = await fetchCompletedTopUpCheckout(params.checkout_id);
    if (checkout && checkout.userId === user.id) {
      const pack = topupFromProductId(checkout.productId);
      if (pack) {
        const admin = createAdminClient();
        const eventKey = checkout.orderId
          ? `topup:order:${checkout.orderId}`
          : `topup:checkout:${checkout.checkoutId}`;
        const { data: existingCredit, error: existingCreditErr } = await admin
          .from("quota_transactions")
          .select("id")
          .eq("user_id", user.id)
          .eq("reason", "purchase")
          .contains("metadata", { checkout_id: checkout.checkoutId })
          .limit(1)
          .maybeSingle();
        if (existingCreditErr) {
          throw new Error(`Failed to verify top-up credit: ${existingCreditErr.message}`);
        }

        if (!existingCredit) {
          const { error: topUpClaimErr } = await admin
            .from("processed_billing_events")
            .insert({ provider: "polar", event_key: eventKey });
          if (topUpClaimErr && topUpClaimErr.code !== "23505") {
            throw new Error(`Failed to claim top-up sync event: ${topUpClaimErr.message}`);
          }
          const topUpWasAlreadyClaimed = topUpClaimErr?.code === "23505";

          const metadata = {
            event_key: eventKey,
            order_id: checkout.orderId,
            checkout_id: checkout.checkoutId,
            pack: pack.label,
            event: "checkout_return",
          };

          if (pack.chars > 0) {
            const { error } = await admin.rpc("refund_quota", {
              p_user_id: user.id,
              p_resource: "chars",
              p_requested_amount: pack.chars,
              p_reason: "purchase",
              p_metadata: metadata,
            });
            if (error) {
              if (!topUpWasAlreadyClaimed) {
                await admin
                  .from("processed_billing_events")
                  .delete()
                  .eq("provider", "polar")
                  .eq("event_key", eventKey);
              }
              throw new Error(`Failed to credit character top-up: ${error.message}`);
            }
          }

          if (pack.sessions > 0) {
            const { error } = await admin.rpc("refund_quota", {
              p_user_id: user.id,
              p_resource: "tutor_sessions",
              p_requested_amount: pack.sessions,
              p_reason: "purchase",
              p_metadata: metadata,
            });
            if (error) {
              if (!topUpWasAlreadyClaimed) {
                await admin
                  .from("processed_billing_events")
                  .delete()
                  .eq("provider", "polar")
                  .eq("event_key", eventKey);
              }
              throw new Error(`Failed to credit session top-up: ${error.message}`);
            }
          }
        }
      }
    }
  }

  if (params.upgraded === "1" && params.checkout_id) {
    const checkout = await fetchCompletedCheckout(params.checkout_id);
    if (checkout && checkout.userId === user.id) {
      const plan = planFromProductId(checkout.productId);
      if (plan) {
        const status =
          checkout.status === "trialing" || checkout.status === "active"
            ? checkout.status
            : "active";
        const quota = PLAN_QUOTA[plan] ?? PLAN_QUOTA.free;
        const admin = createAdminClient();
        const grantKey = `subscription:${checkout.subscriptionId}:${checkout.periodEnd ?? "none"}`;
        const { error: grantClaimErr } = await admin
          .from("processed_billing_events")
          .insert({ provider: "polar", event_key: grantKey });
        if (grantClaimErr && grantClaimErr.code !== "23505") {
          throw new Error(`Failed to claim billing sync event: ${grantClaimErr.message}`);
        }
        const shouldGrantQuota = !grantClaimErr;

        const subscriptionUpdate: Record<string, unknown> = {
          user_id: user.id,
          plan,
          billing_customer_id:     checkout.customerId,
          billing_subscription_id: checkout.subscriptionId,
          subscription_status:     status,
          plan_expires_at:         checkout.periodEnd ?? null,
          updated_at:              new Date().toISOString(),
        };
        if (shouldGrantQuota) {
          subscriptionUpdate.chars_balance = quota.chars;
          subscriptionUpdate.tutor_sessions_balance = quota.sessions;
        }

        const { error: subscriptionUpdateErr } = await admin
          .from("user_subscriptions")
          .upsert(subscriptionUpdate, { onConflict: "user_id" });
        if (subscriptionUpdateErr) {
          throw new Error(`Failed to sync Polar subscription: ${subscriptionUpdateErr.message}`);
        }

        if (shouldGrantQuota) {
          const { error: quotaTxErr } = await admin.from("quota_transactions").insert([
            {
              user_id: user.id,
              resource: "chars",
              amount: quota.chars,
              reason: "monthly_grant",
              metadata: { plan, event: "checkout_return", period_end: checkout.periodEnd },
            },
            {
              user_id: user.id,
              resource: "tutor_sessions",
              amount: quota.sessions,
              reason: "monthly_grant",
              metadata: { plan, event: "checkout_return", period_end: checkout.periodEnd },
            },
          ]);
          if (quotaTxErr) {
            throw new Error(`Failed to record Polar quota grant: ${quotaTxErr.message}`);
          }
        }
      }
    }
  }

  const [{ data: sub }, { data: transactions }, { data: profile }] = await Promise.all([
    supabase.from("user_subscriptions").select("*").eq("user_id", user.id).single(),
    supabase.from("quota_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("profiles").select("active_origin_language").eq("id", user.id).single(),
  ]);

  const loc = getLocale((profile?.active_origin_language as string | null) ?? null);
  const b = loc.billing;

  const plan = (sub?.plan ?? "free") as "free" | "plus" | "pro";
  const allowance = PLAN_ALLOWANCES[plan];
  const planMeta  = PLAN_LABELS[plan];

  const charsBalance   = sub?.chars_balance ?? 0;
  const sessionsBalance = sub?.tutor_sessions_balance ?? 0;

  // isCancelled: DB is authoritative once the webhook fires; ?cancelled=1 covers
  // the window between the server action redirect and the webhook arriving.
  const isCancelled =
    sub?.subscription_status === "cancelled" ||
    sub?.subscription_status === "canceled" ||
    params.cancelled === "1";

  const portalUrls = plan !== "free" && sub?.billing_subscription_id && !isCancelled
    ? await getSubscriptionUrls(sub.billing_subscription_id)
    : null;
  const characterTopUps = Object.entries(TOPUP_PACKS).filter(([, pack]) => pack.chars > 0);
  const sessionTopUps = Object.entries(TOPUP_PACKS).filter(([, pack]) => pack.sessions > 0);

  const topUpSection = !TOPUP_ENABLED ? null : (
    <div className="rounded-lg border border-ink/10 bg-paper-2 p-6">
      <p className="mb-1 font-mono text-xs uppercase tracking-widest text-ink-3">{b.topUp}</p>
      {plan === "free" ? (
        <div className="mt-3 flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-ink/20 py-8 text-center">
          <p className="font-manrope text-sm font-[700] text-ink">{b.upgradeForTopUp}</p>
          <p className="font-manrope text-xs text-ink-3">{b.topUpPacksInfo}</p>
          <Link href="/billing/upgrade" className="mt-1 rounded-full bg-orange px-5 py-2 font-manrope text-sm font-[800] text-on-bright shadow-hard-red transition hover:opacity-90">
            {b.upgradeNow}
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-5 rounded-lg border border-orange/30 bg-orange/5 px-4 py-3">
            <p className="font-manrope text-sm font-[700] text-ink">Top-ups are one-time boosts for this billing period</p>
            <p className="mt-1 font-manrope text-xs leading-relaxed text-ink-2">
              They do <span className="font-[700]">not</span> renew and unused balance resets on your next billing date.
              If you need this amount regularly, Pro is the better value.
              {sub?.plan_expires_at && (
                <> Your current period ends on <span className="font-[700]">{new Date(sub.plan_expires_at as string).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>.</>
              )}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { title: "AI characters", packs: characterTopUps },
              { title: "AI tutor sessions", packs: sessionTopUps },
            ].map((group) => (
              <div key={group.title} className="flex flex-col gap-3">
                <p className="font-mono text-xs uppercase tracking-widest text-ink-3">{group.title}</p>
                {group.packs.map(([key, pack]) => (
                  <form key={key} action={startTopUpCheckout.bind(null, key)}>
                    <button type="submit" className="flex w-full flex-col rounded-lg border border-ink/10 bg-paper px-4 py-3 text-left transition hover:border-orange hover:bg-orange/5 active:translate-y-[1px]">
                      <div className="flex w-full items-center justify-between gap-3">
                        <span className="font-manrope text-sm font-[700] text-ink">{pack.label}</span>
                        <span className="shrink-0 font-manrope text-sm font-[700] text-ink">{pack.price}</span>
                      </div>
                      <span className="mt-1 font-manrope text-[10px] text-ink-3">Expires at renewal</span>
                    </button>
                  </form>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">

      {/* Header */}
      <div className="mb-8">
        <Link href="/settings" className="mb-4 inline-block font-manrope text-sm text-ink-3 hover:text-ink">{b.backToSettings}</Link>
        <h1 className="font-fredoka text-3xl font-[600] text-ink">{b.title}</h1>
      </div>

      <div className="flex flex-col gap-6">

        {/* Current plan */}
        <div className="rounded-lg border border-ink/10 bg-paper-2 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-ink-3">{b.currentPlan}</p>
              <div className="mt-2 flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 font-manrope text-sm font-[700] ${planMeta.color}`}>
                  {planMeta.label}
                </span>
                {sub?.plan_expires_at && (
                  <span className="font-manrope text-xs text-ink-3">
                    {b.renews.replace("{date}", new Date(sub.plan_expires_at).toLocaleDateString())}
                  </span>
                )}
              </div>
            </div>
            {plan !== "pro" && !isCancelled && (
              <Link
                href="/billing/upgrade"
                className="rounded-full bg-orange px-4 py-2 font-manrope text-sm font-[800] text-on-bright shadow-hard-red transition hover:opacity-90"
              >
                {b.upgrade}
              </Link>
            )}
          </div>
        </div>

        {/* Subscription management — only shown for paid plans */}
        {plan !== "free" && (
          <div className="rounded-lg border border-ink/10 bg-paper-2 p-6">
            <p className="mb-4 font-mono text-xs uppercase tracking-widest text-ink-3">Manage subscription</p>

            {isCancelled ? (
              /* Post-cancellation notice */
              <div className="rounded-lg border border-orange/30 bg-orange/5 px-4 py-4">
                <p className="font-manrope text-sm font-[700] text-ink">Subscription cancelled</p>
                <p className="mt-1 font-manrope text-xs leading-relaxed text-ink-2">
                  Your subscription has been cancelled.
                  {sub?.plan_expires_at ? (
                    <> You still have full access until{" "}
                      <span className="font-[700]">
                        {new Date(sub.plan_expires_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </span>
                      . After that, your character and session balance resets to 0 and your account reverts to Free.
                    </>
                  ) : (
                    <> Your access will continue until the end of your current billing period, then your account reverts to Free.</>
                  )}
                </p>
                <Link
                  href="/billing/upgrade"
                  className="mt-3 inline-block rounded-full bg-orange px-4 py-2 font-manrope text-sm font-[800] text-on-bright shadow-hard-red transition hover:opacity-90"
                >
                  Resubscribe
                </Link>
              </div>
            ) : (
              /* Active subscription controls */
              <div className="flex flex-col gap-3">
                {portalUrls?.updatePaymentMethod && (
                  <a
                    href={portalUrls.updatePaymentMethod}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg border border-ink/10 bg-paper px-4 py-3 transition hover:border-ink/30 hover:bg-paper-3"
                  >
                    <div>
                      <p className="font-manrope text-sm font-[700] text-ink">Payment method</p>
                      <p className="font-manrope text-xs text-ink-3">Update or change your card</p>
                    </div>
                    <span className="font-manrope text-xs text-ink-3">→</span>
                  </a>
                )}
                <CancelSubscriptionButton expiresAt={sub?.plan_expires_at ?? null} />
              </div>
            )}
          </div>
        )}

        {/* Usage */}
        <div className="rounded-lg border border-ink/10 bg-paper-2 p-6">
          <p className="mb-5 font-mono text-xs uppercase tracking-widest text-ink-3">{b.usage}</p>

          {/* Characters */}
          <div className="mb-6">
            <div className="mb-2 flex items-end justify-between">
              <div>
                <p className="font-manrope text-sm font-[700] text-ink">{b.characters}</p>
                <p className="font-manrope text-xs text-ink-3">{b.charactersDescription}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-[700] text-ink">{fmt(charsBalance)}</p>
                <p className="font-mono text-xs text-ink-3">{b.quota.replace("{max}", fmt(allowance.chars))}</p>
              </div>
            </div>
            <BalanceBar
              value={charsBalance}
              max={allowance.chars}
              color={charsBalance < allowance.chars * 0.2 ? "bg-orange" : "bg-blue"}
            />
            {charsBalance < allowance.chars * 0.1 && (
              <p className="mt-1.5 font-manrope text-xs text-orange">{b.runningLow}</p>
            )}
          </div>

          {/* Tutor sessions */}
          <div>
            <div className="mb-2 flex items-end justify-between">
              <div>
                <p className="font-manrope text-sm font-[700] text-ink">{b.tutorSessions}</p>
                <p className="font-manrope text-xs text-ink-3">{b.tutorSessionsDescription}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-[700] text-ink">{sessionsBalance}</p>
                <p className="font-mono text-xs text-ink-3">{b.quota.replace("{max}", String(allowance.sessions))}</p>
              </div>
            </div>
            <BalanceBar
              value={sessionsBalance}
              max={allowance.sessions}
              color={sessionsBalance < allowance.sessions * 0.2 ? "bg-orange" : "bg-blue"}
            />
            {sessionsBalance === 0 && (
              <p className="mt-1.5 font-manrope text-xs text-orange">{b.noSessionsLeft}</p>
            )}
          </div>
        </div>

        {/* Top-up packs — hidden until TOPUP_ENABLED is set to true */}
        {topUpSection}

        {/* Transaction history */}
        <div className="rounded-lg border border-ink/10 bg-paper-2 p-6">
          <p className="mb-4 font-mono text-xs uppercase tracking-widest text-ink-3">{b.transactionHistory}</p>
          {(transactions ?? []).length === 0 ? (
            <p className="font-manrope text-sm text-ink-3">{b.noTransactions}</p>
          ) : (
            <div className="flex flex-col divide-y divide-ink/5">
              {(transactions ?? []).map((tx) => {
                const isCredit = tx.amount > 0;
                const reasonLabel: Record<string, string> = {
                  monthly_grant: b.txMonthlyGrant,
                  purchase:      b.txPurchase,
                  usage:         b.txUsage,
                  refund:        b.txRefund,
                  chargeback:    b.txChargeback,
                  admin_grant:   b.txAdminGrant,
                  compensation:  b.txAdminGrant,
                };
                return (
                  <div key={tx.id} className="flex items-center gap-3 py-3">
                    <span className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-xs font-[700] ${
                      isCredit ? "bg-green-100 text-green-700" : "bg-ink/10 text-ink-2"
                    }`}>
                      {isCredit ? "+" : ""}{fmt(tx.amount)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-manrope text-sm text-ink">{reasonLabel[tx.reason] ?? tx.reason}</p>
                      <p className="font-mono text-xs text-ink-3">{tx.resource}</p>
                    </div>
                    <span className="shrink-0 font-mono text-xs text-ink-3">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
