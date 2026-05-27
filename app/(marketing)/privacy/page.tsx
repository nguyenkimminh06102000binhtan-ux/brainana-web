import Link from "next/link";

export const metadata = {
  title: "Privacy Policy - Brainana",
  description: "How Brainana collects, uses, and protects your personal data.",
};

const sections = [
  {
    title: "1. Information We Collect",
    body: "We collect information needed to create your account, authenticate you, operate course features, and support the service.",
  },
  {
    title: "2. How We Use Information",
    body: "We use information to provide Brainana, maintain authentication, personalize learning activity, improve reliability, and comply with legal obligations.",
  },
  {
    title: "3. Sharing",
    body: "We do not sell personal information. We may share data with service providers such as authentication, database, hosting, or payment vendors when needed to run the product.",
  },
  {
    title: "4. Retention",
    body: "We retain personal information for as long as needed to provide the service, meet legal requirements, resolve disputes, and enforce agreements.",
  },
  {
    title: "5. Cookies",
    body: "Authentication and preference cookies may be required for core functionality. Disabling necessary cookies may prevent login from working.",
  },
  {
    title: "6. Contact",
    body: "Questions about this policy can be sent to privacy@brainana.app.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <Header />

      <section className="mx-auto max-w-3xl px-6 py-14">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Legal</p>
        <h1 className="mt-3 font-fredoka text-5xl font-[600] leading-tight tracking-tight">Privacy Policy</h1>
        <p className="mt-3 font-mono text-xs uppercase tracking-widest text-ink-2">Last updated: May 21, 2026</p>

        <div className="mt-10 space-y-8">
          <p className="font-manrope leading-7 text-ink-2">
            This Privacy Policy explains how Brainana collects, uses, discloses,
            and safeguards information when you use the service.
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
          <Link href="/signup" className="rounded-full bg-orange px-5 py-2.5 font-manrope text-sm font-[800] text-white shadow-hard-red transition active:translate-y-[2px] active:shadow-hard-sm">
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
