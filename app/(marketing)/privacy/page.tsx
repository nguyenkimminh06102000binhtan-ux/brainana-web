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
    <main className="min-h-screen bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <Header />

      <section className="mx-auto max-w-3xl px-6 py-14">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Legal</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Last updated: May 21, 2026</p>

        <div className="mt-10 space-y-8">
          <p className="leading-7 text-zinc-600 dark:text-zinc-400">
            This Privacy Policy explains how Brainana collects, uses, discloses,
            and safeguards information when you use the service.
          </p>

          {sections.map((section) => (
            <section key={section.title} className="border-t border-zinc-200 pt-8 dark:border-zinc-800">
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <p className="mt-3 leading-7 text-zinc-600 dark:text-zinc-400">{section.body}</p>
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
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-lg font-semibold">
          Brainana
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/login" className="rounded-md border border-zinc-300 px-3 py-2 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900">
            Log in
          </Link>
          <Link href="/signup" className="rounded-md bg-zinc-950 px-3 py-2 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200">
            Sign up
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-5xl gap-5 px-6 py-8 text-sm text-zinc-500">
        <Link href="/privacy" className="hover:text-zinc-950 dark:hover:text-zinc-50">
          Privacy
        </Link>
        <Link href="/terms" className="hover:text-zinc-950 dark:hover:text-zinc-50">
          Terms
        </Link>
        <Link href="/" className="hover:text-zinc-950 dark:hover:text-zinc-50">
          Home
        </Link>
      </div>
    </footer>
  );
}
