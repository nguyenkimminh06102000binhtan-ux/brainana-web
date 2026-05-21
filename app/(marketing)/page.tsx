import Link from "next/link";

/* ─── data ────────────────────────────────────────────────────────── */

const steps = [
  {
    num: "01",
    icon: "📚",
    title: "Create or find a course",
    desc: "Browse thousands of community-made decks or build your own in minutes.",
  },
  {
    num: "02",
    icon: "🃏",
    title: "Study with flashcards",
    desc: "Our spaced repetition engine shows you each card at exactly the right moment.",
  },
  {
    num: "03",
    icon: "📈",
    title: "Track your progress",
    desc: "Watch your retention rate climb with streaks, accuracy charts, and XP.",
  },
];

const features = [
  {
    icon: "🔁",
    title: "Spaced Repetition",
    desc: "The scientifically proven method to lock knowledge into long-term memory — automatically.",
  },
  {
    icon: "🌍",
    title: "Community Courses",
    desc: "Thousands of user-created decks on every topic. Learn anything, taught by everyone.",
  },
  {
    icon: "📊",
    title: "Progress Tracking",
    desc: "Detailed stats on accuracy, speed, and streak history so you always know where you stand.",
  },
];

const freeFeatures = [
  "Up to 3 courses",
  "Basic flashcard study",
  "Progress tracking",
  "Community access",
];

const proFeatures = [
  "Unlimited courses",
  "Spaced repetition algorithm",
  "Advanced analytics",
  "Offline study mode",
  "Priority support",
  "Zombie Mode 🧟",
];

/* ─── page ─────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="font-nunito flex flex-col min-h-screen">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-dark border-b border-cream/10">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🧠</span>
            <span className="text-banana font-extrabold text-xl tracking-tight">Brainana</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="border-2 border-cream/30 text-cream font-bold text-sm px-6 py-2.5 rounded-full hover:border-cream transition"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="bg-banana text-dark font-extrabold text-sm px-6 py-2.5 rounded-full hover:bg-banana/90 transition"
            >
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="bg-dark py-24 px-6">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center gap-16">
          {/* text */}
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-banana/15 text-banana border border-banana/20 rounded-full px-4 py-1.5 text-sm font-bold mb-8">
              🧟 Free to start · No credit card needed
            </div>
            <h1 className="text-cream text-5xl md:text-6xl font-extrabold leading-tight mb-6">
              Learn anything.
              <br />
              Eat brains.
              <br />
              <span className="text-banana">Repeat.</span>
            </h1>
            <p className="text-cream/60 text-lg md:text-xl max-w-lg mb-10 leading-relaxed">
              Brainana uses spaced repetition to make knowledge stick for good.
              Study smarter, build streaks, and unlock your inner zombie.
            </p>
            <Link
              href="/signup"
              className="inline-block bg-banana text-dark font-extrabold text-lg px-8 py-4 rounded-full hover:scale-105 transition-transform shadow-lg shadow-banana/20"
            >
              Start for free 🍌
            </Link>
          </div>

          {/* illustration */}
          <div className="shrink-0 relative flex items-center justify-center w-72 h-72">
            <div className="w-64 h-64 bg-banana/10 border border-banana/15 rounded-full flex items-center justify-center">
              <span className="text-[7rem] leading-none select-none">🧟</span>
            </div>
            <span className="absolute top-4 right-4 text-4xl animate-bounce select-none">🧠</span>
            <span className="absolute bottom-6 left-4 text-3xl select-none">🍌</span>
            <span className="absolute top-16 left-0 text-2xl select-none opacity-60">⭐</span>
          </div>
        </div>
      </section>

      {/* ── Social proof bar ── */}
      <section className="bg-banana py-4 px-6">
        <p className="text-center text-dark font-extrabold text-sm md:text-base">
          🧠 12,000 learners already eating brains — join them today
        </p>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="bg-cream py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-dark text-4xl md:text-5xl font-extrabold mb-4">
              How it works
            </h2>
            <p className="text-dark/55 text-lg max-w-md mx-auto">
              Three simple steps to becoming the most knowledgeable zombie on the block.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.num} className="flex flex-col items-center text-center md:items-start md:text-left">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-banana font-extrabold text-3xl leading-none">{s.num}</span>
                  <span className="text-3xl">{s.icon}</span>
                </div>
                <h3 className="text-dark text-xl font-extrabold mb-2">{s.title}</h3>
                <p className="text-dark/55 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="bg-dark py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-cream text-4xl md:text-5xl font-extrabold mb-4">
              Built for real learning
            </h2>
            <p className="text-cream/55 text-lg max-w-md mx-auto">
              Not just another flashcard app. Brainana is engineered to make things actually stick.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-cream/5 border border-cream/10 rounded-3xl p-8 hover:border-banana/40 transition group"
              >
                <div className="w-14 h-14 bg-banana/15 border border-banana/20 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="text-cream text-xl font-extrabold mb-3">{f.title}</h3>
                <p className="text-cream/55 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="bg-cream py-24 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-dark text-4xl md:text-5xl font-extrabold mb-4">
              Simple pricing
            </h2>
            <p className="text-dark/55 text-lg">
              Start free. Upgrade when your brain demands more.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Free */}
            <div className="bg-white rounded-3xl p-8 border border-dark/10">
              <p className="text-dark/40 text-xs font-bold uppercase tracking-widest mb-4">Free</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-dark text-5xl font-extrabold">$0</span>
              </div>
              <p className="text-dark/40 text-sm mb-8">Forever free, no strings attached.</p>

              <ul className="space-y-3 mb-8">
                {freeFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-dark/70">
                    <span className="text-zombie font-extrabold text-base">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className="block text-center border-2 border-dark/20 text-dark font-bold px-6 py-3 rounded-full hover:bg-dark hover:text-cream transition"
              >
                Get started free
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-dark rounded-3xl p-8 border-4 border-banana relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-banana text-dark text-xs font-extrabold px-5 py-1.5 rounded-full whitespace-nowrap">
                MOST POPULAR
              </div>
              <p className="text-banana text-xs font-bold uppercase tracking-widest mb-4">Pro</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-cream text-5xl font-extrabold">$9</span>
                <span className="text-cream/40 text-sm mb-2">/mo</span>
              </div>
              <p className="text-cream/40 text-sm mb-8">Everything your brain could ever want.</p>

              <ul className="space-y-3 mb-8">
                {proFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-cream/70">
                    <span className="text-banana font-extrabold text-base">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className="block text-center bg-banana text-dark font-extrabold px-6 py-3 rounded-full hover:bg-banana/90 transition"
              >
                Start free trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-banana py-24 px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-dark text-4xl md:text-5xl font-extrabold mb-4">
            Ready to eat some brains?
          </h2>
          <p className="text-dark/60 text-lg mb-10">
            Join thousands of learners who chose to grow instead of scroll.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-dark text-banana font-extrabold text-lg px-8 py-4 rounded-full hover:scale-105 transition-transform"
          >
            Create free account →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-dark border-t border-cream/10 py-10 px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🧠</span>
            <span className="text-banana font-extrabold text-lg">Brainana</span>
          </Link>

          <div className="flex items-center gap-8 text-sm text-cream/40">
            <Link href="#" className="hover:text-cream transition">About</Link>
            <Link href="#pricing" className="hover:text-cream transition">Pricing</Link>
            <Link href="#" className="hover:text-cream transition">Blog</Link>
            <Link href="#" className="hover:text-cream transition">Contact</Link>
            <Link href="/privacy" className="hover:text-cream transition">Privacy</Link>
            <Link href="/terms" className="hover:text-cream transition">Terms</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
