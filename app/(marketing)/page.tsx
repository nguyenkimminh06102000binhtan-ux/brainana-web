import Link from "next/link";

const features = [
  {
    title: "Mems",
    description: "Mnemonic hints submitted by other learners. Tap to see them mid-card.",
  },
  {
    title: "Community courses",
    description: "Real teachers and learners build practical courses you can browse or join.",
  },
  {
    title: "Build your own",
    description: "Turn your notes, decks, and study ideas into a course for everyone.",
  },
];

const courseCards = [
  {
    eyebrow: "[ spanish 101 ]",
    title: "Spanish 101",
    author: "@maria_v",
    tags: ["lang", "beginner"],
    learners: "42k",
    cards: "1,200",
    accent: "bg-red-soft",
  },
  {
    eyebrow: "[ gre sprint ]",
    title: "GRE Sprint",
    author: "@prepz",
    tags: ["vocab", "test"],
    learners: "18k",
    cards: "800",
    accent: "bg-yellow-soft",
  },
  {
    eyebrow: "[ anatomy 1 ]",
    title: "Anatomy 1",
    author: "@ms_lin",
    tags: ["med"],
    learners: "9.2k",
    cards: "3,400",
    accent: "bg-green-soft",
  },
  {
    eyebrow: "[ world caps ]",
    title: "World Caps",
    author: "@geokid",
    tags: ["geo", "fun"],
    learners: "22k",
    cards: "195",
    accent: "bg-red-soft",
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
            <Link href="/browse">Browse</Link>
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
              className="rounded-full bg-orange px-6 py-3 font-manrope text-sm font-[800] text-white shadow-hard-red transition active:translate-y-[2px] active:shadow-hard-sm"
            >
              Try free
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 py-24 md:grid-cols-[1fr_640px] md:items-center">
        <div>
          <p className="mb-8 inline-flex rounded-full bg-paper-2 px-5 py-3 font-manrope text-sm font-[800] text-ink shadow-hard-sm">
            what's new this week
          </p>
          <h1 className="font-fredoka text-6xl font-[700] leading-[0.98] tracking-tight sm:text-7xl">
            the <span className="text-orange">community</span> is your textbook.
          </h1>
          <p className="mt-8 max-w-2xl font-manrope text-xl leading-9 text-ink-2">
            Real teachers, real learners, real mems. Pick a course someone built, or build your own.
          </p>
          <div className="mt-10 flex flex-wrap gap-5">
            <Link
              href="/courses"
              className="rounded-full bg-orange px-8 py-4 font-manrope text-base font-[800] text-white shadow-hard-red transition active:translate-y-[2px] active:shadow-hard-sm"
            >
              Browse all courses
            </Link>
            <Link
              href="/create"
              className="rounded-full bg-paper-2 px-8 py-4 font-manrope text-base font-[800] text-ink shadow-hard-sm transition active:translate-y-[2px] active:shadow-none"
            >
              Create one
            </Link>
          </div>
        </div>

        <aside className="grid gap-5 sm:grid-cols-2">
          {courseCards.map((course) => (
            <article key={course.title} className="overflow-hidden rounded-lg bg-paper-2 shadow-hard">
              <div className={`${course.accent} border-b border-ink px-5 py-6`}>
                <p className="font-mono text-sm font-[700] uppercase tracking-widest text-ink-2">
                  {course.eyebrow}
                </p>
              </div>
              <div className="p-5">
                <h2 className="font-fredoka text-3xl font-[700] tracking-tight">{course.title}</h2>
                <p className="mt-2 font-manrope text-base font-[800] text-ink-2">by {course.author}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {course.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-paper px-3 py-1 font-manrope text-sm font-[800] text-ink shadow-hard-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="mt-5 font-manrope text-sm font-[800] text-ink-2">
                  {course.learners} learners / {course.cards} cards
                </p>
              </div>
            </article>
          ))}
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
