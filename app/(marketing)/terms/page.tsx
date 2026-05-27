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
    <main className="min-h-screen bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <Header />

      <section className="mx-auto max-w-3xl px-6 py-14">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Legal</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Terms of Service</h1>
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Last updated: May 21, 2026</p>

        <div className="mt-10 space-y-8">
          <p className="leading-7 text-zinc-600 dark:text-zinc-400">
            Please read these Terms of Service carefully before using Brainana. By
            accessing or using the service, you agree to these terms.
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
