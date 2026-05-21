import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { CourseWithCreator } from "@/types/supabase";
import { enrollInCourse } from "./actions";

/* ── Constants ─────────────────────────────────────────────────────── */

const CATEGORIES = ["All", "Language", "Science", "History", "Culture", "Technology"];

const CATEGORY_COLORS: Record<string, string> = {
  Language: "bg-banana",
  Science: "bg-zombie",
  History: "bg-brain",
  Culture: "bg-banana/60",
  Technology: "bg-dark",
};

const CATEGORY_TEXT: Record<string, string> = {
  Technology: "text-cream",
};

/* ── Page ───────────────────────────────────────────────────────────── */

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category, q } = await searchParams;
  const activeCategory = category ?? "All";

  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Build query
  let query = supabase
    .from("courses")
    .select(
      "id, title, description, category, cover_image_url, source_language, target_language, learner_count, profiles!creator_id (username, display_name)"
    )
    .eq("is_private", false)
    .eq("is_published", true)
    .order("learner_count", { ascending: false });

  if (activeCategory !== "All") {
    query = query.eq("category", activeCategory);
  }
  if (q) {
    query = query.ilike("title", `%${q}%`);
  }

  const [{ data: coursesRaw }, { data: enrolled }] = await Promise.all([
    query,
    supabase.from("user_courses").select("course_id").eq("user_id", user.id),
  ]);

  const courses = (coursesRaw ?? []) as CourseWithCreator[];
  const enrolledIds = new Set((enrolled ?? []).map((e) => e.course_id));

  /* ── helpers ── */
  function filterHref(cat: string) {
    const params = new URLSearchParams();
    if (cat !== "All") params.set("category", cat);
    if (q) params.set("q", q);
    const qs = params.toString();
    return `/courses${qs ? `?${qs}` : ""}`;
  }

  function formatCount(n: number) {
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  }

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-dark text-3xl font-extrabold mb-1">Explore Courses</h1>
        <p className="text-dark/50 text-sm">Find your next obsession. Thousands of courses await.</p>
      </div>

      {/* Search bar */}
      <form method="get" action="/courses">
        {activeCategory !== "All" && (
          <input type="hidden" name="category" value={activeCategory} />
        )}
        <div className="relative flex items-center">
          <span className="absolute left-4 text-dark/35 pointer-events-none">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Search courses…"
            autoComplete="off"
            className="w-full pl-10 pr-24 py-3 bg-white border border-dark/20 rounded-full text-sm text-dark placeholder:text-dark/35 focus:outline-none focus:ring-2 focus:ring-banana"
          />
          <button
            type="submit"
            className="absolute right-2 bg-banana text-dark font-bold text-xs px-4 py-1.5 rounded-full hover:bg-banana/90 transition"
          >
            Search
          </button>
        </div>
      </form>

      {/* Filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        {CATEGORIES.map((cat) => {
          const isActive = cat === activeCategory;
          return (
            <Link
              key={cat}
              href={filterHref(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold border transition ${
                isActive
                  ? "bg-banana text-dark border-banana"
                  : "bg-white text-dark/60 border-dark/20 hover:border-dark/40 hover:text-dark"
              }`}
            >
              {cat}
            </Link>
          );
        })}
        {(q || activeCategory !== "All") && (
          <Link
            href="/courses"
            className="px-4 py-1.5 rounded-full text-sm font-bold text-brain border border-brain/30 bg-brain/5 hover:bg-brain/10 transition"
          >
            Clear ×
          </Link>
        )}
      </div>

      {/* Results count */}
      {(q || activeCategory !== "All") && (
        <p className="text-dark/45 text-sm">
          {courses.length} course{courses.length !== 1 ? "s" : ""} found
          {q ? ` for "${q}"` : ""}
          {activeCategory !== "All" ? ` in ${activeCategory}` : ""}
        </p>
      )}

      {/* Course grid */}
      {courses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => {
            const isEnrolled = enrolledIds.has(course.id);
            const coverColor = CATEGORY_COLORS[course.category ?? ""] ?? "bg-banana";
            const coverText = CATEGORY_TEXT[course.category ?? ""] ?? "text-dark";
            const creator = course.profiles;
            const creatorName = creator?.display_name ?? creator?.username ?? "Unknown";

            return (
              <div
                key={course.id}
                className="bg-white border border-dark/10 rounded-2xl overflow-hidden flex flex-col hover:border-banana/40 transition group"
              >
                {/* Cover */}
                <div className={`h-32 ${coverColor} flex items-center justify-center relative overflow-hidden`}>
                  {course.cover_image_url ? (
                    <Image
                      src={course.cover_image_url}
                      alt={course.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <span className={`text-5xl select-none group-hover:scale-110 transition-transform ${coverText}`}>
                      {categoryEmoji(course.category)}
                    </span>
                  )}
                  {/* Category pill */}
                  {course.category && (
                    <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-dark text-xs font-bold px-2.5 py-1 rounded-full">
                      {course.category}
                    </span>
                  )}
                </div>

                {/* Body */}
                <div className="p-5 flex flex-col gap-3 flex-1">
                  <div>
                    <h3 className="text-dark font-extrabold leading-snug mb-1">{course.title}</h3>
                    <p className="text-dark/45 text-xs">by {creatorName}</p>
                  </div>

                  {course.description && (
                    <p className="text-dark/55 text-sm leading-relaxed line-clamp-2">
                      {course.description}
                    </p>
                  )}

                  {/* Meta row */}
                  <div className="flex items-center gap-3 mt-auto">
                    {/* Learner count */}
                    <span className="flex items-center gap-1 text-dark/45 text-xs">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                      </svg>
                      {formatCount(course.learner_count)}
                    </span>

                    {/* Language tag */}
                    {course.source_language && course.target_language && (
                      <span className="text-xs bg-dark/5 text-dark/60 font-semibold px-2 py-0.5 rounded-full">
                        {course.source_language} → {course.target_language}
                      </span>
                    )}
                  </div>

                  {/* Enroll button or enrolled badge */}
                  {isEnrolled ? (
                    <div className="flex items-center justify-center gap-2 bg-zombie/15 text-zombie font-extrabold text-sm py-2.5 rounded-full">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Enrolled
                    </div>
                  ) : (
                    <form action={enrollInCourse}>
                      <input type="hidden" name="course_id" value={course.id} />
                      <button
                        type="submit"
                        className="w-full bg-banana text-dark font-extrabold text-sm py-2.5 rounded-full hover:bg-banana/90 transition"
                      >
                        Enroll
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState query={q} category={activeCategory} />
      )}
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────────────────────── */

function EmptyState({ query, category }: { query?: string; category: string }) {
  const isFiltered = query || category !== "All";

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Image
        src="/logos/brainana-mascot.svg"
        alt="Brainana mascot"
        width={100}
        height={120}
        className="mb-6 opacity-80"
      />
      {isFiltered ? (
        <>
          <p className="text-dark font-extrabold text-xl mb-2">No courses found</p>
          <p className="text-dark/50 text-sm mb-6 max-w-xs">
            Try a different search term or remove the filters.
          </p>
          <Link
            href="/courses"
            className="inline-block bg-banana text-dark font-extrabold text-sm px-6 py-3 rounded-full hover:bg-banana/90 transition"
          >
            Clear filters
          </Link>
        </>
      ) : (
        <>
          <p className="text-dark font-extrabold text-xl mb-2">No courses yet</p>
          <p className="text-dark/50 text-sm mb-6 max-w-xs">
            Be the first to create one and share your knowledge with the community!
          </p>
          <Link
            href="/dashboard/courses/create"
            className="inline-block bg-banana text-dark font-extrabold text-sm px-6 py-3 rounded-full hover:bg-banana/90 transition"
          >
            Create a Course
          </Link>
        </>
      )}
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

function categoryEmoji(category: string | null): string {
  const map: Record<string, string> = {
    Language: "🌍",
    Science: "🔬",
    History: "📜",
    Culture: "🎭",
    Technology: "💻",
  };
  return map[category ?? ""] ?? "📚";
}
