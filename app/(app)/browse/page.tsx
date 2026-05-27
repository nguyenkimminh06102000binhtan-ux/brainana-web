import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

type Course = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  cover_image_url: string | null;
  source_language: string | null;
  target_language: string | null;
  level: string | null;
  card_count: number;
  learner_count: number;
  has_audio: boolean;
  has_images: boolean;
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

const CATEGORIES = ["All", "Language", "Science", "History", "Math", "Geography", "Literature", "Music", "Art", "Technology"];
const LEVEL_LABEL: Record<string, string> = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };

function formatCount(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category, q } = await searchParams;
  const activeCategory = category ?? "All";

  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let query = supabase
    .from("courses")
    .select("id, slug, title, description, category, cover_image_url, source_language, target_language, level, card_count, learner_count, has_audio, has_images, profiles!creator_id (username, display_name, avatar_url)")
    .eq("visibility", "public")
    .eq("is_published", true)
    .order("learner_count", { ascending: false })
    .limit(60);

  if (activeCategory !== "All") query = query.eq("category", activeCategory);
  if (q) query = query.ilike("title", `%${q}%`);

  const { data: coursesRaw } = await query;
  const courses = (coursesRaw ?? []) as unknown as Course[];

  function filterHref(cat: string) {
    const params = new URLSearchParams();
    if (cat !== "All") params.set("category", cat);
    if (q) params.set("q", q);
    const qs = params.toString();
    return `/browse${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Browse</p>
        <h1 className="mt-1 font-fredoka text-4xl font-[700] tracking-tight">
          Discover <span className="text-orange">courses</span>
        </h1>
        <p className="mt-2 font-manrope text-sm text-ink-2">
          Public courses from the Brainana community.
        </p>
      </div>

      {/* Search */}
      <form method="get" action="/browse">
        {activeCategory !== "All" && <input type="hidden" name="category" value={activeCategory} />}
        <div className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search courses..."
            autoComplete="off"
            className="min-w-0 flex-1 rounded-full bg-paper-2 px-5 py-3 font-manrope text-sm text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-yellow shadow-hard-sm"
          />
          <button type="submit"
            className="rounded-full bg-yellow px-6 py-3 font-manrope text-base font-[800] text-ink shadow-hard transition active:translate-y-[2px] active:shadow-hard-sm">
            Search
          </button>
        </div>
      </form>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <Link key={cat} href={filterHref(cat)}
            className={`rounded-full px-4 py-1.5 font-manrope text-sm font-[800] shadow-hard-sm transition ${
              cat === activeCategory
                ? "bg-orange text-white"
                : "bg-paper-2 text-ink hover:bg-orange hover:text-white"
            }`}>
            {cat}
          </Link>
        ))}
        {(q || activeCategory !== "All") && (
          <Link href="/browse"
            className="rounded-full bg-paper-2 px-4 py-1.5 font-manrope text-sm font-[800] text-ink-2 shadow-hard-sm">
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
            const creator = course.profiles;
            const creatorName = creator?.display_name ?? creator?.username ?? "Unknown";

            return (
              <Link key={course.id} href={`/c/${course.slug}`}
                className="group overflow-hidden rounded-lg bg-paper-2 shadow-hard transition hover:-translate-y-0.5 hover:shadow-hard">

                {/* Cover */}
                <div className="relative flex h-28 items-center justify-center bg-blue">
                  {course.cover_image_url ? (
                    <Image src={course.cover_image_url} alt={course.title} fill className="object-cover" />
                  ) : (
                    <span className="font-mono text-xs uppercase tracking-widest text-ocean">
                      {course.category ?? "Course"}
                    </span>
                  )}
                  {course.level && (
                    <span className="absolute right-3 top-3 rounded-full bg-paper/90 px-2 py-0.5 font-mono text-xs font-[700] uppercase tracking-wider text-ink">
                      {LEVEL_LABEL[course.level] ?? course.level}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-3 p-5">
                  {/* Title + creator */}
                  <div>
                    <h2 className="font-fredoka text-xl font-[700] leading-tight tracking-tight group-hover:text-orange">
                      {course.title}
                    </h2>
                    <p className="mt-0.5 font-mono text-xs uppercase tracking-widest text-ink-2">
                      by {creatorName}
                    </p>
                  </div>

                  {/* Description */}
                  {course.description && (
                    <p className="line-clamp-2 font-manrope text-sm leading-relaxed text-ink-2">
                      {course.description}
                    </p>
                  )}

                  {/* Meta tags */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-green-soft px-2.5 py-1 font-mono text-xs text-ink-2">
                      {course.card_count} cards
                    </span>
                    <span className="rounded-full bg-yellow-soft px-2.5 py-1 font-mono text-xs text-ink-2">
                      {formatCount(course.learner_count)} learners
                    </span>
                    {course.source_language && course.target_language && (
                      <span className="rounded-full bg-paper px-2.5 py-1 font-mono text-xs text-ink-2">
                        {course.source_language} → {course.target_language}
                      </span>
                    )}
                    {course.has_audio && (
                      <span className="rounded-full bg-blue/20 px-2.5 py-1 font-mono text-xs text-ink-2">
                        audio
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg bg-paper-2 p-10 text-center shadow-hard">
          <p className="font-fredoka text-2xl font-[700] tracking-tight">
            {q || activeCategory !== "All" ? "No courses found" : "No courses yet"}
          </p>
          <p className="mx-auto mt-2 max-w-sm font-manrope text-sm text-ink-2">
            {q || activeCategory !== "All"
              ? "Try a different search term or remove the filters."
              : "Be the first — create a course and share it with the community."}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            {(q || activeCategory !== "All") && (
              <Link href="/browse"
                className="rounded-full bg-paper px-6 py-3 font-manrope text-sm font-[800] text-ink shadow-hard-sm transition active:translate-y-[2px] active:shadow-none">
                Clear filters
              </Link>
            )}
            <Link href="/create"
              className="rounded-full bg-orange px-6 py-3 font-manrope text-sm font-[800] text-white shadow-hard-red transition active:translate-y-[2px] active:shadow-hard-sm">
              Create a course
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
