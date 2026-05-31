import type { Metadata } from "next";
export const metadata: Metadata = { title: "Upgrade — Brainana" };

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

const PLANS = [
  {
    key: "free",
    label: "Free",
    price: null,
    description: "Get started and explore",
    chars: "500",
    sessions: "1",
    badge: null,
    features: [
      "500 characters to try AI features",
      "1 AI tutor session",
      "Unlimited public courses",
      "All study modes",
      "Community courses",
    ],
    missing: [
      "Private courses",
      "Top-up packs",
    ],
  },
  {
    key: "plus",
    label: "Plus",
    price: "$9",
    description: "For serious learners",
    chars: "150,000",
    sessions: "20",
    badge: "Most popular",
    features: [
      "150,000 characters / month",
      "20 AI tutor sessions / month",
      "Private courses",
      "TTS audio generation",
      "AI romanization",
      "AI import from files",
      "Everything in Free",
    ],
    missing: [],
  },
  {
    key: "pro",
    label: "Pro",
    price: "$19",
    description: "For power users & teachers",
    chars: "600,000",
    sessions: "60",
    badge: null,
    features: [
      "600,000 characters / month",
      "60 AI tutor sessions / month",
      "Everything in Plus",
      "Priority support",
    ],
    missing: [],
  },
] as const;

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
          Upgrade anytime. Payments coming soon via Paddle.
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = plan.key === currentPlan;
          const isRecommended = plan.badge !== null;

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
              </div>

              {/* Quota pills */}
              <div className="mb-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-paper px-3 py-1 font-manrope text-xs font-[700] text-ink shadow-hard-sm">
                  {plan.chars} chars
                </span>
                <span className="rounded-full bg-paper px-3 py-1 font-manrope text-xs font-[700] text-ink shadow-hard-sm">
                  {plan.sessions} AI sessions
                </span>
              </div>

              {/* Features */}
              <ul className="mb-6 flex flex-col gap-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 font-manrope text-sm text-ink">
                    <span className="mt-0.5 shrink-0 text-green-600">✓</span>
                    {f}
                  </li>
                ))}
                {plan.missing.map((f) => (
                  <li key={f} className="flex items-start gap-2 font-manrope text-sm text-ink-3">
                    <span className="mt-0.5 shrink-0">✗</span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="mt-auto">
                {isCurrent ? (
                  <div className="w-full rounded-full border-2 border-orange/30 py-2.5 text-center font-manrope text-sm font-[700] text-orange-text">
                    Current plan
                  </div>
                ) : plan.key === "free" ? (
                  <div className="w-full rounded-full border-2 border-ink/10 py-2.5 text-center font-manrope text-sm font-[700] text-ink-3">
                    Downgrade
                  </div>
                ) : (
                  <div className="group relative">
                    <button
                      type="button"
                      disabled
                      className={`w-full rounded-full py-2.5 font-manrope text-sm font-[800] text-on-bright shadow-hard-red transition disabled:cursor-not-allowed disabled:opacity-70 ${
                        isRecommended ? "bg-blue text-ocean shadow-none" : "bg-orange"
                      }`}
                    >
                      Upgrade to {plan.label}
                    </button>
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-44 -translate-x-1/2 rounded-lg bg-ink px-3 py-2 text-center font-manrope text-xs text-paper shadow-lg group-hover:block">
                      Payments coming soon
                      <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-ink" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="mt-8 text-center font-manrope text-xs text-ink-3">
        Prices in USD · Monthly billing · Cancel anytime · Characters and sessions reset each month
      </p>
    </div>
  );
}
