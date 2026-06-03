import Link from "next/link";
import { Icon } from "@/components/ui-icons";
import { BrandLogo } from "@/components/brand-logo";
import ThemeToggle from "../../theme-toggle";

export const metadata = {
  title: "Refund Policy - Brainana",
  description: "Brainana's refund policy for subscription plans.",
  alternates: { canonical: "/refund" },
  openGraph: {
    title: "Refund Policy - Brainana",
    description: "Brainana's refund policy for subscription plans.",
    url: "/refund",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Refund Policy - Brainana",
    description: "Brainana's refund policy for subscription plans.",
  },
};

const sections = [
  {
    title: "1. All Sales Are Final",
    body: "All purchases made on Brainana are final and non-refundable. By completing a subscription purchase you acknowledge and agree that no refunds or credits will be issued for any reason, including but not limited to: change of mind, accidental purchase, failure to cancel before renewal, or dissatisfaction with the service.",
  },
  {
    title: "2. Why We Do Not Offer Refunds",
    body: "Paid plans and top-ups on Brainana grant immediate quota of AI characters and AI tutor sessions. These quotas are provisioned and begin to be available for consumption the moment payment is processed. Because the value is delivered upfront for the current billing period, we are unable to issue refunds for a period that has already commenced.",
  },
  {
    title: "3. Cancellation",
    body: "You may cancel your subscription at any time from your account's billing settings. Cancellation stops future charges but does not entitle you to a refund for the current billing period. After cancellation your account retains paid-plan features and quota until the end of the current billing period, at which point it reverts to the Free tier.",
  },
  {
    title: "4. Billing Errors",
    body: "If you believe you were charged in error (for example, due to a technical fault on our side that prevented access to the service for your entire billing period), please contact us at support@brainana.app within 14 days of the charge. We will investigate and, at our sole discretion, may issue a credit or refund where a genuine billing error is confirmed.",
  },
  {
    title: "5. Chargebacks",
    body: "If you initiate a chargeback with your bank or card issuer instead of contacting us first, we reserve the right to suspend or terminate your account pending resolution. We encourage you to reach out to support@brainana.app before disputing a charge so we can resolve the issue quickly.",
  },
  {
    title: "6. Payment Processing",
    body: "Payments are processed by Polar (polar.sh). Polar handles all billing on our behalf. If you have a billing query that cannot be resolved by Brainana support, you may also contact Polar directly at polar.sh.",
  },
  {
    title: "7. Contact",
    body: "Questions about this policy or individual charges can be sent to support@brainana.app. We aim to respond within 2 business days.",
  },
];

export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <Header />

      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-14">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Legal</p>
        <h1 className="mt-3 font-fredoka text-5xl font-[600] leading-tight tracking-tight">Refund Policy</h1>
        <p className="mt-3 font-mono text-xs uppercase tracking-widest text-ink-2">Last updated: June 1, 2026</p>

        <div className="mt-10 space-y-8">
          <div className="rounded-[1.2rem] border-2 border-orange/40 bg-orange/5 p-5">
            <p className="font-manrope font-[700] leading-7 text-ink">
              Brainana does not offer refunds for subscription purchases.
            </p>
            <p className="mt-2 font-manrope leading-7 text-ink-2">
              Paid plans grant an immediate monthly quota of AI features. Because this quota
              is provisioned at the start of each billing period, all sales are final.
              Please read the full policy below before subscribing.
            </p>
          </div>

          {sections.map((section) => (
            <section key={section.title} className="rounded-[1.2rem] border border-ink/20 bg-paper-2 p-5 shadow-hard-sm">
              <h2 className="font-fredoka text-2xl font-[600] tracking-tight">{section.title}</h2>
              <p className="mt-3 font-manrope leading-7 text-ink-2">{section.body}</p>
            </section>
          ))}
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
