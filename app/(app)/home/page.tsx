import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import GoalRing from "./goal-ring";

const LEVEL_HEADER: Record<string, string> = {
  beginner: "bg-green-soft",
  intermediate: "bg-yellow-soft",
  advanced: "bg-red-soft",
};
const STRIPE = {
  backgroundImage:
    "repeating-linear-gradient(-45deg,transparent,transparent 8px,rgba(0,0,0,0.04) 8px,rgba(0,0,0,0.04) 9px)",
};

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  cover_image_url: string | null;
  level: string | null;
  card_count: number;
  completed_items: number;
  last_studied_at: string | null;
};

export default async function HomePage() {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Profile + streak + goal
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, current_streak, daily_goal, onboarding_completed")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarding_completed) redirect("/start");

  const dailyGoal: number = profile?.daily_goal ?? 10;
  const streak: number = profile?.current_streak ?? 0;
  const displayName = profile?.display_name ?? "there";

  // Today's start (UTC midnight)
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const [
    { count: totalMastered },
    { count: totalDue },
    { data: sessionsToday },
    { data: enrolledRaw },
  ] = await Promise.all([
    supabase
      .from("item_progress")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("mastered", true),

    supabase
      .from("item_progress")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("mastered", false)
      .lte("next_review_at", new Date().toISOString()),

    supabase
      .from("study_sessions")
      .select("items_studied")
      .eq("user_id", user.id)
      .gte("started_at", todayStart.toISOString()),

    supabase
      .from("user_courses")
      .select("completed_items, last_studied_at, courses!course_id (id, slug, title, category, cover_image_url, level, card_count, creator_id)")
      .eq("user_id", user.id)
      .order("last_studied_at", { ascending: false, nullsFirst: false }),
  ]);

  const studiedToday = (sessionsToday ?? []).reduce((sum, s) => sum + (s.items_studied ?? 0), 0);
  const dueCount = totalDue ?? 0;
  const masteredCount = totalMastered ?? 0;

  // Build enrolled courses list
  const enrolledCourses = ((enrolledRaw ?? []) as unknown as {
    completed_items: number;
    last_studied_at: string | null;
    courses: CourseRow & { creator_id: string };
  }[]).map((row) => ({
    ...row.courses,
    completed_items: row.completed_items,
    last_studied_at: row.last_studied_at,
  })) as CourseRow[];

  // Per-course due counts from item_progress
  const courseIds = enrolledCourses.map((c) => c.id);
  const now = new Date().toISOString();

  const { data: dueRows } = courseIds.length > 0
    ? await supabase
        .from("item_progress")
        .select("course_id")
        .eq("user_id", user.id)
        .eq("mastered", false)
        .lte("next_review_at", now)
        .in("course_id", courseIds)
    : { data: [] };

  const dueByCourse: Record<string, number> = {};
  for (const row of dueRows ?? []) {
    dueByCourse[row.course_id] = (dueByCourse[row.course_id] ?? 0) + 1;
  }

  // Course with most due items → used for goal ring CTA + review card
  const topDueCourse = enrolledCourses
    .filter((c) => (dueByCourse[c.id] ?? 0) > 0)
    .sort((a, b) => (dueByCourse[b.id] ?? 0) - (dueByCourse[a.id] ?? 0))[0] ?? null;

  const inProgressCourses = enrolledCourses.filter((c) => c.last_studied_at !== null);
  const coursesInProgress = inProgressCourses.length;

  const estMinutes = Math.ceil(dueCount * 0.5);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">

        {/* ── LEFT COLUMN ── */}
        <div className="flex flex-col gap-6">

          {/* Header */}
          <section className="flex items-center gap-4">
            {profile?.avatar_url ? (
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-blue">
                <Image src={profile.avatar_url} alt={displayName} fill className="object-cover" />
              </div>
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue">
                <span className="font-mono text-xl font-[700] text-ocean">
                  {displayName[0]?.toUpperCase()}
                </span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="font-fredoka text-3xl font-[700] leading-tight tracking-tight">
                Welcome back, {displayName} 🧠
              </h1>
              <p className="font-manrope text-sm text-ink-2">
                {dueCount > 0
                  ? `${fmt(dueCount)} cards due · ${coursesInProgress} course${coursesInProgress !== 1 ? "s" : ""} in progress`
                  : `All caught up · ${coursesInProgress} course${coursesInProgress !== 1 ? "s" : ""} in progress`}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-paper-2 px-3 py-1 font-mono text-xs font-[700] shadow-hard-sm">
                  🔥 {streak} day streak
                </span>
                <span className="rounded-full bg-paper-2 px-3 py-1 font-mono text-xs font-[700] shadow-hard-sm">
                  🧠 {fmt(masteredCount)} mastered
                </span>
              </div>
            </div>
          </section>

          {/* Today's Review card */}
          {dueCount > 0 && topDueCourse ? (
            <section className="rounded-lg bg-red-soft p-5 shadow-hard">
              <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Today&apos;s Review</p>
              <div className="mt-2 flex items-center justify-between gap-4">
                <div>
                  <p className="font-fredoka text-2xl font-[700] leading-tight tracking-tight">
                    {fmt(dueCount)} cards due
                  </p>
                  <p className="font-manrope text-sm text-ink-2">
                    ~{estMinutes} min · {topDueCourse.title}
                  </p>
                </div>
                <Link
                  href={`/study/${topDueCourse.slug}`}
                  className="shrink-0 rounded-full bg-orange px-5 py-2.5 font-manrope text-sm font-[800] text-white shadow-hard-red transition hover:opacity-90 active:translate-y-[2px] active:shadow-hard-sm"
                >
                  Start review →
                </Link>
              </div>
            </section>
          ) : (
            <section className="rounded-lg bg-green-soft p-5 shadow-hard">
              <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Today&apos;s Review</p>
              <p className="mt-2 font-fredoka text-2xl font-[700] tracking-tight">All caught up! 🎉</p>
              <p className="mt-1 font-manrope text-sm text-ink-2">No cards due right now. Keep the streak going!</p>
            </section>
          )}

          {/* Your Courses */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-fredoka text-2xl font-[700] tracking-tight">Your Courses</h2>
              <Link href="/library" className="font-mono text-xs text-ink-2 hover:text-orange transition">
                See all →
              </Link>
            </div>

            {enrolledCourses.length === 0 ? (
              <div className="flex items-center gap-4 rounded-xl bg-paper-2 px-6 py-5 shadow-hard-sm">
                <p className="font-manrope text-sm text-ink-2">No courses yet. Find something to learn!</p>
                <Link
                  href="/browse"
                  className="ml-auto shrink-0 rounded-full bg-orange px-4 py-2 font-manrope text-sm font-[800] text-white shadow-hard-sm transition hover:opacity-90 active:translate-y-[1px]"
                >
                  Browse courses →
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {enrolledCourses.slice(0, 4).map((course) => {
                  const pct = course.card_count > 0
                    ? Math.round((course.completed_items / course.card_count) * 100)
                    : 0;
                  const due = dueByCourse[course.id] ?? 0;
                  const headerBg = LEVEL_HEADER[course.level ?? ""] ?? "bg-blue/20";

                  return (
                    <div key={course.id} className="overflow-hidden rounded-xl bg-paper-2 shadow-hard transition hover:-translate-y-0.5">
                      {/* Card header */}
                      <Link href={`/c/${course.slug}`} className={`relative flex h-16 items-end px-4 pb-2.5 ${headerBg} block`} style={STRIPE}>
                        {course.cover_image_url ? (
                          <Image src={course.cover_image_url} alt={course.title} fill className="object-cover" />
                        ) : (
                          <span className="relative z-10 font-mono text-xs uppercase tracking-widest text-ink/50">
                            [{course.category?.toLowerCase() ?? "course"}{course.level ? ` · ${course.level}` : ""}]
                          </span>
                        )}
                      </Link>

                      <div className="flex flex-col gap-2 p-4">
                        <div>
                          <Link href={`/c/${course.slug}`} className="font-fredoka text-lg font-[700] leading-tight tracking-tight hover:text-orange">
                            {course.title}
                          </Link>
                          <p className="font-mono text-xs text-ink-2">{course.card_count} cards</p>
                        </div>

                        {/* Progress bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between font-mono text-xs text-ink-2">
                            <span>{course.completed_items}/{course.card_count} mastered</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper">
                            <div className="h-full rounded-full bg-orange transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>

                        {/* Due badge + study button */}
                        <div className="flex items-center justify-between">
                          {due > 0 ? (
                            <span className="rounded-full bg-orange/10 px-2.5 py-0.5 font-mono text-xs font-[700] text-orange">
                              {due} due
                            </span>
                          ) : (
                            <span className="font-mono text-xs text-ink-3">Up to date ✓</span>
                          )}
                          <Link
                            href={`/study/${course.slug}`}
                            className="rounded-full bg-orange px-4 py-1.5 font-manrope text-sm font-[800] text-white shadow-hard-sm transition hover:opacity-90 active:translate-y-[1px]"
                          >
                            Study →
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div className="flex flex-col gap-4">
          {/* Goal Ring card */}
          <aside className="rounded-lg bg-paper-2 p-5 shadow-hard flex flex-col items-center">
            <GoalRing
              studied={studiedToday}
              goal={dailyGoal}
              courseSlug={topDueCourse?.slug ?? (enrolledCourses[0]?.slug ?? null)}
            />
          </aside>

          {/* Quick links */}
          <aside className="rounded-lg bg-paper-2 p-5 shadow-hard">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-2">Quick links</p>
            <div className="flex flex-col gap-2">
              <Link href="/browse" className="flex items-center justify-between rounded-lg bg-paper px-4 py-3 font-manrope text-sm font-[700] text-ink shadow-hard-sm transition hover:bg-orange hover:text-white">
                Browse courses <span>→</span>
              </Link>
              <Link href="/library" className="flex items-center justify-between rounded-lg bg-paper px-4 py-3 font-manrope text-sm font-[700] text-ink shadow-hard-sm transition hover:bg-orange hover:text-white">
                My library <span>→</span>
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
