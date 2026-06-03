import Link from "next/link";
import { Icon } from "@/components/ui-icons";
import { BrandLogo } from "@/components/brand-logo";
import ThemeToggle from "../../theme-toggle";

export const metadata = {
  title: "Pricing - Brainana",
  description: "Simple, transparent pricing for Brainana. Start free, upgrade when you're ready.",
};

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
    priceNote: "Forever free",
    description: "Get started and explore",
    badge: null,
    features: [
      { label: "Unlimited public courses" },
      { label: "All study modes" },
      { label: "Access to community courses" },
    ],
    missing: [
      { label: "AI characters", children: AI_CHARACTER_USES },
      { label: "AI tutor sessions" },
      { label: "Private courses" },
    ],
    cta: "Sign up free",
    ctaHref: "/signup",
    ctaStyle: "secondary",
  },
  {
    key: "plus",
    label: "Plus",
    price: "$9",
    priceNote: "per month, billed monthly",
    description: "For serious learners",
    badge: "Most popular",
    features: [
      { label: "300,000 AI characters / month", children: AI_CHARACTER_USES },
      { label: "30 AI tutor sessions / month" },
      { label: "Private courses" },
      { label: "Everything in Free" },
    ],
    missing: [],
    cta: "Get Plus",
    ctaHref: "/signup",
    ctaStyle: "primary",
  },
  {
    key: "pro",
    label: "Pro",
    price: "$19",
    priceNote: "per month, billed monthly",
    description: "For power users & teachers",
    badge: null,
    features: [
      { label: "900,000 AI characters / month", children: AI_CHARACTER_USES },
      { label: "90 AI tutor sessions / month" },
      { label: "Everything in Plus" },
      { label: "Priority support" },
    ],
    missing: [],
    cta: "Get Pro",
    ctaHref: "/signup",
    ctaStyle: "secondary",
  },
] as const;

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

const FAQ = [
  {
    q: "What counts as an AI character?",
    a: "AI characters are input characters processed by AI features: generating answer/back cards, auto text-to-speech audio, autofilling custom attributes such as romanization, example sentences, and pronunciation, plus AI import from notebooks and documents. Each month your quota resets on your billing anniversary.",
  },
  {
    q: "What is an AI tutor session?",
    a: "Each AI tutor session is one conversation with the in-course AI tutor. Sessions are counted per conversation start and reset monthly with your quota.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. You can cancel your subscription at any time from your billing settings. You keep paid-plan access until the end of your current billing period, then your account moves to the Free tier.",
  },
  {
    q: "Do unused characters or sessions roll over?",
    a: "No. Quota resets at the start of each billing period and unused amounts do not carry over.",
  },
  {
    q: "What payment methods are accepted?",
    a: "Payments are processed by Polar and support major credit and debit cards. Available methods may vary by country.",
  },
  {
    q: "Is there a refund policy?",
    a: "All sales are final. Because quota is provisioned immediately on payment, we do not issue refunds. See our full Refund Policy for details.",
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <Header />

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 sm:py-16">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Pricing</p>
        <h1 className="mt-3 font-fredoka text-5xl font-[600] leading-tight tracking-tight">
          Simple, transparent pricing
        </h1>
        <p className="mt-4 font-manrope text-lg leading-7 text-ink-2">
          Start for free. Upgrade when you need more AI power.
        </p>
      </section>

      {/* Plan cards */}
      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {PLANS.map((plan) => {
            const isPopular = plan.badge !== null;
            return (
              <div
                key={plan.key}
                className={`relative flex flex-col rounded-2xl border-2 p-6 ${
                  isPopular
                    ? "border-blue bg-blue/5 shadow-hard"
                    : "border-ink/10 bg-paper-2"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-blue px-3 py-1 font-manrope text-xs font-[800] text-ocean">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="mb-5 mt-2">
                  <p className="font-fredoka text-2xl font-[600] text-ink">{plan.label}</p>
                  <p className="mt-0.5 font-manrope text-xs text-ink-3">{plan.description}</p>
                  <div className="mt-3">
                    {plan.price ? (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="font-fredoka text-4xl font-[700] text-ink">{plan.price}</span>
                          <span className="font-manrope text-sm text-ink-3">/ mo</span>
                        </div>
                        <p className="mt-0.5 font-manrope text-xs text-ink-3">{plan.priceNote}</p>
                      </>
                    ) : (
                      <>
                        <span className="font-fredoka text-4xl font-[700] text-ink">Free</span>
                        <p className="mt-0.5 font-manrope text-xs text-ink-3">{plan.priceNote}</p>
                      </>
                    )}
                  </div>
                </div>

                <ul className="mb-6 flex flex-col gap-2">
                  {plan.features.map((f) => <FeatureLine key={f.label} item={f} />)}
                  {plan.missing.map((f) => <FeatureLine key={f.label} item={f} muted />)}
                </ul>

                <div className="mt-auto">
                  <Link
                    href={plan.ctaHref}
                    className={`flex w-full items-center justify-center rounded-full py-2.5 font-manrope text-sm font-[800] transition active:translate-y-[2px] ${
                      plan.ctaStyle === "primary"
                        ? "bg-orange text-on-bright shadow-hard-red active:shadow-hard-sm"
                        : "bg-paper text-ink shadow-hard-sm active:shadow-none"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center font-manrope text-xs text-ink-3">
          Prices in USD · Monthly billing · Cancel anytime · AI characters and sessions reset each month
        </p>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        <h2 className="mb-8 text-center font-fredoka text-3xl font-[600] tracking-tight">
          Frequently asked questions
        </h2>
        <div className="space-y-4">
          {FAQ.map((item) => (
            <div key={item.q} className="rounded-[1.2rem] border border-ink/20 bg-paper-2 p-5 shadow-hard-sm">
              <h3 className="font-fredoka text-xl font-[600] tracking-tight">{item.q}</h3>
              <p className="mt-2 font-manrope leading-7 text-ink-2">{item.a}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[1.2rem] border border-ink/10 bg-paper-2 p-6 text-center shadow-hard-sm">
          <p className="font-manrope text-sm text-ink-2">
            Have more questions?{" "}
            <a href="mailto:support@brainana.app" className="font-[700] text-ink underline hover:no-underline">
              support@brainana.app
            </a>
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-4 font-mono text-xs uppercase tracking-widest text-ink-3">
            <Link href="/terms" className="hover:text-ink">Terms of Service</Link>
            <Link href="/refund" className="hover:text-ink">Refund Policy</Link>
            <Link href="/privacy" className="hover:text-ink">Privacy Policy</Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function Header() {
  return (
    <header className="sticky top-3 z-40 mx-4 mt-4 rounded-[1.6rem] border-2 border-ink bg-paper-2/95 shadow-hard backdrop-blur sm:mx-auto sm:mt-8 sm:max-w-5xl sm:rounded-full">
      <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-6 sm:py-4">
        <Link href="/" className="flex min-w-0 items-center gap-3 font-fredoka text-xl font-[700] tracking-tight sm:text-2xl">
          <BrandLogo labelClassName="hidden truncate sm:inline-flex" />
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <ThemeToggle />
          <Link href="/login" className="inline-flex min-h-10 items-center rounded-full border-2 border-ink bg-paper px-4 py-2.5 font-manrope text-sm font-[800] text-ink shadow-hard-sm transition active:translate-y-[2px] active:shadow-none sm:px-5">
            Log in
          </Link>
          <Link href="/signup" className="inline-flex min-h-10 items-center gap-1.5 rounded-full border-2 border-ink bg-orange px-4 py-2.5 font-manrope text-sm font-[800] text-on-bright shadow-hard-red transition active:translate-y-[2px] active:shadow-hard-sm sm:px-5">
            Sign up <Icon name="arrowRight" className="h-3.5 w-3.5" />
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-paper">
      <div className="mx-auto flex max-w-5xl flex-wrap gap-5 px-6 py-8 font-mono text-xs uppercase tracking-widest text-ink-2">
        <Link href="/privacy" className="hover:text-ink">Privacy</Link>
        <Link href="/terms" className="hover:text-ink">Terms</Link>
        <Link href="/refund" className="hover:text-ink">Refund Policy</Link>
        <Link href="/pricing" className="hover:text-ink">Pricing</Link>
        <Link href="/" className="hover:text-ink">Home</Link>
      </div>
    </footer>
  );
}
