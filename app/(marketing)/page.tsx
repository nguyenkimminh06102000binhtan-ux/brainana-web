import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/ui-icons";
import { BrandDomainWordmark, BrandLogo } from "@/components/brand-logo";
import ThemeToggle from "../theme-toggle";

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

export default async function LandingPage() {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/home");

  return (
    <main className="min-h-screen bg-paper px-4 py-5 text-ink sm:px-5 sm:py-8">
      <header className="sticky top-3 z-40 mx-auto max-w-6xl rounded-[1.6rem] border-2 border-ink bg-paper-2/95 px-3 py-3 shadow-hard backdrop-blur sm:rounded-full sm:px-6 sm:py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex min-w-0 items-center gap-3 font-fredoka text-xl font-[700] tracking-tight sm:text-2xl">
            <BrandLogo labelClassName="hidden truncate sm:inline-flex" priority />
          </Link>
          <nav className="ml-3 flex shrink-0 items-center gap-2 text-sm sm:gap-3">
            <ThemeToggle />
            <Link
              href="/login"
            className="inline-flex min-h-10 items-center rounded-full border-2 border-ink bg-paper px-3 py-2 font-manrope text-xs font-[800] text-ink shadow-hard-sm transition active:translate-y-[2px] active:shadow-none sm:px-5 sm:py-2.5 sm:text-sm"
            >
              Log in
            </Link>
            <Link
              href="/signup"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border-2 border-ink bg-orange px-4 py-2.5 font-manrope text-xs font-[800] text-on-bright shadow-hard-red transition active:translate-y-[2px] active:shadow-hard-sm sm:px-6 sm:py-3 sm:text-sm"
          >
              Try free <Icon name="arrowRight" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 py-12 sm:py-16 md:grid-cols-[minmax(0,1fr)_minmax(320px,520px)] md:items-center md:py-20">
        <div>
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border-2 border-ink bg-yellow-soft px-4 py-2.5 font-manrope text-sm font-[800] text-ink shadow-hard-sm sm:mb-8 sm:px-5 sm:py-3">
            <Icon name="sparkles" className="h-4 w-4 text-orange-text" />
            what&apos;s new this week
          </p>
          <h1 className="font-fredoka text-5xl font-[700] leading-[0.98] tracking-tight sm:text-7xl">
            learn with <span className="text-orange-text">mems</span> that stick.
          </h1>
          <p className="mt-6 max-w-2xl font-manrope text-lg leading-8 text-ink-2 sm:mt-8 sm:text-xl sm:leading-9">
            Build tiny memory tricks, study with playful review modes, and keep every course feeling friendly instead of flat.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:flex-wrap sm:gap-5">
            <Link
              href="/courses"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-orange px-8 py-4 font-manrope text-base font-[800] text-on-bright shadow-hard-red transition active:translate-y-[2px] active:shadow-hard-sm"
            >
              Browse all courses <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
            <Link
              href="/create"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-paper-2 px-8 py-4 font-manrope text-base font-[800] text-ink shadow-hard-sm transition active:translate-y-[2px] active:shadow-none"
            >
              <Icon name="plus" className="h-4 w-4" /> Create one
            </Link>
          </div>
        </div>

        <aside className="relative min-h-[360px] overflow-hidden rounded-[1.8rem] border-2 border-ink bg-green-soft shadow-hard sm:min-h-[440px]">
          <div className="absolute left-5 top-5 z-10 rounded-[1rem] border-2 border-ink bg-paper-2 px-4 py-3 shadow-hard-sm">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-2">today&apos;s mem</p>
            <p className="mt-1 max-w-44 font-fredoka text-2xl font-[700] leading-tight">
              banana brain remembers faster.
            </p>
          </div>
          <Image
            src="/logos/brainana-mascot-v2.png"
            alt="Brainana mascot peeking over a study card"
            width={1506}
            height={1214}
            priority
            className="absolute -bottom-5 left-1/2 w-[118%] max-w-none -translate-x-1/2 object-contain drop-shadow-xl sm:-bottom-8"
          />
        </aside>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 pb-8 sm:grid-cols-2">
        {courseCards.map((course) => (
          <article key={course.title} className="overflow-hidden rounded-[1.2rem] border-2 border-ink bg-paper-2 shadow-hard-sm">
            <div className={`${course.accent} border-b-2 border-ink px-5 py-5`}>
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
                    className="rounded-full border-2 border-ink bg-paper px-3 py-1 font-manrope text-sm font-[800] text-ink shadow-hard-sm"
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
      </section>

      <section className="mx-auto max-w-6xl rounded-[1.4rem] border-2 border-ink bg-paper-2 p-4 shadow-hard sm:p-6">
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-[1rem] border-2 border-ink bg-paper p-5 shadow-hard-sm sm:p-6">
              <h2 className="font-fredoka text-2xl font-[700] tracking-tight">{feature.title}</h2>
              <p className="mt-2 font-manrope text-sm leading-6 text-ink-2">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-col gap-3 font-mono text-xs uppercase tracking-widest text-ink-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="normal-case tracking-normal"><BrandDomainWordmark className="text-lg" /></p>
          <div className="flex flex-wrap gap-5">
            <Link href="/pricing" className="hover:text-ink">Pricing</Link>
            <Link href="/terms" className="hover:text-ink">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-ink">Privacy Policy</Link>
            <Link href="/refund" className="hover:text-ink">Refund Policy</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
