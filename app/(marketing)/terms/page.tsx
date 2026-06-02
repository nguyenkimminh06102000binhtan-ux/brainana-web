import Link from "next/link";
import { Icon } from "@/components/ui-icons";
import { BrandLogo } from "@/components/brand-logo";
import ThemeToggle from "../../theme-toggle";

export const metadata = {
  title: "Terms of Service - Brainana",
  description: "The terms and conditions governing your use of Brainana.",
};

const sections = [
  {
    title: "1. Eligibility",
    body: "You must meet the minimum age required by law in your country to use Brainana. By creating an account you confirm that you meet this requirement and are responsible for all activity that occurs through your account.",
  },
  {
    title: "2. Account Registration",
    body: "When you create an account, provide accurate and current information, keep your password private, and notify us immediately at support@brainana.app if you suspect unauthorized access. You are responsible for maintaining the security of your account.",
  },
  {
    title: "3. The Service",
    body: "Brainana is an AI-powered language learning platform that lets you create and study flashcard-style courses, track spaced-repetition progress, and access AI tutor sessions. Features may change as the product evolves. We will notify you of significant changes.",
  },
  {
    title: "4. User Content",
    body: "You retain ownership of content you create or upload. By submitting content you grant Brainana a non-exclusive licence to store and display it as necessary to operate the service. Do not submit content that violates laws, third-party intellectual-property rights, or these Terms.",
  },
  {
    title: "5. Acceptable Use",
    body: "Do not misuse the service. Prohibited conduct includes: interfering with or circumventing security measures; scraping or bulk-downloading content without permission; uploading malicious code or spam; harassing other users; using the service to infringe third-party rights; or violating any applicable law.",
  },
  {
    title: "6. Subscriptions and Payments",
    body: `Brainana offers a Free tier and two paid subscription plans — Plus ($9 / month) and Pro ($19 / month) — billed monthly in USD. Payments are processed securely by Lemon Squeezy (lemonsqueezy.com), our authorised reseller and Merchant of Record. When you subscribe you authorise Lemon Squeezy to charge your payment method on a recurring monthly basis. Your subscription renews automatically at the end of each billing period unless you cancel before the renewal date. You can cancel at any time from your account settings; cancellation takes effect at the end of the current billing period. Monthly quota (AI characters and tutor sessions) resets on your billing anniversary and does not roll over.`,
  },
  {
    title: "7. Refunds",
    body: "All purchases are final and non-refundable. Because paid plans grant an immediate monthly quota of AI characters and tutor sessions that begins to be consumed on activation, we do not issue refunds or credits for any unused portion of a billing period. If you cancel, you retain access to paid features through the end of your current billing period. See our Refund Policy at brainana.app/refund for full details.",
  },
  {
    title: "8. Intellectual Property",
    body: "Brainana and its content (excluding user-generated content) are owned by or licensed to Brainana and protected by copyright and other intellectual-property laws. You may not copy, distribute, or create derivative works without our prior written permission.",
  },
  {
    title: "9. Disclaimers and Limitation of Liability",
    body: 'The service is provided "as is" without warranties of any kind. To the fullest extent permitted by law, Brainana is not liable for indirect, incidental, or consequential damages arising from your use of the service. Our total liability for any claim shall not exceed the amount you paid us in the three months preceding the claim.',
  },
  {
    title: "10. Termination",
    body: "We may suspend or terminate your account if you breach these Terms or if we decide to discontinue the service. Upon termination, your right to use the service ceases immediately. Sections 4, 8, 9, and 10 survive termination.",
  },
  {
    title: "11. Changes to These Terms",
    body: "We may update these Terms from time to time. We will notify you of material changes by email or in-app notice at least 14 days before they take effect. Continued use of the service after the effective date constitutes acceptance.",
  },
  {
    title: "12. Contact",
    body: "Questions about these Terms can be sent to legal@brainana.app. For billing issues, contact support@brainana.app.",
  },
];

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <Header />

      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-14">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Legal</p>
        <h1 className="mt-3 font-fredoka text-5xl font-[600] leading-tight tracking-tight">Terms of Service</h1>
        <p className="mt-3 font-mono text-xs uppercase tracking-widest text-ink-2">Last updated: June 1, 2026</p>

        <div className="mt-10 space-y-8">
          <p className="font-manrope leading-7 text-ink-2">
            Please read these Terms of Service carefully before using Brainana. By
            accessing or using the service, you agree to be bound by these Terms.
            If you do not agree, do not use the service.
          </p>

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
    <header className="sticky top-3 z-40 mx-4 mt-4 rounded-[1.6rem] border border-ink/10 bg-paper-2/95 shadow-hard backdrop-blur sm:mx-auto sm:mt-8 sm:max-w-5xl sm:rounded-full">
      <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-6 sm:py-4">
        <Link href="/" className="flex min-w-0 items-center gap-3 font-fredoka text-xl font-[700] tracking-tight sm:text-2xl">
          <BrandLogo labelClassName="hidden truncate sm:inline-flex" />
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <ThemeToggle />
          <Link href="/login" className="inline-flex min-h-10 items-center rounded-full bg-paper px-4 py-2.5 font-manrope text-sm font-[800] text-ink shadow-hard-sm transition active:translate-y-[2px] active:shadow-none sm:px-5">
            Log in
          </Link>
          <Link href="/signup" className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-orange px-4 py-2.5 font-manrope text-sm font-[800] text-on-bright shadow-hard-red transition active:translate-y-[2px] active:shadow-hard-sm sm:px-5">
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
