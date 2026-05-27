import Link from "next/link";

export const metadata = {
  title: "Terms of Service - Brainana",
  description: "The terms and conditions governing your use of Brainana.",
};

const sections = [
  {
    title: "1. Eligibility",
    body: "You must meet the minimum age required by law to use Brainana and you are responsible for the activity that happens through your account.",
  },
  {
    title: "2. Account Registration",
    body: "When you create an account, provide accurate information, keep your password private, and notify us if you suspect unauthorized access.",
  },
  {
    title: "3. The Service",
    body: "Brainana provides tools for studying courses, tracking progress, and accessing educational content. Features may change as the product evolves.",
  },
  {
    title: "4. User Content",
    body: "You are responsible for content you create or upload. Do not submit material that violates laws, third-party rights, or these terms.",
  },
  {
    title: "5. Acceptable Use",
    body: "Do not misuse the service, interfere with security, scrape without permission, upload harmful code, or harass other users.",
  },
  {
    title: "6. Contact",
    body: "Questions about these terms can be sent to legal@brainana.app.",
  },
];

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <Header />

      <section className="mx-auto max-w-3xl px-6 py-14">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Legal</p>
        <h1 className="mt-3 font-fredoka text-5xl font-[600] leading-tight tracking-tight">Terms of Service</h1>
        <p className="mt-3 font-mono text-xs uppercase tracking-widest text-ink-2">Last updated: May 21, 2026</p>

        <div className="mt-10 space-y-8">
          <p className="font-manrope leading-7 text-ink-2">
            Please read these Terms of Service carefully before using Brainana. By
            accessing or using the service, you agree to these terms.
          </p>

          {sections.map((section) => (
            <section key={section.title} className="rounded-lg border border-ink/30 bg-paper-2 p-5">
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
    <header className="mx-auto mt-8 max-w-5xl rounded-full bg-paper-2 shadow-hard">
      <div className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="font-fredoka text-2xl font-[700] tracking-tight">
          Brainana
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/login" className="rounded-full bg-paper px-5 py-2.5 font-manrope text-sm font-[800] text-ink shadow-hard-sm transition active:translate-y-[2px] active:shadow-none">
            Log in
          </Link>
          <Link href="/signup" className="rounded-full bg-orange px-5 py-2.5 font-manrope text-sm font-[800] text-ink shadow-hard-red transition active:translate-y-[2px] active:shadow-hard-sm">
            Sign up
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-paper">
      <div className="mx-auto flex max-w-5xl gap-5 px-6 py-8 font-mono text-xs uppercase tracking-widest text-ink-2">
        <Link href="/privacy" className="hover:text-ink">
          Privacy
        </Link>
        <Link href="/terms" className="hover:text-ink">
          Terms
        </Link>
        <Link href="/" className="hover:text-ink">
          Home
        </Link>
      </div>
    </footer>
  );
}
