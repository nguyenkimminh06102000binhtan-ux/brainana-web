import Link from "next/link";

const features = [
  {
    icon: "🧠",
    bg: "bg-banana",
    title: "Bite-sized Lessons",
    desc: "5-minute lessons that fit into any day. Learn on the bus, during lunch, or before bed.",
  },
  {
    icon: "📈",
    bg: "bg-zombie",
    title: "Track Your Growth",
    desc: "Visual streaks and progress maps that show exactly how far you've come.",
  },
  {
    icon: "🔥",
    bg: "bg-brain",
    title: "Daily Streaks",
    desc: "Build momentum. Miss a day and a zombie eats your streak. Stay consistent.",
  },
];

const steps = [
  {
    num: "1",
    color: "bg-banana text-dark",
    title: "Create your free account",
    desc: "Sign up in 30 seconds. No credit card, no nonsense.",
  },
  {
    num: "2",
    color: "bg-zombie text-dark",
    title: "Pick your learning path",
    desc: "Choose what you want to master. We'll build your personalized curriculum.",
  },
  {
    num: "3",
    color: "bg-brain text-cream",
    title: "Learn daily. Feed the zombie.",
    desc: "Your 5-minute daily lesson is waiting. The zombie is hungry.",
  },
];

const freeTier = ["5 lessons / day", "Basic progress tracking", "1 learning path", "Community access"];
const proTier = ["Unlimited lessons", "Advanced analytics", "All learning paths", "Zombie Mode 🧟", "Priority support", "Offline access"];
const teamTier = ["Everything in Pro", "Team leaderboards", "Admin dashboard", "Custom paths", "SSO & SAML", "Dedicated support"];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-dark py-28 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 bg-banana/15 text-banana border border-banana/20 rounded-full px-4 py-1.5 text-sm font-bold mb-8">
            🧟 Free to start · No credit card needed
          </div>
          <h1 className="text-cream text-5xl md:text-7xl font-extrabold leading-tight mb-6">
            Feed your brain.
            <br />
            <span className="text-banana">Become unstoppable.</span>
          </h1>
          <p className="text-cream/55 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Brainana is the playful learning platform that keeps you coming back.
            Build habits, track progress, and devour knowledge — one lesson at a time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-banana text-dark font-extrabold text-lg px-8 py-4 rounded-2xl hover:scale-105 transition-transform shadow-lg shadow-banana/20"
            >
              Start for free 🍌
            </Link>
            <Link
              href="#features"
              className="border-2 border-cream/20 text-cream font-bold text-lg px-8 py-4 rounded-2xl hover:bg-cream/10 transition"
            >
              How it works →
            </Link>
          </div>
          <p className="text-cream/25 text-sm mt-8">
            Join 10,000+ learners already feeding their brains
          </p>
        </div>
      </section>

      {/* Stats strip */}
      <section className="bg-banana py-8 px-6">
        <div className="mx-auto max-w-4xl grid grid-cols-3 gap-8 text-dark text-center">
          {[
            ["10K+", "Active learners"],
            ["500+", "Lessons available"],
            ["4.9★", "Average rating"],
          ].map(([val, label]) => (
            <div key={label}>
              <p className="text-3xl md:text-4xl font-extrabold">{val}</p>
              <p className="text-sm font-semibold text-dark/60 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-cream py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-dark text-4xl md:text-5xl font-extrabold mb-4">
              Why learners love Brainana
            </h2>
            <p className="text-dark/55 text-lg max-w-xl mx-auto">
              We made learning as addictive as scrolling — but way more rewarding.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-3xl p-8 border border-dark/10 hover:shadow-xl transition group"
              >
                <div
                  className={`w-14 h-14 ${f.bg} rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform`}
                >
                  {f.icon}
                </div>
                <h3 className="text-dark text-xl font-extrabold mb-3">{f.title}</h3>
                <p className="text-dark/55 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <div className="bg-dark rounded-3xl p-8 flex items-start gap-6">
              <div className="w-14 h-14 bg-banana/15 border border-banana/20 rounded-2xl flex items-center justify-center text-2xl shrink-0">
                🧟
              </div>
              <div>
                <h3 className="text-cream text-xl font-extrabold mb-2">Zombie Mode</h3>
                <p className="text-cream/50 leading-relaxed">
                  Hit a 7-day streak to unlock Zombie Mode. Your avatar transforms.
                  Your hunger for knowledge intensifies.
                </p>
              </div>
            </div>
            <div className="bg-dark rounded-3xl p-8 flex items-start gap-6">
              <div className="w-14 h-14 bg-zombie/15 border border-zombie/20 rounded-2xl flex items-center justify-center text-2xl shrink-0">
                🏆
              </div>
              <div>
                <h3 className="text-cream text-xl font-extrabold mb-2">Leaderboards</h3>
                <p className="text-cream/50 leading-relaxed">
                  Compete with friends and strangers. Climb the weekly board.
                  Be the zombie with the biggest brain.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-dark py-24 px-6">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-16">
            <h2 className="text-cream text-4xl md:text-5xl font-extrabold">
              Up and running in{" "}
              <span className="text-banana">3 steps</span>
            </h2>
          </div>
          <div className="flex flex-col gap-10">
            {steps.map((s) => (
              <div key={s.num} className="flex items-start gap-6">
                <div
                  className={`w-12 h-12 ${s.color} rounded-full flex items-center justify-center font-extrabold text-lg shrink-0`}
                >
                  {s.num}
                </div>
                <div className="pt-1">
                  <h3 className="text-cream text-xl font-extrabold mb-1">{s.title}</h3>
                  <p className="text-cream/50 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-cream py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-dark text-4xl md:text-5xl font-extrabold mb-4">
              Simple, honest pricing
            </h2>
            <p className="text-dark/55 text-lg">Start free. Upgrade when you&apos;re ready.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-start">
            {/* Free */}
            <div className="bg-white rounded-3xl p-8 border border-dark/10">
              <p className="text-dark/40 text-xs font-bold uppercase tracking-widest mb-4">Free</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-dark text-5xl font-extrabold">$0</span>
              </div>
              <p className="text-dark/40 text-sm mb-8">Forever free</p>
              <ul className="space-y-3 mb-8">
                {freeTier.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-dark/70">
                    <span className="text-zombie font-bold text-base">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="block text-center border-2 border-dark/20 text-dark font-bold py-3 rounded-2xl hover:bg-dark hover:text-cream transition"
              >
                Get started
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-dark rounded-3xl p-8 border-4 border-banana relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-banana text-dark text-xs font-extrabold px-4 py-1.5 rounded-full whitespace-nowrap">
                MOST POPULAR
              </div>
              <p className="text-banana text-xs font-bold uppercase tracking-widest mb-4">Pro</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-cream text-5xl font-extrabold">$9</span>
                <span className="text-cream/40 text-sm mb-2">/mo</span>
              </div>
              <p className="text-cream/40 text-sm mb-8">Billed monthly</p>
              <ul className="space-y-3 mb-8">
                {proTier.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-cream/70">
                    <span className="text-banana font-bold text-base">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="block text-center bg-banana text-dark font-extrabold py-3 rounded-2xl hover:bg-banana/90 transition"
              >
                Start free trial
              </Link>
            </div>

            {/* Team */}
            <div className="bg-white rounded-3xl p-8 border border-dark/10">
              <p className="text-dark/40 text-xs font-bold uppercase tracking-widest mb-4">Team</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-dark text-5xl font-extrabold">$29</span>
                <span className="text-dark/40 text-sm mb-2">/seat</span>
              </div>
              <p className="text-dark/40 text-sm mb-8">Per month</p>
              <ul className="space-y-3 mb-8">
                {teamTier.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-dark/70">
                    <span className="text-zombie font-bold text-base">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="block text-center border-2 border-dark/20 text-dark font-bold py-3 rounded-2xl hover:bg-dark hover:text-cream transition"
              >
                Contact sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-banana py-24 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-5xl mb-6">🧠🍌🧟</p>
          <h2 className="text-dark text-4xl md:text-5xl font-extrabold mb-4">
            Your brain is hungry.
            <br />
            Feed it.
          </h2>
          <p className="text-dark/60 text-lg mb-10">
            Join thousands of learners who chose to grow instead of scroll.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-dark text-cream font-extrabold text-lg px-10 py-4 rounded-2xl hover:scale-105 transition-transform"
          >
            Create free account →
          </Link>
        </div>
      </section>
    </>
  );
}
