import Image from "next/image";
import Link from "next/link";

const features = [
  {
    title: "Course library",
    description: "Browse published learning material and enroll in the courses that fit your goals.",
  },
  {
    title: "Progress overview",
    description: "See your enrolled courses, completed items, XP, and current study streak.",
  },
  {
    title: "Account access",
    description: "Sign up with email or Google and continue into the authenticated app.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-lg font-semibold">
            Brainana
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/login"
              className="rounded-md border border-zinc-300 px-3 py-2 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-zinc-950 px-3 py-2 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-5xl gap-10 px-6 py-20 md:grid-cols-[1fr_360px] md:items-center">
        <div>
          <p className="mb-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Learning app template
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Study courses and track progress in one place.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
            Brainana keeps the product surface simple: authentication, course discovery,
            enrollment, and a dashboard for your current learning activity.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-md bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-zinc-300 px-4 py-2.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              I already have an account
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <Image
            src="/next.svg"
            alt="Next.js"
            width={160}
            height={34}
            className="dark:invert"
            priority
          />
          <div className="mt-10 space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
            <p className="font-medium text-zinc-950 dark:text-zinc-50">Template baseline</p>
            <p>Neutral colors, simple spacing, standard controls, and minimal global CSS.</p>
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="mx-auto grid max-w-5xl gap-4 px-6 py-12 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <h2 className="font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
        <p>Brainana</p>
        <div className="flex gap-5">
          <Link href="/privacy" className="hover:text-zinc-950 dark:hover:text-zinc-50">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-zinc-950 dark:hover:text-zinc-50">
            Terms
          </Link>
        </div>
      </footer>
    </main>
  );
}
