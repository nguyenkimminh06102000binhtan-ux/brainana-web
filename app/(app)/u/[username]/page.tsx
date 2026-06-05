import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { getLocale } from "@/utils/i18n";
import ActivityHeatmap from "./activity-heatmap";
import ProfileContributions from "./ProfileContributions";
import type { ProfileMem } from "./ProfileContributions";

// XP thresholds for each level (index 0 = L1)
const XP_LEVELS = [0, 300, 800, 1800, 3500, 6000, 10000, 16000, 25000, 40000];

function getLevel(xp: number): number {
  let level = 1;
  for (let i = 1; i < XP_LEVELS.length; i++) {
    if (xp >= XP_LEVELS[i]) level = i + 1;
    else break;
  }
  return Math.min(level, XP_LEVELS.length);
}

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

const BADGE_EMOJI: Record<string, string> = {
  first_course: "📚",
  first_study: "🧟",
  streak_7: "🔥",
  streak_30: "💀",
  course_creator: "👨‍🍳",
  mastered_100: "🧠",
  top_leaderboard: "🏆",
};

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  level: string | null;
  card_count: number;
};

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = createClient(await cookies());

  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, total_xp, current_streak, created_at")
    .eq("username", username)
    .single();

  if (!profile) notFound();

  const isOwnProfile = user?.id === profile.id;
  const level = getLevel(profile.total_xp ?? 0);
  const displayName = profile.display_name ?? profile.username;
  const joinedDate = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });

  // Public queries
  const [
    { count: followerCount },
    { count: followingCount },
    { data: userBadgesRaw },
    { data: isFollowingRow },
  ] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profile.id),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profile.id),
    supabase.from("user_badges").select("earned_at, badges(key, name, description)").eq("user_id", profile.id),
    user && !isOwnProfile
      ? supabase.from("follows").select("follower_id").eq("follower_id", user.id).eq("following_id", profile.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // Private queries — only return data when viewer IS the profile owner (RLS)
  const _now = new Date();
  const twelveWeeksAgo = new Date(Date.UTC(_now.getUTCFullYear(), _now.getUTCMonth(), _now.getUTCDate() - 83));

  const [
    { count: masteredCount },
    { data: sessionRows },
    { data: enrolledRaw },
    { data: viewerProfile },
    { data: memsRaw },
  ] = await Promise.all([
    supabase.from("item_progress").select("*", { count: "exact", head: true }).eq("user_id", profile.id).eq("mastered", true),
    supabase.from("study_sessions").select("started_at, items_studied").eq("user_id", profile.id).gte("started_at", twelveWeeksAgo.toISOString()),
    supabase.from("user_courses").select("courses!course_id(id, slug, title, category, level, card_count)").eq("user_id", profile.id),
    user ? supabase.from("profiles").select("active_origin_language").eq("id", user.id).single() : Promise.resolve({ data: null }),
    supabase.from("mems").select("id, text, helpful_count, card_id, author_id, items!card_id(front_text, courses!course_id(title, slug))").eq("author_id", profile.id).order("helpful_count", { ascending: false }),
  ]);

  const loc = getLocale((viewerProfile?.active_origin_language as string | null) ?? null);
  const profileMems = (memsRaw ?? []) as unknown as ProfileMem[];

  // Build heatmap data
  const heatmapData: Record<string, number> = {};
  let totalReviewed = 0;
  for (const s of sessionRows ?? []) {
    const day = s.started_at.slice(0, 10);
    heatmapData[day] = (heatmapData[day] ?? 0) + (s.items_studied ?? 0);
    totalReviewed += s.items_studied ?? 0;
  }

  // Courses in progress (have item_progress rows)
  const allEnrolled = ((enrolledRaw ?? []) as unknown as { courses: CourseRow }[]).map(
    (row) => row.courses,
  );

  const courseIds = allEnrolled.map((c) => c.id);
  const { data: progressRows } = courseIds.length > 0
    ? await supabase.from("item_progress").select("course_id, mastered").eq("user_id", profile.id).in("course_id", courseIds)
    : { data: [] };

  const studiedCourseIds = new Set((progressRows ?? []).map((r) => r.course_id));
  const masteredByCourse: Record<string, number> = {};
  for (const row of progressRows ?? []) {
    if (row.mastered) masteredByCourse[row.course_id] = (masteredByCourse[row.course_id] ?? 0) + 1;
  }

  const inProgressCourses = allEnrolled.filter((c) => studiedCourseIds.has(c.id));
  const coursesActive = inProgressCourses.length;

  const badges = ((userBadgesRaw ?? []) as unknown as {
    earned_at: string;
    badges: { key: string; name: string; description: string | null };
  }[]).map((b) => ({ ...b.badges, earned_at: b.earned_at }));

  const isFollowing = Boolean(isFollowingRow);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">

        {/* ── LEFT SIDEBAR ── */}
        <aside className="flex flex-col items-center gap-5">

          {/* Avatar + level badge */}
          <div className="relative">
            <div className="relative h-44 w-44 overflow-hidden rounded-full bg-blue shadow-hard">
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt={displayName} fill sizes="176px" className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center font-fredoka text-6xl font-[700] text-ocean">
                  {displayName[0]?.toUpperCase()}
                </span>
              )}
            </div>
            {/* Level badge */}
            <div className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-orange shadow-hard-sm">
              <span className="font-mono text-xs font-[700] text-on-bright">L{level}</span>
            </div>
          </div>

          {/* Name + handle + join date */}
          <div className="text-center">
            <h1 className="font-fredoka text-2xl font-[700] tracking-tight">{displayName}</h1>
            <p className="font-mono text-xs text-ink-2">
              @{profile.username} · joined {joinedDate}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {isOwnProfile ? (
              <Link
                href="/settings"
                className="rounded-full bg-paper-2 px-5 py-2 font-manrope text-sm font-[800] text-ink shadow-hard-sm transition hover:bg-orange hover:text-on-bright active:translate-y-[1px]"
              >
                Edit profile
              </Link>
            ) : user ? (
              <form action={isFollowing ? "/api/unfollow" : "/api/follow"} method="POST">
                <input type="hidden" name="target_id" value={profile.id} />
                <button
                  type="submit"
                  className={`rounded-full px-5 py-2 font-manrope text-sm font-[800] shadow-hard-sm transition active:translate-y-[1px] ${
                    isFollowing
                      ? "bg-paper-2 text-ink hover:bg-red-soft"
                      : "bg-orange text-on-bright hover:opacity-90"
                  }`}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                className="rounded-full bg-orange px-5 py-2 font-manrope text-sm font-[800] text-on-bright shadow-hard-sm transition hover:opacity-90"
              >
                Follow
              </Link>
            )}
          </div>

          {/* Following / Followers */}
          <div className="w-full rounded-lg bg-paper-2 p-4 shadow-hard-sm">
            <div className="flex justify-around">
              <div className="text-center">
                <p className="font-fredoka text-2xl font-[700]">{fmt(followingCount ?? 0)}</p>
                <p className="font-mono text-xs uppercase tracking-widest text-ink-2">following</p>
              </div>
              <div className="w-px bg-ink/10" />
              <div className="text-center">
                <p className="font-fredoka text-2xl font-[700]">{fmt(followerCount ?? 0)}</p>
                <p className="font-mono text-xs uppercase tracking-widest text-ink-2">followers</p>
              </div>
            </div>
          </div>
        </aside>

        {/* ── RIGHT CONTENT ── */}
        <div className="flex flex-col gap-6">

          {/* Stat chips */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatChip
              emoji="🔥"
              value={String(profile.current_streak ?? 0)}
              label="day streak"
              accent="bg-red-soft"
            />
            {isOwnProfile && (
              <StatChip
                emoji="🧠"
                value={fmt(masteredCount ?? 0)}
                label="cards mastered"
                accent="bg-green-soft"
              />
            )}
            {isOwnProfile && (
              <StatChip
                emoji="📚"
                value={String(coursesActive)}
                label="courses active"
                accent="bg-yellow-soft"
              />
            )}
            {!isOwnProfile && (
              <StatChip
                emoji="⚡"
                value={fmt(profile.total_xp ?? 0)}
                label="total XP"
                accent="bg-yellow-soft"
              />
            )}
          </div>

          {/* Activity heatmap — own profile only */}
          {isOwnProfile && (
            <ActivityHeatmap data={heatmapData} totalReviewed={totalReviewed} />
          )}

          {/* Courses in progress — own profile only */}
          {isOwnProfile && (
            <section className="rounded-lg bg-paper-2 p-5 shadow-hard">
              <p className="mb-4 font-mono text-xs uppercase tracking-widest text-ink-2">
                Courses in progress
              </p>
              {inProgressCourses.length === 0 ? (
                <p className="font-manrope text-sm text-ink-2">No courses in progress yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {inProgressCourses.slice(0, 5).map((course) => {
                    const mastered = masteredByCourse[course.id] ?? 0;
                    const pct = course.card_count > 0 ? Math.round((mastered / course.card_count) * 100) : 0;
                    return (
                      <div key={course.id} className="flex items-center gap-4">
                        <div className="min-w-0 flex-1">
                          <Link href={`/c/${course.slug}`} className="font-manrope text-sm font-[700] text-ink hover:text-orange-text transition truncate block">
                            {course.title}
                          </Link>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper">
                              <div className="h-full rounded-full bg-orange transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="shrink-0 font-mono text-xs text-ink-3">{mastered}/{course.card_count}</span>
                          </div>
                        </div>
                        <Link
                          href={`/study/${course.slug}`}
                          className="shrink-0 rounded-full bg-orange px-3 py-1 font-manrope text-xs font-[800] text-on-bright shadow-hard-sm transition hover:opacity-90"
                        >
                          Study →
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Badges */}
          <section className="rounded-lg bg-paper-2 p-5 shadow-hard">
            <p className="mb-4 font-mono text-xs uppercase tracking-widest text-ink-2">Badges</p>
            {badges.length === 0 ? (
              <p className="font-manrope text-sm text-ink-2">No badges earned yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {badges.map((badge) => (
                  <div key={badge.key} className="flex items-center gap-3 rounded-lg bg-paper px-4 py-3 shadow-hard-sm">
                    <span className="text-2xl">{BADGE_EMOJI[badge.key] ?? "🏅"}</span>
                    <div className="min-w-0">
                      <p className="font-manrope text-sm font-[700] text-ink leading-tight">{badge.name}</p>
                      {badge.description && (
                        <p className="font-mono text-xs text-ink-3 leading-tight">{badge.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Contributions */}
          <ProfileContributions
            initialMems={profileMems}
            currentUserId={user?.id ?? null}
            isOwnProfile={isOwnProfile}
            labels={{
              contributions: loc.mems.contributions,
              contributionsEmpty: loc.mems.contributionsEmpty,
              totalHelpful: loc.mems.totalHelpful,
              forCard: loc.mems.forCard,
              inCourse: loc.mems.inCourse,
              editLabel: loc.mems.editLabel,
              delete: loc.mems.delete,
              deleteConfirm: loc.mems.deleteConfirm,
              editYourMem: loc.mems.editYourMem,
              placeholder: loc.mems.placeholder,
              submit: loc.mems.submit,
              cancel: loc.mems.cancel,
              charsLeft: loc.mems.charsLeft,
              helpful: loc.mems.helpful,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function StatChip({
  emoji, value, label, accent,
}: {
  emoji: string;
  value: string;
  label: string;
  accent: string;
}) {
  return (
    <div className={`rounded-lg ${accent} p-4 shadow-hard`}>
      <p className="font-fredoka text-2xl font-[700] leading-tight">
        {emoji} {value}
      </p>
      <p className="font-mono text-xs uppercase tracking-widest text-ink-2">{label}</p>
    </div>
  );
}
