import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/utils/supabase/server";
import PreviewSection from "./preview";
import FollowButton from "./follow-button";
import ShareButton from "./share-button";
import QuestionTypeSelector from "./question-type-selector";
import { toggleEnroll } from "./actions";

const LEVEL_LABEL: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

function formatCount(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createClient(await cookies());

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch course + creator
  const { data: courseRaw } = await supabase
    .from("courses")
    .select("id, slug, title, description, category, cover_image_url, source_language, target_language, level, card_count, learner_count, mems_count, avg_completion_days, has_audio, has_images, verified, visibility, is_published, creator_id, rating, rating_count, profiles!creator_id (username, display_name, avatar_url)")
    .eq("slug", slug)
    .single();

  if (!courseRaw) notFound();

  const isOwner = courseRaw.creator_id === user.id;
  if (courseRaw.visibility === "private" && !isOwner) notFound();

  const course = courseRaw as typeof courseRaw & { profiles: { username: string; display_name: string | null; avatar_url: string | null } | null };
  const creator = course.profiles as unknown as { username: string; display_name: string | null; avatar_url: string | null } | null;
  const creatorName = creator?.display_name ?? creator?.username ?? "Unknown";
  const creatorHandle = creator?.username ? `@${creator.username}` : creatorName;

  // Parallel queries
  const [
    { data: previewItems },
    { count: audioCount },
    { count: imageCount },
    { data: creatorCoursesData },
    { data: enrollmentData },
    { data: followData },
    { data: followingList },
  ] = await Promise.all([
    supabase.from("items").select("id, front_text, back_text").eq("course_id", course.id).order("position").limit(4),
    supabase.from("items").select("*", { count: "exact", head: true }).eq("course_id", course.id).or("front_audio_url.not.is.null,back_audio_url.not.is.null"),
    supabase.from("items").select("*", { count: "exact", head: true }).eq("course_id", course.id).not("image_url", "is", null),
    supabase.from("courses").select("learner_count").eq("creator_id", course.creator_id).eq("is_published", true),
    supabase.from("user_courses").select("id, preferred_question_types").eq("user_id", user.id).eq("course_id", course.id).maybeSingle(),
    supabase.from("follows").select("follower_id").eq("follower_id", user.id).eq("following_id", course.creator_id).maybeSingle(),
    supabase.from("follows").select("following_id").eq("follower_id", user.id),
  ]);

  const isEnrolled = Boolean(enrollmentData);
  type QType = "flashcard" | "multiple_choice" | "audio_type" | "speed_match";
  const preferredTypes = (enrollmentData?.preferred_question_types ?? ["flashcard"]) as QType[];
  const isFollowing = Boolean(followData);
  const followingIds = (followingList ?? []).map((f) => f.following_id);

  // Friends learning this course
  const { data: friendsLearning } = followingIds.length > 0
    ? await supabase
        .from("user_courses")
        .select("profiles!user_id (id, username, display_name, avatar_url)")
        .eq("course_id", course.id)
        .in("user_id", followingIds)
        .limit(5)
    : { data: [] };

  const friends = ((friendsLearning ?? []) as unknown as { profiles: { id: string; username: string; display_name: string | null; avatar_url: string | null } }[])
    .map((f) => f.profiles)
    .filter(Boolean);

  const totalFriendsLearning = friends.length;
  const creatorCourseCount = creatorCoursesData?.length ?? 0;
  const creatorTotalLearners = (creatorCoursesData ?? []).reduce((sum, c) => sum + c.learner_count, 0);

  const accentColors = ["bg-green-soft", "bg-yellow-soft", "bg-red-soft", "bg-blue/30"];

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">

        {/* ── LEFT COLUMN ── */}
        <div className="flex flex-col gap-6">

          {/* Hero card */}
          <section className="rounded-lg bg-paper-2 p-6 shadow-hard">
            <div className="flex gap-5">
              {/* Thumbnail */}
              <div className="relative hidden h-36 w-36 shrink-0 overflow-hidden rounded-lg sm:block" style={{ background: "var(--color-blue)" }}>
                {course.cover_image_url ? (
                  <Image src={course.cover_image_url} alt={course.title} fill className="object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center p-3">
                    <span className="text-center font-mono text-xs uppercase tracking-widest text-ocean opacity-70">
                      [ {course.category ?? "course"} {course.level ? `· ${course.level}` : ""} ]
                    </span>
                  </div>
                )}
              </div>

              {/* Meta */}
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs uppercase tracking-widest text-ink-2">
                  {[course.category, course.level ? LEVEL_LABEL[course.level] : null].filter(Boolean).join(" · ")}
                </p>
                <h1 className="mt-1 font-fredoka text-3xl font-[700] leading-tight tracking-tight">
                  {course.title}
                </h1>
                <p className="mt-1 font-manrope text-sm text-ink-2">
                  by <span className="font-[800] text-ink">{creatorHandle}</span>
                  {course.rating > 0 && (
                    <> · <span className="text-yellow">★</span> {course.rating.toFixed(1)} ({formatCount(course.rating_count)})</>
                  )}
                  {" · "}{formatCount(course.learner_count)} learners
                </p>

                {/* Feature badges */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {course.has_audio && <Badge>audio</Badge>}
                  {(course.mems_count ?? 0) > 0 && <Badge>mems</Badge>}
                  {course.has_images && <Badge>images</Badge>}
                  {course.verified && <Badge accent>verified</Badge>}
                  {course.visibility !== "public" && (
                    <span className="rounded-full bg-red-soft px-3 py-1 font-mono text-xs font-[700] uppercase tracking-wider text-ink-2">
                      {course.visibility}
                    </span>
                  )}
                </div>

                {/* CTA row */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/study/${course.slug}`}
                    className="rounded-full bg-orange px-5 py-2.5 font-manrope text-sm font-[800] text-white shadow-hard-red transition hover:opacity-90 active:translate-y-[2px] active:shadow-hard-sm"
                  >
                    Start learning →
                  </Link>

                  {!isOwner && (
                    <form action={toggleEnroll}>
                      <input type="hidden" name="course_id" value={course.id} />
                      <input type="hidden" name="slug" value={course.slug} />
                      <button
                        type="submit"
                        className={`cursor-pointer rounded-full px-5 py-2.5 font-manrope text-sm font-[800] shadow-hard-sm transition active:translate-y-[1px] active:shadow-none ${
                          isEnrolled
                            ? "bg-green-soft text-ink hover:bg-red-soft hover:text-orange"
                            : "bg-paper text-ink hover:bg-paper"
                        }`}
                      >
                        {isEnrolled ? "Saved" : "+ Save"}
                      </button>
                    </form>
                  )}

                  {isOwner && (
                    <Link
                      href={`/c/${course.slug}/edit`}
                      className="rounded-full bg-paper px-5 py-2.5 font-manrope text-sm font-[800] text-ink shadow-hard-sm transition hover:bg-orange hover:text-white active:translate-y-[1px] active:shadow-none"
                    >
                      Edit course
                    </Link>
                  )}

                  <ShareButton title={course.title} slug={course.slug} />
                </div>
              </div>
            </div>
          </section>

          {/* About */}
          {course.description && (
            <section className="rounded-lg bg-paper-2 p-6 shadow-hard">
              <p className="mb-2 font-mono text-xs uppercase tracking-widest text-ink-2">About</p>
              <p className="font-manrope text-sm leading-relaxed text-ink">{course.description}</p>
            </section>
          )}

          {/* Preview */}
          {(previewItems ?? []).length > 0 && (
            <PreviewSection
              items={previewItems ?? []}
              totalCount={course.card_count}
            />
          )}

          {/* Mems community banner */}
          <div className="flex items-center gap-4 rounded-lg bg-yellow-soft px-6 py-4 shadow-hard-sm">
            <span className="text-2xl">🧠</span>
            <p className="font-manrope text-sm text-ink">
              This course has <strong>{formatCount(course.mems_count ?? 0)} community mems</strong> — mnemonic hints from other learners. Tap any card to see them.
            </p>
          </div>
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div className="flex flex-col gap-4">

          {/* Creator card */}
          <aside className="rounded-lg bg-paper-2 p-5 shadow-hard">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-2">Creator</p>
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-blue">
                {creator?.avatar_url ? (
                  <Image src={creator.avatar_url} alt={creatorName} fill className="object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center font-mono text-sm font-[700] text-ocean">
                    {creatorName[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <p className="font-manrope text-sm font-[800] text-ink">{creatorHandle}</p>
                <p className="font-mono text-xs text-ink-2">
                  {creatorCourseCount} course{creatorCourseCount !== 1 ? "s" : ""} · {formatCount(creatorTotalLearners)} learners
                </p>
              </div>
            </div>

            {!isOwner && (
              <div className="mt-4">
                <FollowButton isFollowing={isFollowing} creatorId={course.creator_id} slug={course.slug} />
              </div>
            )}
          </aside>

          {/* Stats card */}
          <aside className="rounded-lg bg-paper-2 p-5 shadow-hard">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-2">Stats</p>
            <div className="flex flex-col gap-2">
              <StatRow label="Cards" value={String(course.card_count)} />
              {course.avg_completion_days != null && (
                <StatRow label="Avg time" value={`${course.avg_completion_days} days`} />
              )}
              <StatRow label="Audio" value={`${audioCount ?? 0}/${course.card_count}`} />
              <StatRow label="Images" value={`${imageCount ?? 0}/${course.card_count}`} />
              <StatRow label="Mems" value={formatCount(course.mems_count ?? 0)} />
            </div>
          </aside>

          {/* Question types */}
          {(isOwner || isEnrolled) && (
            <aside className="rounded-lg bg-paper-2 p-5 shadow-hard">
              <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-2">Study with</p>
              <QuestionTypeSelector
                courseId={course.id}
                initial={preferredTypes}
              />
            </aside>
          )}

          {/* Friends learning */}
          <aside className="rounded-lg bg-paper-2 p-5 shadow-hard">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-2">Friends learning</p>
            {friends.length === 0 ? (
              <p className="font-manrope text-sm text-ink-2">None of your friends are learning this yet.</p>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {friends.slice(0, 4).map((friend, i) => (
                    <div
                      key={friend.id}
                      className={`relative h-8 w-8 overflow-hidden rounded-full border-2 border-paper-2 ${accentColors[i % accentColors.length]}`}
                    >
                      {friend.avatar_url ? (
                        <Image src={friend.avatar_url} alt={friend.display_name ?? friend.username} fill className="object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center font-mono text-xs font-[700] text-ink">
                          {(friend.display_name ?? friend.username)[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {totalFriendsLearning > 4 && (
                  <p className="font-manrope text-sm text-ink-2">+{totalFriendsLearning - 4} more</p>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function Badge({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span className={`rounded-full border px-3 py-1 font-mono text-xs font-[700] ${accent ? "border-yellow bg-yellow-soft text-ink" : "border-ink/20 bg-paper text-ink-2"}`}>
      {children}
    </span>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-manrope text-sm text-ink-2">{label}</span>
      <span className="font-manrope text-sm font-[800] text-ink">{value}</span>
    </div>
  );
}
