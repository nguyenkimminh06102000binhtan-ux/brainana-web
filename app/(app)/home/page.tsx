import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import GoalRing from "./goal-ring";
import EnrolledCourseCard from "../_components/enrolled-course-card";
import { getLocale, t } from "@/utils/i18n";

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
};

export default async function HomePage() {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, current_streak, daily_goal, onboarding_completed, active_origin_language")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarding_completed) redirect("/start");

  const dailyGoal: number = profile?.daily_goal ?? 10;
  const streak: number = profile?.current_streak ?? 0;
  const displayName = profile?.display_name ?? "there";

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const activeOriginLanguage = (profile?.active_origin_language as string | null) ?? null;

  const [{ data: sessionsToday }, { data: enrolledRaw }, { data: discoverRaw }] = await Promise.all([
    supabase
      .from("study_sessions")
      .select("items_studied")
      .eq("user_id", user.id)
      .gte("started_at", todayStart.toISOString()),

    supabase
      .from("user_courses")
      .select("courses!course_id (id, slug, title, category, cover_image_url, level, card_count)")
      .eq("user_id", user.id),

    activeOriginLanguage
      ? supabase
          .from("courses")
          .select("id, slug, title, category, cover_image_url, level, card_count")
          .eq("visibility", "public")
          .eq("is_published", true)
          .eq("source_language", activeOriginLanguage)
          .order("learner_count", { ascending: false })
          .limit(4)
      : Promise.resolve({ data: [] }),
  ]);

  const studiedToday = (sessionsToday ?? []).reduce((sum, s) => sum + (s.items_studied ?? 0), 0);

  const enrolledCourses = ((enrolledRaw ?? []) as unknown as {
    courses: CourseRow;
  }[]).map((row) => row.courses) as CourseRow[];

  const discoverCourses = (discoverRaw ?? []) as CourseRow[];

  // Single item_progress query for all per-course + global stats
  const courseIds = enrolledCourses.map((c) => c.id);
  const now = new Date().toISOString();

  const { data: progressRows } = courseIds.length > 0
    ? await supabase
        .from("item_progress")
        .select("course_id, mastered, next_review_at")
        .eq("user_id", user.id)
        .in("course_id", courseIds)
    : { data: [] };

  let totalMastered = 0;
  let totalDue = 0;
  const studiedCourseIds = new Set<string>();
  const masteredByCourse: Record<string, number> = {};
  const dueByCourse: Record<string, number> = {};

  for (const row of progressRows ?? []) {
    studiedCourseIds.add(row.course_id);
    if (row.mastered) {
      totalMastered++;
      masteredByCourse[row.course_id] = (masteredByCourse[row.course_id] ?? 0) + 1;
    } else if (row.next_review_at <= now) {
      totalDue++;
      dueByCourse[row.course_id] = (dueByCourse[row.course_id] ?? 0) + 1;
    }
  }

  const coursesInProgress = enrolledCourses.filter((c) => studiedCourseIds.has(c.id)).length;

  const topDueCourse = enrolledCourses
    .filter((c) => (dueByCourse[c.id] ?? 0) > 0)
    .sort((a, b) => (dueByCourse[b.id] ?? 0) - (dueByCourse[a.id] ?? 0))[0] ?? null;

  const estMinutes = Math.ceil(totalDue * 0.5);
  const loc = getLocale(activeOriginLanguage);
  const levelLabels: Record<string, string> = {
    beginner: loc.course.beginner,
    intermediate: loc.course.intermediate,
    advanced: loc.course.advanced,
  };
  const cardLabels = {
    cards: loc.common.cards,
    masteredProgress: loc.library.masteredProgress,
    notStarted: loc.library.notStarted,
    due: loc.library.due,
    upToDate: loc.library.upToDate,
    study: loc.library.study,
    categories: loc.categories,
    levels: levelLabels,
  };

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
                {t(loc.home.welcomeBack, { name: displayName })} 🧠
              </h1>
              <p className="font-manrope text-sm text-ink-2">
                {totalDue > 0
                  ? t(loc.home.cardsDueProgress, { due: fmt(totalDue), courses: coursesInProgress })
                  : t(loc.home.allCaughtUpProgress, { courses: coursesInProgress })}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-paper-2 px-3 py-1 font-mono text-xs font-[700] shadow-hard-sm">
                  🔥 {t(loc.home.dayStreak, { count: streak })}
                </span>
                <span className="rounded-full bg-paper-2 px-3 py-1 font-mono text-xs font-[700] shadow-hard-sm">
                  🧠 {t(loc.home.mastered, { count: fmt(totalMastered) })}
                </span>
              </div>
            </div>
          </section>

          {/* Today's Review card */}
          {totalDue > 0 && topDueCourse ? (
            <section className="rounded-lg bg-red-soft p-5 shadow-hard">
              <p className="font-mono text-xs uppercase tracking-widest text-ink-2">{loc.home.todaysReview}</p>
              <div className="mt-2 flex items-center justify-between gap-4">
                <div>
                  <p className="font-fredoka text-2xl font-[700] leading-tight tracking-tight">
                    {t(loc.home.cardsDue, { count: fmt(totalDue) })}
                  </p>
                  <p className="font-manrope text-sm text-ink-2">
                    {t(loc.home.reviewEstimate, { minutes: estMinutes, course: topDueCourse.title })}
                  </p>
                </div>
                <Link
                  href={`/study/${topDueCourse.slug}`}
                  className="shrink-0 rounded-full bg-orange px-5 py-2.5 font-manrope text-sm font-[800] text-on-bright shadow-hard-red transition hover:opacity-90 active:translate-y-[2px] active:shadow-hard-sm"
                >
                  {loc.home.startReview} →
                </Link>
              </div>
            </section>
          ) : (
            <section className="rounded-lg bg-green-soft p-5 shadow-hard">
              <p className="font-mono text-xs uppercase tracking-widest text-ink-2">{loc.home.todaysReview}</p>
              <p className="mt-2 font-fredoka text-2xl font-[700] tracking-tight">{loc.home.allCaughtUp} 🎉</p>
              <p className="mt-1 font-manrope text-sm text-ink-2">{loc.home.noCardsDue}</p>
            </section>
          )}

          {/* Your Courses */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-fredoka text-2xl font-[700] tracking-tight">{loc.home.yourCourses}</h2>
              <Link href="/library" className="font-mono text-xs text-ink-2 hover:text-orange-text transition">
                {loc.common.seeAll} →
              </Link>
            </div>

            {enrolledCourses.length === 0 ? (
              <div className="flex items-center gap-4 rounded-xl bg-paper-2 px-6 py-5 shadow-hard-sm">
                <p className="font-manrope text-sm text-ink-2">{loc.home.noCourses}</p>
                <Link
                  href="/browse"
                  className="ml-auto shrink-0 rounded-full bg-orange px-4 py-2 font-manrope text-sm font-[800] text-on-bright shadow-hard-sm transition hover:opacity-90 active:translate-y-[1px]"
                >
                  {loc.common.browseCourses} →
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {enrolledCourses.slice(0, 4).map((course) => (
                  <EnrolledCourseCard
                    key={course.id}
                    labels={cardLabels}
                    course={{
                      ...course,
                      masteredCount: masteredByCourse[course.id] ?? 0,
                      dueCount: dueByCourse[course.id] ?? 0,
                      hasStudied: studiedCourseIds.has(course.id),
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Discover courses based on origin language */}
          {activeOriginLanguage && discoverCourses.length > 0 && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-fredoka text-2xl font-[700] tracking-tight">{loc.home.discover}</h2>
                  <p className="font-manrope text-xs text-ink-2">{t(loc.home.coursesFrom, { language: activeOriginLanguage })}</p>
                </div>
                <Link href={`/browse?source_language=${encodeURIComponent(activeOriginLanguage)}`} className="font-mono text-xs text-ink-2 hover:text-orange-text transition">
                  {loc.common.seeAll} →
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {discoverCourses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/c/${course.slug}`}
                    className="flex items-center gap-3 rounded-xl bg-paper-2 p-4 shadow-hard-sm transition hover:-translate-y-0.5 hover:shadow-hard"
                  >
                    {course.cover_image_url ? (
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                        <Image src={course.cover_image_url} alt={course.title} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue">
                        <span className="font-mono text-xs text-ocean">{course.title[0]}</span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-manrope text-sm font-[800] text-ink">{course.title}</p>
                      <p className="font-mono text-xs text-ink-2">{course.card_count} cards{course.level ? ` · ${(levelLabels[course.level] ?? course.level).toLowerCase()}` : ""}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div className="flex flex-col gap-4">
          <aside className="rounded-lg bg-paper-2 p-5 shadow-hard flex flex-col items-center">
            <GoalRing
              studied={studiedToday}
              goal={dailyGoal}
              courseSlug={topDueCourse?.slug ?? (enrolledCourses[0]?.slug ?? null)}
              labels={{
                todayGoal: loc.home.todayGoal,
                goalReached: loc.home.goalReached,
                continueLearning: loc.home.continueLearning,
                browseAction: loc.home.browseAction,
              }}
            />
          </aside>

          <aside className="rounded-lg bg-paper-2 p-5 shadow-hard">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-2">{loc.home.quickLinks}</p>
            <div className="flex flex-col gap-2">
              <Link href="/browse" className="flex items-center justify-between rounded-lg bg-paper px-4 py-3 font-manrope text-sm font-[700] text-ink shadow-hard-sm transition hover:bg-orange hover:text-on-bright">
                {loc.common.browseCourses} <span>→</span>
              </Link>
              <Link href="/library" className="flex items-center justify-between rounded-lg bg-paper px-4 py-3 font-manrope text-sm font-[700] text-ink shadow-hard-sm transition hover:bg-orange hover:text-on-bright">
                {loc.home.myLibrary} <span>→</span>
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
