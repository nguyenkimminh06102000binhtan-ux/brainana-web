import type { Metadata } from "next";
export const metadata: Metadata = { title: "My Library — Brainana" };

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import EnrolledCourseCard from "../_components/enrolled-course-card";
import { getLocale, t } from "@/utils/i18n";
import { reviewDayCutoff } from "@/utils/review-schedule";

type CourseCard = {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  cover_image_url: string | null;
  level: string | null;
  card_count: number;
  learner_count: number;
  rating: number;
  has_audio: boolean;
  mems_count: number;
  is_published: boolean;
  visibility: string;
};

const LEVEL_HEADER: Record<string, string> = {
  beginner:     "bg-green-soft",
  intermediate: "bg-yellow-soft",
  advanced:     "bg-red-soft",
};
const LEVEL_DOT: Record<string, string> = {
  beginner:     "#4ade80",
  intermediate: "#fbbf24",
  advanced:     "#f97316",
};
const STRIPE = {
  backgroundImage:
    "repeating-linear-gradient(-45deg,transparent,transparent 8px,rgba(0,0,0,0.04) 8px,rgba(0,0,0,0.04) 9px)",
};

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export default async function LibraryPage() {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("active_origin_language")
    .eq("id", user.id)
    .single();
  const loc = getLocale((profileData?.active_origin_language as string | null) ?? null);

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

  const [{ data: createdRaw }, { data: enrolledRaw }] = await Promise.all([
    supabase
      .from("courses")
      .select("id, slug, title, category, cover_image_url, level, card_count, learner_count, rating, has_audio, mems_count, is_published, visibility")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("user_courses")
      .select("courses!course_id (id, slug, title, category, cover_image_url, level, card_count, learner_count, rating, has_audio, mems_count, is_published, visibility, creator_id)")
      .eq("user_id", user.id),
  ]);

  const created = (createdRaw ?? []) as CourseCard[];

  const allEnrolled = ((enrolledRaw ?? []) as unknown as {
    courses: CourseCard & { creator_id: string };
  }[])
    .filter((row) => row.courses.creator_id !== user.id)
    .map((row) => row.courses) as (CourseCard & { creator_id: string })[];

  // Single query for all progress data across enrolled courses
  const enrolledCourseIds = allEnrolled.map((c) => c.id);
  const dueCutoff = reviewDayCutoff().toISOString();

  const { data: progressRows } = enrolledCourseIds.length > 0
    ? await supabase
        .from("item_progress")
        .select("course_id, mastered, next_review_at")
        .eq("user_id", user.id)
        .in("course_id", enrolledCourseIds)
    : { data: [] };

  const studiedCourseIds = new Set<string>();
  const masteredByCourse: Record<string, number> = {};
  const dueByCourse: Record<string, number> = {};

  for (const row of progressRows ?? []) {
    studiedCourseIds.add(row.course_id);
    if (row.mastered) {
      masteredByCourse[row.course_id] = (masteredByCourse[row.course_id] ?? 0) + 1;
    } else if (row.next_review_at < dueCutoff) {
      dueByCourse[row.course_id] = (dueByCourse[row.course_id] ?? 0) + 1;
    }
  }

  const learning = allEnrolled.filter((c) => studiedCourseIds.has(c.id));
  const saved    = allEnrolled.filter((c) => !studiedCourseIds.has(c.id));

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 space-y-10">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">{loc.library.eyebrow}</p>
        <h1 className="mt-1 font-fredoka text-4xl font-[700] tracking-tight">
          {loc.library.titlePrefix} <span className="text-orange-text">{loc.library.titleAccent}</span>
        </h1>
      </div>

      <Section title={loc.library.myCourses} count={created.length} emptyText={loc.library.emptyCreated} emptyLink={{ href: "/create", label: loc.library.createCourse }}>
        {created.map((course) => (
          <CreatedCard key={course.id} course={course} labels={{ cards: loc.common.cards, audio: loc.common.audio, mems: loc.common.mems, study: loc.library.study, edit: loc.library.edit, categories: loc.categories, levels: levelLabels }} />
        ))}
      </Section>

      <Section title={loc.library.learning} count={learning.length} emptyText={loc.library.emptyLearning}>
        {learning.map((course) => (
          <EnrolledCourseCard
            key={course.id}
            labels={cardLabels}
            course={{
              ...course,
              masteredCount: masteredByCourse[course.id] ?? 0,
              dueCount: dueByCourse[course.id] ?? 0,
              hasStudied: true,
            }}
          />
        ))}
      </Section>

      <Section title={loc.library.saved} count={saved.length} emptyText={loc.library.emptySaved} emptyLink={{ href: "/browse", label: loc.common.browseCourses }}>
        {saved.map((course) => (
          <EnrolledCourseCard
            key={course.id}
            labels={cardLabels}
            course={{
              ...course,
              masteredCount: 0,
              dueCount: 0,
              hasStudied: false,
            }}
          />
        ))}
      </Section>
    </div>
  );
}

function Section({
  title, count, children, emptyText, emptyLink,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  emptyText: string;
  emptyLink?: { href: string; label: string };
}) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <h2 className="font-fredoka text-2xl font-[700] tracking-tight">{title}</h2>
        <span className="rounded-full bg-paper-2 px-3 py-0.5 font-mono text-xs font-[700] text-ink-2 shadow-hard-sm">
          {count}
        </span>
      </div>

      {count === 0 ? (
        <div className="flex items-center gap-4 rounded-xl bg-paper-2 px-6 py-5 shadow-hard-sm">
          <p className="font-manrope text-sm text-ink-2">{emptyText}</p>
          {emptyLink && (
            <Link
              href={emptyLink.href}
              className="ml-auto shrink-0 rounded-full bg-orange px-4 py-2 font-manrope text-sm font-[800] text-on-bright shadow-hard-sm transition hover:opacity-90 active:translate-y-[1px]"
            >
              {emptyLink.label} →
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {children}
        </div>
      )}
    </section>
  );
}

function CourseCardShell({ course, cards, categories, levels, children }: { course: CourseCard; cards: string; categories: Record<string, string>; levels: Record<string, string>; children: React.ReactNode }) {
  const headerBg = LEVEL_HEADER[course.level ?? ""] ?? "bg-blue/20";
  const dotColor = LEVEL_DOT[course.level ?? ""] ?? "#93c5fd";
  const categoryLabel = course.category ? (categories[course.category] ?? course.category) : null;

  return (
    <div className="group overflow-hidden rounded-xl bg-paper-2 shadow-hard transition hover:-translate-y-0.5">
      <Link href={`/c/${course.slug}`} className={`relative flex h-20 items-end px-4 pb-3 ${headerBg} block`} style={STRIPE}>
        {course.cover_image_url ? (
          <Image src={course.cover_image_url} alt={course.title} fill className="object-cover" />
        ) : (
          <span className="relative z-10 font-mono text-xs uppercase tracking-widest text-ink-2">
            [{" "}{[categoryLabel?.toLowerCase(), course.level ? (levels[course.level] ?? course.level).toLowerCase() : null].filter(Boolean).join(" · ")}{" "}]
          </span>
        )}
        <span
          className="absolute right-3 top-3 z-10 h-3 w-3 rounded-full border-2 border-paper-2"
          style={{ backgroundColor: dotColor }}
        />
        {!course.is_published && (
          <span className="absolute left-3 top-2.5 z-10 rounded-full bg-paper/90 px-2 py-0.5 font-mono text-xs font-[700] uppercase tracking-wider text-ink-2">
            draft
          </span>
        )}
        {course.visibility !== "public" && course.is_published && (
          <span className="absolute left-3 top-2.5 z-10 rounded-full bg-paper/90 px-2 py-0.5 font-mono text-xs font-[700] uppercase tracking-wider text-ink-2">
            {course.visibility}
          </span>
        )}
      </Link>
      <div className="flex flex-col gap-2 p-4">
        <div>
          <Link href={`/c/${course.slug}`} className="font-fredoka text-lg font-[700] leading-tight tracking-tight hover:text-orange-text">
            {course.title}
          </Link>
          <p className="font-mono text-xs text-ink-2">{t(cards, { count: course.card_count })}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function CreatedCard({ course, labels }: { course: CourseCard; labels: { cards: string; audio: string; mems: string; study: string; edit: string; categories: Record<string, string>; levels: Record<string, string> } }) {
  return (
    <CourseCardShell course={course} cards={labels.cards} categories={labels.categories} levels={labels.levels}>
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {course.has_audio && (
            <span className="rounded-full border border-ink/15 px-2 py-0.5 font-mono text-xs text-ink-2">{labels.audio}</span>
          )}
          {course.mems_count > 0 && (
            <span className="rounded-full border border-ink/15 px-2 py-0.5 font-mono text-xs text-ink-2">{labels.mems}</span>
          )}
        </div>
        <span className="font-mono text-xs text-ink-2">👥 {fmt(course.learner_count)}</span>
      </div>
      <div className="mt-1 flex gap-2">
        <Link
          href={`/study/${course.slug}`}
          className="flex-1 rounded-full bg-orange px-4 py-1.5 text-center font-manrope text-sm font-[800] text-on-bright shadow-hard-sm transition hover:opacity-90 active:translate-y-[1px]"
        >
          {labels.study} →
        </Link>
        <Link
          href={`/c/${course.slug}/edit`}
          className="rounded-full bg-paper px-4 py-1.5 font-manrope text-sm font-[700] text-ink shadow-hard-sm transition hover:bg-orange hover:text-on-bright active:translate-y-[1px]"
        >
          {labels.edit}
        </Link>
      </div>
    </CourseCardShell>
  );
}
