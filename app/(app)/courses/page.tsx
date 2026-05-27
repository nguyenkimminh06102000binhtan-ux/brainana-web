import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { CourseWithCreator } from "@/types/supabase";
import { enrollInCourse } from "./actions";

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
        <h1 className="text-3xl font-semibold tracking-tight">Explore Courses</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Find a published course and enroll when you are ready.
        </p>
      </div>

      <form method="get" action="/courses">
        {activeCategory !== "All" && (
          <input type="hidden" name="category" value={activeCategory} />
        )}
        <div className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search courses"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-950 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-50"
          />
          <button
            type="submit"
            className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
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
                  ? "border-zinc-950 bg-zinc-950 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950"
                  : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900"
              }`}
            >
              {cat}
            </Link>
          );
        })}
        {(q || activeCategory !== "All") && (
          <Link
            href="/courses"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Clear
          </Link>
        )}
      </div>

      {(q || activeCategory !== "All") && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
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
                className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="relative flex h-32 items-center justify-center bg-zinc-100 dark:bg-zinc-900">
                  {course.cover_image_url ? (
                    <Image
                      src={course.cover_image_url}
                      alt={course.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      {course.category ?? "Course"}
                    </span>
                  )}
                </div>

                <div className="flex min-h-56 flex-col gap-3 p-5">
                  <div>
                    <h2 className="font-semibold leading-snug">{course.title}</h2>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">by {creatorName}</p>
                  </div>

                  {course.description && (
                    <p className="line-clamp-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                      {course.description}
                    </p>
                  )}

                  <div className="mt-auto flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span>{formatCount(course.learner_count)} learners</span>
                    {course.source_language && course.target_language && (
                      <span>
                        {course.source_language} to {course.target_language}
                      </span>
                    )}
                  </div>

                  {isEnrolled ? (
                    <div className="rounded-md border border-zinc-300 px-3 py-2 text-center text-sm font-medium dark:border-zinc-700">
                      Enrolled
                    </div>
                  ) : (
                    <form action={enrollInCourse}>
                      <input type="hidden" name="course_id" value={course.id} />
                      <button
                        type="submit"
                        className="w-full rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
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
    <div className="rounded-lg border border-zinc-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-950">
      <p className="font-medium">{isFiltered ? "No courses found" : "No courses yet"}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
        {isFiltered
          ? "Try a different search term or remove the filters."
          : "Published courses will appear here when they are available."}
      </p>
      <Link
        href={isFiltered ? "/courses" : "/dashboard"}
        className="mt-4 inline-block rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
      >
        {isFiltered ? "Clear filters" : "Back to dashboard"}
      </Link>
    </div>
  );
}
