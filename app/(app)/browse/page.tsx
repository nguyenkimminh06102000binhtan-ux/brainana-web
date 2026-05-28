import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import BrowseFilters from "./browse-filters";
import BrowseSort from "./browse-sort";

type Course = {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  cover_image_url: string | null;
  level: string | null;
  card_count: number;
  learner_count: number;
  rating: number;
  rating_count: number;
  has_audio: boolean;
  mems_count: number;
  profiles: { username: string; display_name: string | null } | null;
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

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const p = await searchParams;

  const q                 = p.q ?? "";
  const selectedCategories = p.categories ? p.categories.split(",").filter(Boolean) : [];
  const level             = p.level ?? "";
  const minCards          = p.min_cards ? parseInt(p.min_cards) : 0;
  const hasAudio          = p.has_audio === "1";
  const hasMems           = p.has_mems  === "1";
  const hasImages         = p.has_images === "1";
  const sortBy            = p.sort ?? "learner_count";

  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Resolve image/audio filters via items table (flags may be stale on old rows)
  const [imageCourseIds, audioCourseIds] = await Promise.all([
    hasImages
      ? supabase.from("items").select("course_id").not("image_url", "is", null)
          .then(({ data }) => [...new Set((data ?? []).map((r) => r.course_id as string))])
      : Promise.resolve(null),
    hasAudio
      ? supabase.from("items").select("course_id")
          .or("front_audio_url.not.is.null,back_audio_url.not.is.null")
          .then(({ data }) => [...new Set((data ?? []).map((r) => r.course_id as string))])
      : Promise.resolve(null),
  ]);

  // Short-circuit if a filter yields no matching courses
  const noResults =
    (imageCourseIds !== null && imageCourseIds.length === 0) ||
    (audioCourseIds !== null && audioCourseIds.length === 0);

  let query = supabase
    .from("courses")
    .select(
      "id, slug, title, category, cover_image_url, level, card_count, learner_count, rating, rating_count, has_audio, mems_count, profiles!creator_id (username, display_name)"
    )
    .eq("visibility", "public")
    .eq("is_published", true);

  if (q)                         query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,source_language.ilike.%${q}%,target_language.ilike.%${q}%,category.ilike.%${q}%`);
  if (selectedCategories.length) query = query.in("category", selectedCategories);
  if (level)                     query = query.eq("level", level);
  if (minCards > 0)              query = query.gte("card_count", minCards);
  if (hasMems)                   query = query.gt("mems_count", 0);
  if (imageCourseIds)            query = query.in("id", imageCourseIds);
  if (audioCourseIds)            query = query.in("id", audioCourseIds);

  if (sortBy === "rating")       query = query.order("rating", { ascending: false });
  else if (sortBy === "newest")  query = query.order("created_at", { ascending: false });
  else                           query = query.order("learner_count", { ascending: false });

  const { data: coursesRaw } = noResults ? { data: [] } : await query.limit(60);
  const courses = (coursesRaw ?? []) as unknown as Course[];

  // Fetch live learner counts from user_courses (learner_count column can be stale)
  const courseIds = courses.map((c) => c.id);
  const { data: learnerRows } = courseIds.length > 0
    ? await supabase.from("user_courses").select("course_id").in("course_id", courseIds)
    : { data: [] };
  const learnerCountMap: Record<string, number> = {};
  for (const row of learnerRows ?? []) {
    const id = (row as { course_id: string }).course_id;
    learnerCountMap[id] = (learnerCountMap[id] ?? 0) + 1;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">

        {/* ── Sidebar ── */}
        <div className="w-full shrink-0 lg:w-60">
          <BrowseFilters
            initialQ={q}
            selectedCategories={selectedCategories}
            level={level}
            minCards={minCards}
            hasAudio={hasAudio}
            hasMems={hasMems}
            hasImages={hasImages}
          />
        </div>

        {/* ── Results ── */}
        <div className="min-w-0 flex-1">
          {/* Header row */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <p className="font-fredoka text-2xl font-[700]">
              <span className="text-orange">{courses.length}</span> course{courses.length !== 1 ? "s" : ""}
              {q && <> for <span className="text-orange">&ldquo;{q}&rdquo;</span></>}
            </p>
            <BrowseSort value={sortBy} />
          </div>

          {courses.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {courses.map((course) => {
                const creator = course.profiles;
                const handle = creator?.username ? `@${creator.username}` : (creator?.display_name ?? "Unknown");
                const headerBg = LEVEL_HEADER[course.level ?? ""] ?? "bg-blue/20";
                const dotColor = LEVEL_DOT[course.level ?? ""] ?? "#93c5fd";

                return (
                  <Link
                    key={course.id}
                    href={`/c/${course.slug}`}
                    className="group overflow-hidden rounded-xl bg-paper-2 shadow-hard transition hover:-translate-y-0.5"
                  >
                    {/* Card header */}
                    <div
                      className={`relative flex h-24 items-end px-4 pb-3 ${headerBg}`}
                      style={STRIPE}
                    >
                      {course.cover_image_url ? (
                        <Image
                          src={course.cover_image_url}
                          alt={course.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <span className="relative z-10 font-mono text-xs uppercase tracking-widest text-ink/50">
                          [{" "}
                          {[course.category?.toLowerCase(), course.level]
                            .filter(Boolean)
                            .join(" · ")}
                          {" "}]
                        </span>
                      )}
                      <span
                        className="absolute right-3 top-3 z-10 h-3.5 w-3.5 rounded-full border-2 border-paper-2"
                        style={{ backgroundColor: dotColor }}
                      />
                    </div>

                    {/* Card body */}
                    <div className="flex flex-col gap-2.5 p-4">
                      <div>
                        <h2 className="font-fredoka text-xl font-[700] leading-tight tracking-tight group-hover:text-orange">
                          {course.title}
                        </h2>
                        <p className="font-mono text-xs text-ink-2">by {handle}</p>
                      </div>

                      {/* Tag row */}
                      <div className="flex flex-wrap gap-1.5">
                        {course.category && (
                          <span className="rounded-full border border-ink/15 px-2.5 py-0.5 font-mono text-xs text-ink-2">
                            {course.category.toLowerCase()}
                          </span>
                        )}
                        {course.rating > 0 && (
                          <span className="rounded-full border border-ink/15 px-2.5 py-0.5 font-mono text-xs text-ink-2">
                            ★ {course.rating.toFixed(1)}
                          </span>
                        )}
                        {course.has_audio && (
                          <span className="rounded-full border border-ink/15 px-2.5 py-0.5 font-mono text-xs text-ink-2">
                            audio
                          </span>
                        )}
                        {course.mems_count > 0 && (
                          <span className="rounded-full border border-ink/15 px-2.5 py-0.5 font-mono text-xs text-ink-2">
                            mems
                          </span>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 font-mono text-xs text-ink-2">
                        <span>👥 {fmt(learnerCountMap[course.id] ?? course.learner_count)}</span>
                        <span>📚 {course.card_count} cards</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl bg-paper-2 p-10 text-center shadow-hard">
              <p className="font-fredoka text-2xl font-[700] tracking-tight">No courses found</p>
              <p className="mx-auto mt-2 max-w-sm font-manrope text-sm text-ink-2">
                Try adjusting your filters or search term.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
