import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/utils/supabase/server";
import { getLocale, t } from "@/utils/i18n";
import PreviewSection from "./preview";
import FollowButton from "./follow-button";
import ShareButton from "./share-button";
import DiscussionThread from "./discussion-thread";
import { toggleSave, enrollCourse, unenrollCourse } from "./actions";
import DuplicateButton from "./duplicate-button";

function formatCount(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

type TopMem = {
  id: string;
  text: string;
  helpful_count: number;
  card_id: string;
  profiles: { username: string; display_name: string | null } | null;
  items: { front_text: string } | null;
};

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
    .select("id, slug, title, description, category, cover_image_url, source_language, target_language, level, card_count, learner_count, mems_count, avg_completion_days, has_audio, has_images, has_romanization, verified, visibility, is_published, creator_id, rating, rating_count, profiles!creator_id (username, display_name, avatar_url)")
    .eq("slug", slug)
    .single();

  if (!courseRaw) notFound();

  const isOwner = courseRaw.creator_id === user.id;
  if (courseRaw.visibility === "private" && !isOwner) notFound();

  const course = courseRaw as typeof courseRaw & { profiles: { username: string; display_name: string | null; avatar_url: string | null } | null };
  const creator = course.profiles as unknown as { username: string; display_name: string | null; avatar_url: string | null } | null;
  const creatorName = creator?.display_name ?? creator?.username ?? "Unknown";
  const creatorHandle = creator?.username ? `@${creator.username}` : creatorName;

  const dueCutoff = (await import("@/utils/review-schedule")).reviewDayCutoff().toISOString();

  // Parallel queries
  const [
    { data: allSectionsRaw },
    { count: audioCount },
    { count: imageCount },
    { data: creatorCoursesData },
    { data: enrollmentData },
    { data: savedData },
    { data: followData },
    { count: creatorFollowerCount },
    { data: profile },
    { data: ignoredProgressRows },
    { count: seenCount },
    { count: dueCount },
    { data: subData },
    { data: accuracyRows },
    topMems,
  ] = await Promise.all([
    supabase.from("sections").select("id, title, position, items(id, front_text, back_text, position)").eq("course_id", course.id).order("position"),
    supabase.from("items").select("*", { count: "exact", head: true }).eq("course_id", course.id).or("front_audio_url.not.is.null,back_audio_url.not.is.null"),
    supabase.from("items").select("*", { count: "exact", head: true }).eq("course_id", course.id).not("image_url", "is", null),
    supabase.from("courses").select("id, learner_count").eq("creator_id", course.creator_id).eq("is_published", true),
    supabase.from("user_courses").select("id, preferred_question_types").eq("user_id", user.id).eq("course_id", course.id).maybeSingle(),
    supabase.from("saved_courses").select("course_id").eq("user_id", user.id).eq("course_id", course.id).maybeSingle(),
    supabase.from("follows").select("follower_id").eq("follower_id", user.id).eq("following_id", course.creator_id).maybeSingle(),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", course.creator_id),
    supabase.from("profiles").select("active_origin_language").eq("id", user.id).single(),
    supabase.from("item_progress").select("item_id").eq("user_id", user.id).eq("course_id", course.id).eq("ignored", true),
    supabase.from("item_progress").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("course_id", course.id).eq("ignored", false),
    supabase.from("item_progress").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("course_id", course.id).eq("ignored", false).lt("next_review_at", dueCutoff),
    supabase.from("user_subscriptions").select("plan").eq("user_id", user.id).single(),
    supabase.from("item_progress").select("correct_count, incorrect_count").eq("user_id", user.id).eq("course_id", course.id).eq("ignored", false),
    (async (): Promise<TopMem[]> => {
      const { data: itemRows } = await supabase.from("items").select("id").eq("course_id", course.id);
      const ids = (itemRows ?? []).map((r) => r.id as string);
      if (!ids.length) return [];
      const { data } = await supabase
        .from("mems")
        .select("id, text, helpful_count, card_id, profiles!author_id(username, display_name), items!card_id(front_text)")
        .in("card_id", ids)
        .order("helpful_count", { ascending: false })
        .limit(5);
      return (data ?? []) as unknown as TopMem[];
    })(),
  ]);

  const ignoredIds = new Set((ignoredProgressRows ?? []).map((r) => r.item_id as string));

  type RawSectionItem = { id: string; front_text: string; back_text: string; position: number | null };
  const configSections = (allSectionsRaw ?? []).map((s) => ({
    id: String(s.id),
    title: s.title ?? "",
    cards: ((s.items ?? []) as unknown as RawSectionItem[])
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((item) => ({
        id: item.id,
        front: item.front_text,
        back: item.back_text,
        ignored: ignoredIds.has(item.id),
      })),
  }));

  const previewItems = configSections.flatMap((s) => s.cards.map((c) => ({ id: c.id, front_text: c.front, back_text: c.back }))).slice(0, 4);

  const loc = getLocale((profile?.active_origin_language as string | null) ?? null);
  const cl = loc.course;

  const isEnrolled = Boolean(enrollmentData);
  const isSaved = Boolean(savedData);
  const isFollowing = Boolean(followData);
  const userPlan = (subData?.plan as string | null) ?? "free";
  const canDuplicate = ["plus", "pro"].includes(userPlan);
  const hasStarted = (seenCount ?? 0) > 0;
  const reviewDue = dueCount ?? 0;
  const totalNonIgnored = configSections.flatMap((s) => s.cards.filter((c) => !c.ignored)).length;
  const newCardsCount = Math.max(0, totalNonIgnored - (seenCount ?? 0));

  const totalCorrect = (accuracyRows ?? []).reduce((s, r) => s + (r.correct_count ?? 0), 0);
  const totalAttempts = totalCorrect + (accuracyRows ?? []).reduce((s, r) => s + (r.incorrect_count ?? 0), 0);
  const accuracyPct = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : null;

  const creatorCourseCount = creatorCoursesData?.length ?? 0;
  const learnerCount = course.learner_count ?? 0;
  const creatorTotalLearners = (creatorCoursesData ?? []).reduce((sum, c) => sum + ((c as { learner_count: number }).learner_count ?? 0), 0);
  const creatorFollowers = creatorFollowerCount ?? 0;

  const levelLabel: Record<string, string> = {
    beginner: cl.beginner,
    intermediate: cl.intermediate,
    advanced: cl.advanced,
  };


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
                  <Image src={course.cover_image_url} alt={course.title} fill sizes="144px" className="object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center p-3">
                    <span className="text-center font-mono text-xs uppercase tracking-widest text-ocean opacity-70">
                      [ {(course.category ? (loc.categories[course.category] ?? course.category) : "course")} {course.level ? `· ${levelLabel[course.level] ?? course.level}` : ""} ]
                    </span>
                  </div>
                )}
              </div>

              {/* Meta */}
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs uppercase tracking-widest text-ink-2">
                  {[(course.category ? (loc.categories[course.category] ?? course.category) : null), course.level ? levelLabel[course.level] : null].filter(Boolean).join(" · ")}
                </p>
                <h1 className="mt-1 font-fredoka text-3xl font-[700] leading-tight tracking-tight">
                  {course.title}
                </h1>
                <p className="mt-1 font-manrope text-sm text-ink-2">
                  {t(loc.common.by, { name: creatorHandle })}
                  {course.rating > 0 && (
                    <> · <span className="text-yellow">★</span> {course.rating.toFixed(1)} ({formatCount(course.rating_count)})</>
                  )}
                  {" · "}{t(loc.common.learners, { count: formatCount(learnerCount) })}
                </p>

                {/* Feature badges */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {course.has_audio && <Badge>{loc.common.audio}</Badge>}
                  {(course.mems_count ?? 0) > 0 && <Badge>{loc.common.mems}</Badge>}
                  {course.has_images && <Badge>{cl.images}</Badge>}
                  {course.has_romanization && <Badge>{loc.common.romanization}</Badge>}
                  {course.verified && <Badge accent>{cl.verified}</Badge>}
                  {course.visibility !== "public" && (
                    <span className="rounded-full bg-red-soft px-3 py-1 font-mono text-xs font-[700] uppercase tracking-wider text-ink-2">
                      {course.visibility}
                    </span>
                  )}
                </div>

                {/* CTA row */}
                <div className="mt-5 flex flex-wrap items-center gap-x-2.5 gap-y-4">
                  {(isEnrolled || isOwner) && (
                    <>
                      <Link
                        href={`/speed-review/${course.slug}`}
                        className="inline-flex min-h-11 items-center rounded-full bg-orange px-5 py-2.5 font-manrope text-sm font-[800] text-on-bright shadow-hard-red transition hover:opacity-90 active:translate-y-[2px] active:shadow-hard-sm"
                      >
                        {cl.quickReview}
                      </Link>
                      <Link
                        href={reviewDue > 0 ? `/study/${course.slug}?mode=review` : "#"}
                        aria-disabled={reviewDue === 0}
                        className={`inline-flex min-h-11 items-center rounded-full px-5 py-2.5 font-manrope text-sm font-[800] shadow-hard-sm transition ${
                          reviewDue > 0
                            ? "bg-paper text-ink hover:bg-paper-2 active:translate-y-[1px] active:shadow-none"
                            : "pointer-events-none bg-ink/10 text-ink-3"
                        }`}
                      >
                        {t(cl.reviewCards, { count: String(reviewDue) })}
                      </Link>
                      <Link
                        href={newCardsCount > 0 ? `/study/${course.slug}?mode=new` : "#"}
                        aria-disabled={newCardsCount === 0}
                        className={`inline-flex min-h-11 items-center rounded-full px-5 py-2.5 font-manrope text-sm font-[800] shadow-hard-sm transition ${
                          newCardsCount > 0
                            ? "bg-paper text-ink hover:bg-paper-2 active:translate-y-[1px] active:shadow-none"
                            : "pointer-events-none bg-ink/10 text-ink-3"
                        }`}
                      >
                        {cl.learnNewWords}
                      </Link>
                    </>
                  )}

                  <Link
                    href={`/learn/${course.slug}`}
                    className="inline-flex min-h-11 items-center rounded-full bg-blue px-5 py-2.5 font-manrope text-sm font-[800] text-ocean shadow-hard-sm transition hover:opacity-90 active:translate-y-[1px] active:shadow-none"
                  >
                    {loc.learn.aiTutor}
                  </Link>

                  {!isOwner && course.visibility === "public" && (
                    <DuplicateButton
                      courseId={course.id}
                      canDuplicate={canDuplicate}
                      labels={{ duplicateCourse: cl.duplicateCourse, duplicating: cl.duplicating, duplicateUpsell: cl.duplicateUpsell }}
                    />
                  )}

                  {!isOwner && !isEnrolled && (
                    <form action={toggleSave}>
                      <input type="hidden" name="course_id" value={course.id} />
                      <input type="hidden" name="slug" value={course.slug} />
                      <button
                        type="submit"
                        className={`inline-flex min-h-11 cursor-pointer items-center rounded-full px-5 py-2.5 font-manrope text-sm font-[800] shadow-hard-sm transition active:translate-y-[1px] active:shadow-none ${
                          isSaved
                            ? "bg-green-soft text-ink hover:bg-red-soft hover:text-orange-text"
                            : "bg-paper text-ink hover:bg-paper-2"
                        }`}
                      >
                        {isSaved ? cl.saved : cl.save}
                      </button>
                    </form>
                  )}

                  {!isOwner && !isEnrolled && (
                    <form action={enrollCourse}>
                      <input type="hidden" name="course_id" value={course.id} />
                      <input type="hidden" name="slug" value={course.slug} />
                      <button
                        type="submit"
                        className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-orange px-5 py-2.5 font-manrope text-sm font-[800] text-on-bright shadow-hard-red transition hover:opacity-90 active:translate-y-[2px] active:shadow-hard-sm"
                      >
                        {cl.startLearning}
                      </button>
                    </form>
                  )}

                  {!isOwner && isEnrolled && (
                    <form action={unenrollCourse}>
                      <input type="hidden" name="course_id" value={course.id} />
                      <input type="hidden" name="slug" value={course.slug} />
                      <button
                        type="submit"
                        className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-paper px-5 py-2.5 font-manrope text-sm font-[800] text-ink-2 shadow-hard-sm transition hover:bg-red-soft hover:text-orange-text active:translate-y-[1px] active:shadow-none"
                      >
                        {cl.leave}
                      </button>
                    </form>
                  )}

                  {isOwner && (
                    <Link
                      href={`/c/${course.slug}/edit`}
                      className="inline-flex min-h-11 items-center rounded-full bg-paper px-5 py-2.5 font-manrope text-sm font-[800] text-ink shadow-hard-sm transition hover:bg-orange hover:text-on-bright active:translate-y-[1px] active:shadow-none"
                    >
                      {cl.editCourse}
                    </Link>
                  )}

                  <ShareButton title={course.title} slug={course.slug} labels={{ share: cl.share, copied: cl.copied }} />
                </div>
              </div>
            </div>
          </section>

          {/* About */}
          {course.description && (
            <section className="rounded-lg bg-paper-2 p-6 shadow-hard">
              <p className="mb-2 font-mono text-xs uppercase tracking-widest text-ink-2">{cl.about}</p>
              <p className="font-manrope text-sm leading-relaxed text-ink">{course.description}</p>
            </section>
          )}

          {/* Preview */}
          {(previewItems ?? []).length > 0 && (
            <PreviewSection
              items={previewItems}
              totalCount={course.card_count}
              courseId={course.id}
              slug={course.slug}
              sections={configSections}
              labels={{
                preview: cl.preview,
                previewOf: cl.previewOf,
                more: cl.more,
                configureWords: cl.configureWords,
                configureWordsTitle: cl.configureWordsTitle,
                configureWordsDesc: cl.configureWordsDesc,
                configureWordsSave: cl.configureWordsSave,
                configureWordsSaving: cl.configureWordsSaving,
                configureWordsSaved: cl.configureWordsSaved,
                configureWordsSelectAll: cl.configureWordsSelectAll,
                configureWordsUntitled: cl.configureWordsUntitled,
                ignoredLabel: loc.learn.ignoredLabel,
              }}
            />
          )}

          {/* Mems community banner */}
          <div className="flex items-center gap-4 rounded-lg bg-yellow-soft px-6 py-4 shadow-hard-sm">
            <span className="text-2xl">🧠</span>
            <p className="font-manrope text-sm text-ink">
              {t(cl.memsBanner, { count: formatCount(course.mems_count ?? 0) })}
            </p>
          </div>

          {/* Top Memory Hints */}
          <section className="rounded-lg bg-paper-2 p-6 shadow-hard">
            <p className="mb-4 font-mono text-xs uppercase tracking-widest text-ink-2">💡 {loc.mems.topHints}</p>
            {topMems.length === 0 ? (
              <p className="font-manrope text-sm text-ink-2">{loc.mems.topHintsEmpty}</p>
            ) : (
              <div className="flex flex-col gap-3">
                {topMems.map((mem) => (
                  <div key={mem.id} className="rounded-lg border border-ink/10 bg-paper p-3">
                    <p className="font-mono text-xs uppercase tracking-wider text-ink-2 mb-1">
                      {loc.mems.forCard.replace("{front}", mem.items?.front_text ?? "")}
                    </p>
                    <p className="font-kalam text-sm leading-relaxed text-ink">{mem.text}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-mono text-xs text-ink-2">@{mem.profiles?.username ?? "anonymous"}</span>
                      <span className="font-mono text-xs text-ink-2">▲ {mem.helpful_count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="flex flex-col gap-4 lg:hidden">
            <aside className="rounded-lg bg-paper-2 p-5 shadow-hard">
              <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-2">{cl.creatorSection}</p>
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-blue">
                  {creator?.avatar_url ? (
                    <Image src={creator.avatar_url} alt={creatorName} fill sizes="40px" className="object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center font-mono text-sm font-[700] text-ocean">
                      {creatorName[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-manrope text-sm font-[800] text-ink">{creatorHandle}</p>
                  <p className="font-mono text-xs text-ink-2">
                    {creatorCourseCount} {creatorCourseCount !== 1 ? cl.courseUnits : cl.courseUnit}
                    {" · "}{t(loc.common.learners, { count: formatCount(creatorTotalLearners) })}
                    {" · "}{formatCount(creatorFollowers)} {cl.followersUnit}
                  </p>
                </div>
              </div>

              {!isOwner && (
                <div className="mt-4">
                  <FollowButton
                    isFollowing={isFollowing}
                    creatorId={course.creator_id}
                    slug={course.slug}
                    labels={{ following: cl.following, follow: cl.follow }}
                  />
                </div>
              )}
            </aside>

            <aside className="rounded-lg bg-paper-2 p-5 shadow-hard">
              <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-2">{cl.statsSection}</p>
              <div className="flex flex-col gap-2">
                <StatRow label={cl.cards} value={String(course.card_count)} />
                {course.avg_completion_days != null && (
                  <StatRow label={cl.avgTime} value={t(cl.avgTimeDays, { count: course.avg_completion_days })} />
                )}
                <StatRow label={loc.common.audio} value={`${audioCount ?? 0}/${course.card_count}`} />
                <StatRow label={cl.images} value={`${imageCount ?? 0}/${course.card_count}`} />
                <StatRow label={loc.common.mems} value={formatCount(course.mems_count ?? 0)} />
              {accuracyPct !== null && (
                <StatRow label={cl.accuracy} value={`${accuracyPct}%`} />
              )}
              </div>
            </aside>
          </div>

          {/* Discussion */}
          <DiscussionThread courseId={course.id} courseSlug={course.slug} creatorId={course.creator_id} isOwner={isOwner} labels={loc.discussion} />
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div className="hidden flex-col gap-4 lg:flex">

          {/* Creator card */}
          <aside className="rounded-lg bg-paper-2 p-5 shadow-hard">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-2">{cl.creatorSection}</p>
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-blue">
                {creator?.avatar_url ? (
                  <Image src={creator.avatar_url} alt={creatorName} fill sizes="40px" className="object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center font-mono text-sm font-[700] text-ocean">
                    {creatorName[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <p className="font-manrope text-sm font-[800] text-ink">{creatorHandle}</p>
                <p className="font-mono text-xs text-ink-2">
                  {creatorCourseCount} {creatorCourseCount !== 1 ? cl.courseUnits : cl.courseUnit}
                  {" · "}{t(loc.common.learners, { count: formatCount(creatorTotalLearners) })}
                  {" · "}{formatCount(creatorFollowers)} {cl.followersUnit}
                </p>
              </div>
            </div>

            {!isOwner && (
              <div className="mt-4">
                <FollowButton
                  isFollowing={isFollowing}
                  creatorId={course.creator_id}
                  slug={course.slug}
                  labels={{ following: cl.following, follow: cl.follow }}
                />
              </div>
            )}
          </aside>

          {/* Stats card */}
          <aside className="rounded-lg bg-paper-2 p-5 shadow-hard">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-2">{cl.statsSection}</p>
            <div className="flex flex-col gap-2">
              <StatRow label={cl.cards} value={String(course.card_count)} />
              {course.avg_completion_days != null && (
                <StatRow label={cl.avgTime} value={t(cl.avgTimeDays, { count: course.avg_completion_days })} />
              )}
              <StatRow label={loc.common.audio} value={`${audioCount ?? 0}/${course.card_count}`} />
              <StatRow label={cl.images} value={`${imageCount ?? 0}/${course.card_count}`} />
              <StatRow label={loc.common.mems} value={formatCount(course.mems_count ?? 0)} />
              {accuracyPct !== null && (
                <StatRow label={cl.accuracy} value={`${accuracyPct}%`} />
              )}
            </div>
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
