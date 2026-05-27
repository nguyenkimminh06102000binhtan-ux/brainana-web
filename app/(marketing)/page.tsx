import Link from "next/link";

const features = [
  {
    title: "Course library",
    description: "Browse published learning material and enroll in the courses that fit your goals.",
  },
  {
    title: "Progress overview",
    description: "See enrolled courses, completed items, XP, and your current study streak.",
  },
  {
    title: "Account access",
    description: "Sign up with email or Google and continue into the authenticated app.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-paper px-5 py-8 text-ink">
      <header className="mx-auto max-w-6xl rounded-full bg-paper-2 px-6 py-4 shadow-hard">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-fredoka text-2xl font-[700] tracking-tight">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-yellow text-2xl text-ink shadow-hard-sm">
              B
            </span>
            <span>Brainana</span>
          </Link>
          <nav className="hidden items-center gap-10 font-manrope text-sm font-[700] md:flex">
            <Link href="/courses">Courses</Link>
            <Link href="/dashboard">Method</Link>
            <Link href="/terms">Community</Link>
          </nav>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/login"
              className="hidden rounded-full bg-paper px-5 py-2.5 font-manrope text-sm font-[700] text-ink shadow-hard-sm transition active:translate-y-[2px] active:shadow-none sm:inline-block"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-blue px-6 py-3 font-manrope text-sm font-[800] text-ocean shadow-hard transition active:translate-y-[2px] active:shadow-hard-sm"
            >
              Try free
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 py-24 md:grid-cols-[1fr_520px] md:items-center">
        <div>
          <p className="mb-8 inline-flex rounded-full bg-paper-2 px-5 py-3 font-manrope text-sm font-[800] text-ink shadow-hard-sm">
            Creative learning platform
          </p>
          <h1 className="font-fredoka text-6xl font-[700] leading-[0.98] tracking-tight sm:text-7xl">
            Learn deeper with <span className="text-orange">Brainana</span>
          </h1>
          <p className="mt-8 max-w-2xl font-manrope text-xl leading-9 text-ink-2">
            Brainana keeps the product surface simple: authentication, course discovery,
            enrollment, and a dashboard for current learning activity.
          </p>
          <div className="mt-10 flex flex-wrap gap-5">
            <Link
              href="/signup"
              className="rounded-full bg-orange px-8 py-4 font-manrope text-base font-[800] text-ink shadow-hard-red transition active:translate-y-[2px] active:shadow-hard-sm"
            >
              Start learning
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-paper-2 px-8 py-4 font-manrope text-base font-[800] text-ink shadow-hard-sm transition active:translate-y-[2px] active:shadow-none"
            >
              View demo
            </Link>
          </div>
        </div>

        <aside className="rounded-lg bg-navy p-7 shadow-hard">
          <div className="rounded-lg bg-blue p-7 text-ocean">
            <p className="font-manrope text-sm text-ocean/75">Today's lesson</p>
            <p className="mt-1 font-fredoka text-4xl font-[700] tracking-tight">Ocean of knowledge</p>
            <div className="mt-8 space-y-4">
              {["Thinking math", "Fun science", "English speaking", "Study skills"].map((item, index) => (
                <div key={item} className="flex items-center gap-4 rounded-md bg-navy/45 p-4">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-sm bg-yellow font-fredoka text-xl font-[700] text-ink">
                    {index + 1}
                  </span>
                  <span className="font-manrope text-lg font-[800]">{item}</span>
                  <span className="ml-auto text-ocean/80">○</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="mx-auto max-w-6xl rounded-lg bg-paper-2 p-6 shadow-hard">
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-md bg-paper p-6 shadow-hard-sm">
              <h2 className="font-fredoka text-2xl font-[700] tracking-tight">{feature.title}</h2>
              <p className="mt-2 font-manrope text-sm leading-6 text-ink-2">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 font-mono text-xs uppercase tracking-widest text-ink-2 sm:flex-row sm:items-center sm:justify-between">
        <p>Brainana</p>
        <div className="flex gap-5">
          <Link href="/privacy" className="hover:text-ink">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-ink">
            Terms
          </Link>
        </div>
      </footer>
    </main>
  );
}
