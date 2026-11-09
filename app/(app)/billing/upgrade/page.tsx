import type { Metadata } from "next";
export const metadata: Metadata = { title: "Upgrade — Brainana" };

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { startCheckout } from "@/app/actions/billing";
import { PLAN_PRICES } from "@/utils/polar";

const AI_CHARACTER_USES = [
  "Generate answer/back cards",
  "Auto text-to-speech audio",
  "Romanization",
  "Example sentences",
  "Pronunciation",
  "Custom attributes",
  "AI import from notes or documents",
] as const;

const PLANS = [
  {
    key: "free",
    label: "Free",
    price: null,
    yearlyPrice: null,
    description: "Get started and explore",
    chars: "5,000",
    badge: null,
    features: [
      { label: "5,000 free AI characters to start", children: AI_CHARACTER_USES },
      { label: "Unlimited public courses" },
      { label: "All study modes" },
      { label: "Community courses" },
    ],
    missing: [
      { label: "Private courses" },
      // { label: "Top-up packs" }, // hidden — re-enable with TOPUP_ENABLED in billing/page.tsx
    ],
  },
  {
    key: "plus",
    label: "Plus",
    price: PLAN_PRICES.plus.monthly,
    yearlyPrice: PLAN_PRICES.plus.yearly,
    description: "For serious learners",
    chars: "300,000",
    badge: "Most popular",
    features: [
      { label: "300,000 AI characters / month", children: AI_CHARACTER_USES },
      { label: "Private courses" },
      { label: "Everything in Free" },
    ],
    missing: [],
  },
  {
    key: "pro",
    label: "Pro",
    price: PLAN_PRICES.pro.monthly,
    yearlyPrice: PLAN_PRICES.pro.yearly,
    description: "For power users & teachers",
    chars: "1,000,000",
    badge: null,
    features: [
      { label: "1,000,000 AI characters / month", children: AI_CHARACTER_USES },
      { label: "Everything in Plus" },
      { label: "Priority support" },
    ],
    missing: [],
  },
] as const;

const PLAN_RANK = {
  free: 0,
  plus: 1,
  pro: 2,
} as const;

function FeatureLine({
  item,
  muted = false,
}: {
  item: { label: string; children?: readonly string[] };
  muted?: boolean;
}) {
  return (
    <li className={`font-manrope text-sm ${muted ? "text-ink-3" : "text-ink"}`}>
      <div className="flex items-start gap-2">
        <span className={`mt-0.5 shrink-0 ${muted ? "" : "text-green-600"}`}>
          {muted ? "✗" : "✓"}
        </span>
        <span>{item.label}</span>
      </div>
      {item.children && (
        <ul className="ml-6 mt-1 flex flex-col gap-1 border-l border-ink/10 pl-3 text-xs leading-5 text-ink-3">
          {item.children.map((child) => (
            <li key={child}>{child}</li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default async function UpgradePage() {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("plan")
    .eq("user_id", user.id)
    .single();

  const currentPlan = (sub?.plan as string | null) ?? "free";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">

      {/* Header */}
      <div className="mb-10 text-center">
        <Link href="/billing" className="mb-6 inline-block font-manrope text-sm text-ink-3 hover:text-ink">
          ← Billing
        </Link>
        <h1 className="font-fredoka text-4xl font-[700] tracking-tight text-ink">
          Choose your <span className="text-orange-text">plan</span>
        </h1>
        <p className="mt-2 font-manrope text-sm text-ink-3">
          Upgrade anytime. Cancel anytime.
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = plan.key === currentPlan;
          const isRecommended = plan.badge !== null;
          const isLowerPlan =
            (PLAN_RANK[plan.key] ?? 0) < (PLAN_RANK[currentPlan as keyof typeof PLAN_RANK] ?? 0);

          return (
            <div
              key={plan.key}
              className={`relative flex flex-col rounded-2xl border-2 p-6 transition ${
                isCurrent
                  ? "border-orange bg-orange/5"
                  : isRecommended
                  ? "border-blue bg-blue/5 shadow-hard"
                  : "border-ink/10 bg-paper-2"
              }`}
            >
              {/* Badge */}
              {(isCurrent || isRecommended) && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className={`rounded-full px-3 py-1 font-manrope text-xs font-[800] ${
                    isCurrent ? "bg-orange text-on-bright" : "bg-blue text-ocean"
                  }`}>
                    {isCurrent ? "Current plan" : plan.badge}
                  </span>
                </div>
              )}

              {/* Plan name + price */}
              <div className="mb-5 mt-2">
                <p className="font-fredoka text-2xl font-[600] text-ink">{plan.label}</p>
                <p className="mt-0.5 font-manrope text-xs text-ink-3">{plan.description}</p>
                <div className="mt-3 flex items-baseline gap-1">
                  {plan.price ? (
                    <>
                      <span className="font-fredoka text-4xl font-[700] text-ink">{plan.price}</span>
                      <span className="font-manrope text-sm text-ink-3">/ month</span>
                    </>
                  ) : (
                    <span className="font-fredoka text-4xl font-[700] text-ink">Free</span>
                  )}
                </div>
                {plan.yearlyPrice && (
                  <p className="mt-1 font-manrope text-xs text-ink-3">
                    or {plan.yearlyPrice} / year — 2 months free
                  </p>
                )}
              </div>

              {/* Quota pills */}
              <div className="mb-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-paper px-3 py-1 font-manrope text-xs font-[700] text-ink shadow-hard-sm">
                  {plan.chars} chars
                </span>
              </div>

              {/* Features */}
              <ul className="mb-6 flex flex-col gap-2">
                {plan.features.map((f) => <FeatureLine key={f.label} item={f} />)}
                {plan.missing.map((f) => <FeatureLine key={f.label} item={f} muted />)}
              </ul>

              {/* CTA */}
              <div className="mt-auto">
                {isCurrent ? (
                  <div className="w-full rounded-full border-2 border-orange/30 py-2.5 text-center font-manrope text-sm font-[700] text-orange-text">
                    Current plan
                  </div>
                ) : plan.key === "free" || isLowerPlan ? (
                  <div className="w-full rounded-full border-2 border-ink/10 py-2.5 text-center font-manrope text-sm font-[700] text-ink-3">
                    Downgrade
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <form action={startCheckout.bind(null, plan.key as "plus" | "pro", "monthly")}>
                      <button
                        type="submit"
                        className={`w-full rounded-full py-2.5 font-manrope text-sm font-[800] text-on-bright transition hover:opacity-90 active:translate-y-[1px] ${
                          isRecommended ? "bg-blue text-ocean shadow-none" : "bg-orange shadow-hard-red"
                        }`}
                      >
                        Upgrade to {plan.label} — {plan.price}/mo
                      </button>
                    </form>
                    <form action={startCheckout.bind(null, plan.key as "plus" | "pro", "yearly")}>
                      <button
                        type="submit"
                        className="w-full rounded-full border-2 border-ink/15 py-2 font-manrope text-sm font-[700] text-ink transition hover:border-ink/30 active:translate-y-[1px]"
                      >
                        Pay yearly — {plan.yearlyPrice}/yr
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="mt-8 text-center font-manrope text-xs text-ink-3">
        Prices in USD · Monthly or yearly billing · Cancel anytime · AI characters refill every month on paid plans
      </p>
      <p className="mt-3 text-center font-manrope text-xs text-ink-3">
        By subscribing you agree to our{" "}
        <Link href="/terms" className="underline hover:text-ink">Terms of Service</Link>,{" "}
        <Link href="/privacy" className="underline hover:text-ink">Privacy Policy</Link>, and{" "}
        <Link href="/refund" className="underline hover:text-ink">Refund Policy</Link>.
        Payments processed by Polar.
      </p>
    </div>
  );
}
