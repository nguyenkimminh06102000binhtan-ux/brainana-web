import type { Metadata } from "next";
export const metadata: Metadata = { title: "Home — Brainana" };

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import GoalRing from "./goal-ring";
import HardCardsCarousel from "./hard-cards-carousel";
import AnalyticsStrip, {
  type ReviewForecastDay,
  type AccuracyTrendDay,
  type MasteryWeek,
  type EaseCourse,
} from "./analytics-strip";
import EnrolledCourseCard from "../_components/enrolled-course-card";
import { getLocale, t } from "@/utils/i18n";
import { reviewDayCutoff } from "@/utils/review-schedule";
import { Icon } from "@/components/ui-icons";

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

type HardCard = {
  itemId: string;
  courseSlug: string;
  courseTitle: string;
  frontText: string;
  backText: string;
  score: number;
  reason: string;
  incorrectCount: number;
  easeFactor: number;
  isDue: boolean;
  markedHard: boolean;
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

  const _now = new Date();
  const sevenDaysAgo = new Date(Date.UTC(_now.getUTCFullYear(), _now.getUTCMonth(), _now.getUTCDate() - 7));
  const fourWeeksAgo = new Date(Date.UTC(_now.getUTCFullYear(), _now.getUTCMonth(), _now.getUTCDate() - 28));

  const activeOriginLanguage = (profile?.active_origin_language as string | null) ?? null;

  const [
    { data: sessionsToday },
    { data: enrolledRaw },
    { data: discoverRaw },
    { data: recentSessions },
    { data: recentMastered },
  ] = await Promise.all([
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

    supabase
      .from("study_sessions")
      .select("started_at, correct_count, items_studied")
      .eq("user_id", user.id)
      .gte("started_at", sevenDaysAgo.toISOString())
      .gt("items_studied", 0),

    supabase
      .from("item_progress")
      .select("mastered_at")
      .eq("user_id", user.id)
      .eq("mastered", true)
      .gte("mastered_at", fourWeeksAgo.toISOString())
      .not("mastered_at", "is", null),
  ]);

  const studiedToday = (sessionsToday ?? []).reduce((sum, s) => sum + (s.items_studied ?? 0), 0);

  const enrolledCourses = ((enrolledRaw ?? []) as unknown as {
    courses: CourseRow;
  }[]).map((row) => row.courses) as CourseRow[];

  const discoverCourses = (discoverRaw ?? []) as CourseRow[];

  // Single item_progress query for all per-course + global stats
  const courseIds = enrolledCourses.map((c) => c.id);
  const dueCutoff = reviewDayCutoff(); // Date — avoid string-format mismatch with PostgREST "+00:00" vs ".000Z"

  const { data: progressRows } = courseIds.length > 0
    ? await supabase
        .from("item_progress")
        .select(`
          item_id,
          course_id,
          mastered,
          next_review_at,
          ease_factor,
          correct_count,
          incorrect_count,
          hard,
          ignored,
          items!item_id (front_text, back_text),
          courses!course_id (title, slug)
        `)
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
    } else if (!row.ignored && new Date(row.next_review_at) < dueCutoff) {
      totalDue++;
      dueByCourse[row.course_id] = (dueByCourse[row.course_id] ?? 0) + 1;
    }
  }

  const hardCards = ((progressRows ?? []) as unknown as Array<{
    item_id: string;
    mastered: boolean;
    next_review_at: string;
    ease_factor: number | string | null;
    correct_count: number | null;
    incorrect_count: number | null;
    hard: boolean | null;
    ignored: boolean | null;
    items: { front_text: string; back_text: string } | { front_text: string; back_text: string }[] | null;
    courses: { title: string; slug: string } | { title: string; slug: string }[] | null;
  }>)
    .map((row): HardCard | null => {
      const item = Array.isArray(row.items) ? row.items[0] : row.items;
      const course = Array.isArray(row.courses) ? row.courses[0] : row.courses;
      if (!item || !course || row.mastered || row.ignored) return null;

      const incorrectCount = row.incorrect_count ?? 0;
      const correctCount = row.correct_count ?? 0;
      const easeFactor = Number(row.ease_factor ?? 2.5);
      const markedHard = Boolean(row.hard);
      const isDue = new Date(row.next_review_at) < dueCutoff;
      const lowEase = easeFactor <= 2.3;
      const errorHeavy = incorrectCount >= 2 || incorrectCount > correctCount;

      if (!markedHard && !errorHeavy && !lowEase && !(isDue && incorrectCount > 0)) return null;

      const score =
        (markedHard ? 100 : 0) +
        incorrectCount * 16 +
        (isDue ? 24 : 0) +
        (lowEase ? Math.round((2.5 - easeFactor) * 60) : 0) +
        (incorrectCount > correctCount ? 12 : 0);

      const reason = markedHard
        ? "Marked hard"
        : incorrectCount >= 2
          ? `${incorrectCount} misses`
          : lowEase
            ? `Ease ${easeFactor.toFixed(1)}`
            : "Due again";

      return {
        itemId: row.item_id,
        courseSlug: course.slug,
        courseTitle: course.title,
        frontText: item.front_text,
        backText: item.back_text,
        score,
        reason,
        incorrectCount,
        easeFactor,
        isDue,
        markedHard,
      };
    })
    .filter((card): card is HardCard => card !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const coursesInProgress = enrolledCourses.filter((c) => studiedCourseIds.has(c.id)).length;

  // ── Analytics data — all bucketing uses UTC dates to match Supabase timestamps ──

  const DAY_ABBR = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  // Helper: UTC date string "YYYY-MM-DD" offset by `offset` days from today
  const now = new Date();
  function utcDay(offset: number) {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset));
  }

  // Review load forecast: next 7 UTC days
  const reviewForecast: ReviewForecastDay[] = Array.from({ length: 7 }, (_, i) => {
    const d = utcDay(i);
    return { day: d.toISOString().slice(0, 10), dayLabel: i === 0 ? "·" : DAY_ABBR[d.getUTCDay()], count: 0, isToday: i === 0 };
  });
  for (const row of progressRows ?? []) {
    if (row.mastered || row.ignored) continue;
    const rev = new Date(row.next_review_at);
    const dayStr = new Date(Date.UTC(rev.getUTCFullYear(), rev.getUTCMonth(), rev.getUTCDate())).toISOString().slice(0, 10);
    const slot = dayStr < reviewForecast[0].day
      ? reviewForecast[0]
      : reviewForecast.find((d) => d.day === dayStr);
    if (slot) slot.count++;
  }

  // Accuracy trend: correct % per UTC day over the last 7 days
  const byDay: Record<string, { correct: number; total: number }> = {};
  for (const s of recentSessions ?? []) {
    // started_at from Supabase is ISO 8601 — slice(0,10) gives the UTC date
    const day = (s.started_at as string).slice(0, 10);
    if (!byDay[day]) byDay[day] = { correct: 0, total: 0 };
    byDay[day].correct += s.correct_count ?? 0;
    byDay[day].total += s.items_studied ?? 0;
  }
  const accuracyTrend: AccuracyTrendDay[] = Array.from({ length: 7 }, (_, i) => {
    const d = utcDay(i - 6);
    const day = d.toISOString().slice(0, 10);
    const data = byDay[day];
    return {
      day,
      dayLabel: i === 6 ? "·" : DAY_ABBR[d.getUTCDay()],
      pct: data && data.total > 0 ? Math.round((data.correct / data.total) * 100) : null,
    };
  });

  // Mastery velocity: cards mastered per UTC week over last 4 weeks
  const byWeek: Record<string, number> = {};
  for (const row of recentMastered ?? []) {
    const d = new Date((row as { mastered_at: string }).mastered_at);
    const dow = d.getUTCDay();
    const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - (dow === 0 ? 6 : dow - 1)));
    byWeek[monday.toISOString().slice(0, 10)] = (byWeek[monday.toISOString().slice(0, 10)] ?? 0) + 1;
  }
  const cdow = now.getUTCDay();
  const currentMonday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (cdow === 0 ? 6 : cdow - 1)));
  const masteryVelocity: MasteryWeek[] = Array.from({ length: 4 }, (_, i) => {
    const d = new Date(Date.UTC(currentMonday.getUTCFullYear(), currentMonday.getUTCMonth(), currentMonday.getUTCDate() - (3 - i) * 7));
    const key = d.toISOString().slice(0, 10);
    return { weekLabel: `${MONTH_ABBR[d.getUTCMonth()]} ${d.getUTCDate()}`, count: byWeek[key] ?? 0 };
  });

  // Ease factor per course (active cards only, hardest first)
  const easeSum: Record<string, number> = {};
  const easeCount: Record<string, number> = {};
  for (const row of progressRows ?? []) {
    if (row.mastered || row.ignored) continue;
    easeSum[row.course_id] = (easeSum[row.course_id] ?? 0) + Number(row.ease_factor ?? 2.5);
    easeCount[row.course_id] = (easeCount[row.course_id] ?? 0) + 1;
  }
  const easeByCourse: EaseCourse[] = enrolledCourses
    .filter((c) => (easeCount[c.id] ?? 0) > 0)
    .map((c) => ({ courseId: c.id, title: c.title, slug: c.slug, avgEase: easeSum[c.id] / easeCount[c.id] }))
    .sort((a, b) => a.avgEase - b.avgEase);

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
    <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">

        {/* ── LEFT COLUMN ── */}
        <div className="flex min-w-0 flex-col gap-6">

          {/* Header */}
          <section className="flex items-center gap-4 rounded-[1.4rem] border-2 border-ink bg-paper-2 p-4 shadow-hard-sm sm:p-5">
            {profile?.avatar_url ? (
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-blue">
                <Image src={profile.avatar_url} alt={displayName} fill sizes="56px" className="object-cover" />
              </div>
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue">
                <span className="font-mono text-xl font-[700] text-ocean">
                  {displayName[0]?.toUpperCase()}
                </span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="font-fredoka text-2xl font-[700] leading-tight tracking-tight sm:text-3xl">
                {t(loc.home.welcomeBack, { name: displayName })}
              </h1>
              <p className="font-manrope text-sm text-ink-2">
                {totalDue > 0
                  ? t(loc.home.cardsDueProgress, { due: fmt(totalDue), courses: coursesInProgress })
                  : t(loc.home.allCaughtUpProgress, { courses: coursesInProgress })}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 pb-1">
                <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-paper px-3 py-1 font-mono text-xs font-[700] shadow-hard-sm sm:bg-paper-2">
                  <Icon name="flame" className="h-3.5 w-3.5 text-orange-text" /> {t(loc.home.dayStreak, { count: streak })}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-paper px-3 py-1 font-mono text-xs font-[700] shadow-hard-sm sm:bg-paper-2">
                  <Icon name="check" className="h-3.5 w-3.5 text-blue-text" /> {t(loc.home.mastered, { count: fmt(totalMastered) })}
                </span>
              </div>
            </div>
          </section>

          {/* Analytics Strip */}
          <AnalyticsStrip
            reviewForecast={reviewForecast}
            accuracyTrend={accuracyTrend}
            masteryVelocity={masteryVelocity}
            easeByCourse={easeByCourse}
          />

          {/* Words to Tame — carousel with arrow navigation */}
          {hardCards.length > 0 && (
            <section>
              <HardCardsCarousel
                cards={hardCards.map((c) => ({
                  itemId: c.itemId,
                  courseSlug: c.courseSlug,
                  courseTitle: c.courseTitle,
                  frontText: c.frontText,
                  backText: c.backText,
                  reason: c.reason,
                  incorrectCount: c.incorrectCount,
                  isDue: c.isDue,
                }))}
              />
            </section>
          )}

          {/* Your Courses */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-fredoka text-2xl font-[700] tracking-tight">{loc.home.yourCourses}</h2>
              <Link href="/library" className="inline-flex items-center gap-1 font-mono text-xs text-ink-2 transition hover:text-orange-text">
                {loc.common.seeAll} <Icon name="chevronRight" className="h-3.5 w-3.5" />
              </Link>
            </div>

            {enrolledCourses.length === 0 ? (
              <div className="flex flex-col gap-4 rounded-[1.4rem] border-2 border-ink bg-paper-2 px-5 py-5 shadow-hard-sm sm:flex-row sm:items-center sm:px-6">
                <p className="font-manrope text-sm text-ink-2">{loc.home.noCourses}</p>
                <Link
                  href="/browse"
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border-2 border-ink bg-orange px-4 py-2 font-manrope text-sm font-[800] text-on-bright shadow-hard-sm transition hover:opacity-90 active:translate-y-[1px] sm:ml-auto"
                >
                  {loc.common.browseCourses} <Icon name="arrowRight" className="h-4 w-4" />
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
                <Link href={`/browse?source_language=${encodeURIComponent(activeOriginLanguage)}`} className="inline-flex items-center gap-1 font-mono text-xs text-ink-2 transition hover:text-orange-text">
                  {loc.common.seeAll} <Icon name="chevronRight" className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {discoverCourses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/c/${course.slug}`}
                    className="flex min-h-20 items-center gap-3 rounded-[1.2rem] border-2 border-ink bg-paper-2 p-4 shadow-hard-sm transition hover:-translate-y-0.5 hover:bg-yellow-soft hover:shadow-hard"
                  >
                    {course.cover_image_url ? (
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                        <Image src={course.cover_image_url} alt={course.title} fill sizes="48px" className="object-cover" />
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
          <aside className="flex flex-col items-center rounded-[1.4rem] border-2 border-ink bg-paper-2 p-5 shadow-hard">
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

          {/* Today's Review */}
          {totalDue > 0 && topDueCourse ? (
            <aside className="rounded-[1.4rem] border-2 border-ink bg-red-soft p-5 shadow-hard">
              <p className="font-mono text-xs uppercase tracking-widest text-ink-2">{loc.home.todaysReview}</p>
              <p className="mt-2 font-fredoka text-2xl font-[700] leading-tight tracking-tight">
                {t(loc.home.cardsDue, { count: fmt(totalDue) })}
              </p>
              <p className="mt-1 font-manrope text-sm text-ink-2">
                {t(loc.home.reviewEstimate, { minutes: estMinutes, course: topDueCourse.title })}
              </p>
              <Link
                href={`/study/${topDueCourse.slug}`}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border-2 border-ink bg-orange px-4 py-2 font-manrope text-sm font-[800] text-on-bright shadow-hard-red transition hover:opacity-90 active:translate-y-[1px]"
              >
                {loc.home.startReview} <Icon name="arrowRight" className="h-4 w-4" />
              </Link>
            </aside>
          ) : (
            <aside className="rounded-[1.4rem] border-2 border-ink bg-green-soft p-5 shadow-hard">
              <p className="font-mono text-xs uppercase tracking-widest text-ink-2">{loc.home.todaysReview}</p>
              <p className="mt-2 font-fredoka text-2xl font-[700] tracking-tight">{loc.home.allCaughtUp}</p>
              <p className="mt-1 font-manrope text-sm text-ink-2">{loc.home.noCardsDue}</p>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
