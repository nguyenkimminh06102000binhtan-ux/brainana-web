import type { Metadata } from "next";
export const metadata: Metadata = { title: "Courses — Brainana" };

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { enrollInCourse } from "./actions";
import { getLocale } from "@/utils/i18n";
import { Icon } from "@/components/ui-icons";

type CourseWithCreator = {
  id: string;
  creator_id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  cover_image_url: string | null;
  source_language: string | null;
  target_language: string | null;
  level: string | null;
  learner_count: number;
  profiles: { username: string; display_name: string | null } | null;
};

const CATEGORIES = ["All", "Language", "Science", "History", "Culture", "Technology"];

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function searchTokens(query: string) {
  return normalizeSearch(query).split(/\s+/).filter((token) => token.length > 1).slice(0, 6);
}

function searchTerms(query: string) {
  const normalized = normalizeSearch(query);
  return [...new Set([normalized, ...searchTokens(query)].filter(Boolean))];
}

function inList(values: string[]) {
  return values.map((value) => `"${value.replace(/"/g, '\\"')}"`).join(",");
}

function courseSearchText(course: CourseWithCreator) {
  const creator = course.profiles;
  return normalizeSearch([
    course.title,
    course.description,
    course.slug,
    course.category,
    course.subcategory,
    course.source_language,
    course.target_language,
    course.level,
    creator?.username,
    creator?.display_name,
  ].filter(Boolean).join(" "));
}

function categoryMatches(query: string, categoryLabels: Record<string, string>) {
  const normalizedQuery = normalizeSearch(query);
  const tokens = searchTokens(query);

  return Object.entries(categoryLabels)
    .filter(([key, label]) => {
      const text = normalizeSearch(`${key} ${label}`);
      return text.includes(normalizedQuery) || tokens.some((token) => text.includes(token));
    })
    .map(([key]) => key);
}

function rankCourse(course: CourseWithCreator, query: string, cardMatchIds: Set<string>) {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return 0;

  const text = courseSearchText(course);
  const tokens = searchTokens(query);
  const title = normalizeSearch(course.title);
  const slug = normalizeSearch(course.slug);
  let score = 0;

  if (title === normalizedQuery) score += 120;
  if (title.includes(normalizedQuery)) score += 80;
  if (slug.includes(normalizedQuery)) score += 45;
  if (text.includes(normalizedQuery)) score += 35;
  if (cardMatchIds.has(course.id)) score += 28;

  for (const token of tokens) {
    if (title.includes(token)) score += 14;
    else if (text.includes(token)) score += 7;
  }

  return score;
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category, q: rawQ } = await searchParams;
  const q = rawQ?.trim() ?? "";
  const activeCategory = category ?? "All";
  const qTerms = searchTerms(q);

  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_origin_language")
    .eq("id", user.id)
    .single();
  const loc = getLocale((profile?.active_origin_language as string | null) ?? null);
  const categoryMatchKeys = categoryMatches(q, loc.categories);

  let query = supabase
    .from("courses")
    .select(
      "id, creator_id, slug, title, description, category, subcategory, cover_image_url, source_language, target_language, level, learner_count, profiles!creator_id (username, display_name)"
    )
    .eq("visibility", "public")
    .eq("is_published", true)
    .order("learner_count", { ascending: false });

  if (activeCategory !== "All") {
    query = query.eq("category", activeCategory);
  }
  const [{ data: enrolled }, cardMatchCourseIds, profileMatchIds] = await Promise.all([
    supabase.from("user_courses").select("course_id").eq("user_id", user.id),
    qTerms.length > 0
      ? supabase.from("items").select("course_id")
          .or(qTerms.flatMap((term) => [
            `front_text.ilike.%${term}%`,
            `back_text.ilike.%${term}%`,
            `romanization.ilike.%${term}%`,
            `notes.ilike.%${term}%`,
          ]).join(","))
          .limit(1000)
          .then(({ data }) => [...new Set((data ?? []).map((r) => r.course_id as string))])
      : Promise.resolve([]),
    qTerms.length > 0
      ? supabase.from("profiles").select("id")
          .or(qTerms.flatMap((term) => [
            `username.ilike.%${term}%`,
            `display_name.ilike.%${term}%`,
          ]).join(","))
          .limit(100)
          .then(({ data }) => (data ?? []).map((r) => r.id as string))
      : Promise.resolve([]),
  ]);

  if (qTerms.length > 0) {
    const courseFields = ["title", "description", "slug", "source_language", "target_language", "category", "subcategory", "level"];
    const courseFilters = qTerms.flatMap((term) => courseFields.map((field) => `${field}.ilike.%${term}%`));
    if (categoryMatchKeys.length > 0) {
      const categoryList = inList(categoryMatchKeys);
      courseFilters.push(`category.in.(${categoryList})`);
      courseFilters.push(`subcategory.in.(${categoryList})`);
    }
    if (cardMatchCourseIds.length > 0) courseFilters.push(`id.in.(${cardMatchCourseIds.join(",")})`);
    if (profileMatchIds.length > 0) courseFilters.push(`creator_id.in.(${profileMatchIds.join(",")})`);
    query = query.or(courseFilters.join(","));
  }

  let { data: coursesRaw, error: coursesError } = await query.limit(q ? 500 : 100);
  if (q && !coursesError) {
    let fallbackQuery = supabase
      .from("courses")
      .select(
        "id, creator_id, slug, title, description, category, subcategory, cover_image_url, source_language, target_language, level, learner_count, profiles!creator_id (username, display_name)"
      )
      .eq("visibility", "public")
      .eq("is_published", true)
      .order("learner_count", { ascending: false });

    if (activeCategory !== "All") {
      fallbackQuery = fallbackQuery.eq("category", activeCategory);
    }

    const fallback = await fallbackQuery.limit(500);
    type CourseRow = NonNullable<typeof coursesRaw>[number];
    const merged = new Map<string, CourseRow>();
    for (const course of coursesRaw ?? []) merged.set((course as { id: string }).id, course);
    for (const course of fallback.data ?? []) merged.set((course as { id: string }).id, course);
    coursesRaw = [...merged.values()];
    coursesError = fallback.error;
  }
  if (coursesError) console.error("[courses] courses query error:", JSON.stringify(coursesError));

  const cardMatchIds = new Set(cardMatchCourseIds);
  const courseCandidates = (coursesRaw ?? []) as unknown as CourseWithCreator[];
  const courses = q
    ? courseCandidates
        .map((course) => ({ course, score: rankCourse(course, q, cardMatchIds) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score || b.course.learner_count - a.course.learner_count)
        .map(({ course }) => course)
    : courseCandidates;
  const enrolledIds = new Set((enrolled ?? []).map((enrollment) => enrollment.course_id));

  function filterHref(cat: string) {
    const params = new URLSearchParams();
    if (cat !== "All") params.set("category", cat);
    if (q) params.set("q", q);
    const queryString = params.toString();
    return `/courses${queryString ? `?${queryString}` : ""}`;
  }

  function formatCount(n: number) {
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-5 sm:px-6 sm:py-8">
      <div>
        <h1 className="font-fredoka text-4xl font-[600] leading-tight tracking-tight">Explore Courses</h1>
        <p className="mt-2 font-manrope text-sm text-ink-2">
          Find a published course and enroll when you are ready.
        </p>
      </div>

      <form method="get" action="/courses">
        {activeCategory !== "All" && (
          <input type="hidden" name="category" value={activeCategory} />
        )}
        <label htmlFor="course-search" className="mb-2 block font-mono text-xs uppercase tracking-widest text-ink-2">
          Search courses
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="course-search"
            name="q"
            defaultValue={q}
            placeholder="Search courses"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-full bg-paper-2 px-5 py-3.5 font-manrope text-base text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-ink sm:py-3 sm:text-sm"
          />
          <button
            type="submit"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-yellow px-6 py-3 font-manrope text-base font-[800] text-on-bright shadow-hard transition active:translate-y-[2px] active:shadow-hard-sm"
          >
            <Icon name="search" className="h-4 w-4" /> Search
          </button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => {
          const isActive = cat === activeCategory;
          return (
            <Link
              key={cat}
              href={filterHref(cat)}
            className={`rounded-full border px-4 py-2 text-sm ${
                isActive
                  ? "bg-orange font-manrope font-[800] text-on-bright shadow-hard-sm"
                  : "bg-paper-2 font-manrope font-[800] text-ink shadow-hard-sm"
              }`}
            >
              {cat}
            </Link>
          );
        })}
        {(q || activeCategory !== "All") && (
          <Link
            href="/courses"
            className="rounded-full bg-paper-2 px-4 py-2 font-manrope text-sm font-[800] text-ink shadow-hard-sm"
          >
            Clear
          </Link>
        )}
      </div>

      {(q || activeCategory !== "All") && (
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">
          {courses.length} course{courses.length !== 1 ? "s" : ""} found
          {q ? ` for "${q}"` : ""}
          {activeCategory !== "All" ? ` in ${activeCategory}` : ""}
        </p>
      )}

      {courses.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const isEnrolled = enrolledIds.has(course.id);
            const creator = course.profiles;
            const creatorName = creator?.display_name ?? creator?.username ?? "Unknown";

            return (
              <article
                key={course.id}
                className="overflow-hidden rounded-[1.2rem] bg-paper-2 shadow-hard"
              >
                <div className="relative flex h-32 items-center justify-center bg-blue">
                  {course.cover_image_url ? (
                    <Image
                      src={course.cover_image_url}
                      alt={course.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <span className="font-mono text-xs uppercase tracking-widest text-ink">
                      {course.category ?? "Course"}
                    </span>
                  )}
                </div>

                <div className="flex min-h-56 flex-col gap-3 p-5">
                  <div>
                    <h2 className="font-fredoka text-2xl font-[600] leading-tight tracking-tight">{course.title}</h2>
                    <p className="mt-1 font-mono text-xs uppercase tracking-widest text-ink-2">by {creatorName}</p>
                  </div>

                  {course.description && (
                    <p className="line-clamp-2 font-manrope text-sm leading-6 text-ink-2">
                      {course.description}
                    </p>
                  )}

                  <div className="mt-auto flex flex-wrap gap-2 font-mono text-xs text-ink-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border bg-green-soft px-2.5 py-1">
                      <Icon name="users" className="h-3.5 w-3.5" /> {formatCount(course.learner_count)} learners
                    </span>
                    {course.source_language && course.target_language && (
                      <span className="rounded-full border bg-yellow-soft px-2 py-1">
                        {course.source_language} to {course.target_language}
                      </span>
                    )}
                  </div>

                  {isEnrolled ? (
                    <div className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-green-soft px-5 py-3 text-center font-manrope text-base font-[800] text-ink shadow-hard-sm">
                      <Icon name="check" className="h-4 w-4" /> Enrolled
                    </div>
                  ) : (
                    <form action={enrollInCourse}>
                      <input type="hidden" name="course_id" value={course.id} />
                      <button
                        type="submit"
                        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-orange px-5 py-3 font-manrope text-base font-[800] text-on-bright shadow-hard-red transition active:translate-y-[2px] active:shadow-hard-sm"
                      >
                        Enroll <Icon name="arrowRight" className="h-4 w-4" />
                      </button>
                    </form>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState query={q} category={activeCategory} />
      )}
    </div>
  );
}

function EmptyState({ query, category }: { query?: string; category: string }) {
  const isFiltered = query || category !== "All";

  return (
    <div className="rounded-lg bg-paper-2 p-10 text-center shadow-hard">
      <p className="font-fredoka text-2xl font-[600] tracking-tight">{isFiltered ? "No courses found" : "No courses yet"}</p>
      <p className="mx-auto mt-2 max-w-sm font-manrope text-sm text-ink-2">
        {isFiltered
          ? "Try a different search term or remove the filters."
          : "Published courses will appear here when they are available."}
      </p>
      <Link
        href={isFiltered ? "/courses" : "/home"}
        className="mt-4 inline-block rounded-full bg-paper px-6 py-3 font-manrope text-base font-[800] text-ink shadow-hard-sm transition active:translate-y-[2px] active:shadow-none"
      >
        {isFiltered ? "Clear filters" : "Back to home"}
      </Link>
    </div>
  );
}
