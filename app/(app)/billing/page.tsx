import type { Metadata } from "next";
export const metadata: Metadata = { title: "Billing — Brainana" };

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { getLocale } from "@/utils/i18n";

const PLAN_ALLOWANCES = {
  free:  { chars: 0,        sessions: 0  },
  plus:  { chars: 150_000,  sessions: 20 },
  pro:   { chars: 600_000,  sessions: 60 },
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

export default async function BillingPage() {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
            {plan !== "pro" && (
              <Link
                href="/billing/upgrade"
                className="rounded-full bg-orange px-4 py-2 font-manrope text-sm font-[800] text-on-bright shadow-hard-red transition hover:opacity-90"
              >
                {b.upgrade}
              </Link>
            )}
          </div>
        </div>

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

        {/* Top-up packs */}
        <div className="rounded-lg border border-ink/10 bg-paper-2 p-6">
          <p className="mb-1 font-mono text-xs uppercase tracking-widest text-ink-3">{b.topUp}</p>

          {plan === "free" ? (
            <div className="mt-3 flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-ink/20 py-8 text-center">
              <p className="font-manrope text-sm font-[700] text-ink">{b.upgradeForTopUp}</p>
              <p className="font-manrope text-xs text-ink-3">{b.topUpPacksInfo}</p>
              <Link
                href="/billing/upgrade"
                className="mt-1 rounded-full bg-orange px-5 py-2 font-manrope text-sm font-[800] text-on-bright shadow-hard-red transition hover:opacity-90"
              >
                {b.upgradeNow}
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-4 font-manrope text-xs text-ink-3">{b.topUpDescription}</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "50K chars",    price: "$0.99" },
                  { label: "200K chars",   price: "$2.99" },
                  { label: "1M chars",     price: "$9.99" },
                  { label: "10 sessions",  price: "$0.99" },
                  { label: "30 sessions",  price: "$1.99" },
                  { label: "100 sessions", price: "$4.99" },
                ].map((pack) => (
                  <button
                    key={pack.label}
                    type="button"
                    disabled
                    className="flex items-center justify-between rounded-lg border border-ink/10 bg-paper px-4 py-3 opacity-60 cursor-not-allowed"
                  >
                    <span className="font-manrope text-sm font-[700] text-ink">{pack.label}</span>
                    <span className="font-manrope text-sm text-ink-3">{pack.price}</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 font-manrope text-xs text-ink-3 text-center">{b.paymentsComing}</p>
            </>
          )}
        </div>

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
