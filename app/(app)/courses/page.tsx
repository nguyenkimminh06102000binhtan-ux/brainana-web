import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { enrollInCourse } from "./actions";

type CourseWithCreator = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  cover_image_url: string | null;
  source_language: string | null;
  target_language: string | null;
  learner_count: number;
  profiles: { username: string; display_name: string | null } | null;
};

const CATEGORIES = ["All", "Language", "Science", "History", "Culture", "Technology"];

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

  const courses = (coursesRaw ?? []) as unknown as CourseWithCreator[];
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
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
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
        <div className="flex gap-2">
          <input
            id="course-search"
            name="q"
            defaultValue={q}
            placeholder="Search courses"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-full bg-paper-2 px-5 py-3 font-manrope text-sm text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-blue"
          />
          <button
            type="submit"
            className="rounded-full bg-yellow px-6 py-3 font-manrope text-base font-[800] text-on-bright shadow-hard transition active:translate-y-[2px] active:shadow-hard-sm"
          >
            Search
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
              className={`rounded-md border px-3 py-1.5 text-sm ${
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
                className="overflow-hidden rounded-lg bg-paper-2 shadow-hard"
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
                    <span className="rounded-full border bg-green-soft px-2 py-1">🧠 {formatCount(course.learner_count)} learners</span>
                    {course.source_language && course.target_language && (
                      <span className="rounded-full border bg-yellow-soft px-2 py-1">
                        {course.source_language} to {course.target_language}
                      </span>
                    )}
                  </div>

                  {isEnrolled ? (
                    <div className="rounded-full bg-green-soft px-5 py-3 text-center font-manrope text-base font-[800] text-ink shadow-hard-sm">
                      Enrolled
                    </div>
                  ) : (
                    <form action={enrollInCourse}>
                      <input type="hidden" name="course_id" value={course.id} />
                      <button
                        type="submit"
                        className="w-full rounded-full bg-orange px-5 py-3 font-manrope text-base font-[800] text-on-bright shadow-hard-red transition active:translate-y-[2px] active:shadow-hard-sm"
                      >
                        Enroll
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
