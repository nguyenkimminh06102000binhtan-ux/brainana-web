import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

const exploreCourses = [
  {
    title: "Japanese N5",
    category: "Language",
    learners: "12.4k",
    description: "Master hiragana, katakana, and essential vocabulary.",
  },
  {
    title: "Human Anatomy",
    category: "Science",
    learners: "8.1k",
    description: "Review body systems, organs, and core medical terms.",
  },
  {
    title: "World History",
    category: "History",
    learners: "5.9k",
    description: "Study major events from ancient civilizations to today.",
  },
];

export default async function DashboardPage() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, total_xp, current_streak, longest_streak")
    .eq("id", user.id)
    .single();

  const { data: enrollments } = await supabase
    .from("user_courses")
    .select(`
      completed_items,
      last_studied_at,
      courses (id, title, category)
    `)
    .eq("user_id", user.id)
    .order("last_studied_at", { ascending: false })
    .limit(3);

  const displayName =
    profile?.display_name ?? profile?.username ?? user.email?.split("@")[0] ?? "Learner";
  const streak = profile?.current_streak ?? 0;
  const xp = profile?.total_xp ?? 0;
  const longestStreak = (profile as { longest_streak?: number } | null)?.longest_streak ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-8">
      <div>
        <h1 className="font-fredoka text-4xl font-[600] leading-tight tracking-tight">Welcome back, {displayName}</h1>
        <p className="mt-2 font-manrope text-sm text-ink-2">
          {streak > 0
            ? `You are on a ${streak}-day streak.`
            : "Start studying today to build your streak."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="🔥 Day Streak" value={streak.toString()} sub="current streak" />
        <StatCard label="🧠 Total XP" value={xp.toLocaleString()} sub="experience points" />
        <StatCard label="Longest Streak" value={longestStreak.toString()} sub="personal best" />
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-fredoka text-3xl font-[600] tracking-tight">Continue Studying</h2>
          <Link href="/courses" className="font-manrope text-sm font-[600] text-red underline-offset-4 hover:underline">
            View all
          </Link>
        </div>

        {enrollments && enrollments.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enrollments.map((enrollment) => {
              const course = Array.isArray(enrollment.courses)
                ? enrollment.courses[0]
                : enrollment.courses;
              if (!course) return null;
              const currentCourse = course as { id: string; title: string; category?: string };
              const progress = Math.min(100, Math.round((enrollment.completed_items / 100) * 100));

              return (
                <CourseCard
                  key={currentCourse.id}
                  title={currentCourse.title}
                  category={currentCourse.category ?? "Course"}
                  progress={progress}
                  completed={enrollment.completed_items}
                  href={`/study?course=${currentCourse.id}`}
                />
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg bg-paper-2 p-8 text-center shadow-hard">
            <p className="font-fredoka text-2xl font-[600] tracking-tight">No courses yet</p>
            <p className="mt-1 font-manrope text-sm text-ink-2">
              Pick a course below to start learning.
            </p>
            <Link
              href="/courses"
              className="mt-4 inline-block rounded-full bg-orange px-6 py-3 font-manrope text-base font-[800] text-white shadow-hard-red transition active:translate-y-[2px] active:shadow-hard-sm"
            >
              Browse Courses
            </Link>
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-fredoka text-3xl font-[600] tracking-tight">Explore Courses</h2>
          <Link href="/courses" className="font-manrope text-sm font-[600] text-red underline-offset-4 hover:underline">
            See all
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exploreCourses.map((course) => (
            <article
              key={course.title}
              className="rounded-lg bg-paper-2 p-6 shadow-hard"
            >
              <p className="font-mono text-xs uppercase tracking-widest text-ink-2">
                {course.category} / {course.learners} learners
              </p>
              <h3 className="mt-2 font-fredoka text-2xl font-[600] tracking-tight">{course.title}</h3>
              <p className="mt-2 font-manrope text-sm leading-6 text-ink-2">
                {course.description}
              </p>
              <Link
                href="/courses"
                className="mt-4 inline-block rounded-full bg-paper px-5 py-2.5 font-manrope text-sm font-[800] text-ink shadow-hard-sm transition active:translate-y-[2px] active:shadow-none"
              >
                View course
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-lg bg-paper-2 p-6 shadow-hard">
      <p className="font-mono text-3xl font-[600]">{value}</p>
      <p className="mt-1 font-mono text-xs uppercase tracking-widest text-ink-2">{label}</p>
      <p className="font-manrope text-xs text-ink-2">{sub}</p>
    </div>
  );
}

function CourseCard({
  title,
  category,
  progress,
  completed,
  href,
}: {
  title: string;
  category: string;
  progress: number;
  completed: number;
  href: string;
}) {
  return (
    <div className="rounded-lg bg-paper-2 p-6 shadow-hard">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-2">{category}</p>
      <p className="mt-1 font-fredoka text-2xl font-[600] tracking-tight">{title}</p>
      <p className="mt-1 font-mono text-xs text-ink-2">{completed} items completed</p>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between font-mono text-xs uppercase tracking-widest">
          <span className="text-ink-2">Progress</span>
          <span className="font-[600]">{progress}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-paper">
          <div className="h-full bg-orange" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <Link
        href={href}
        className="mt-4 block rounded-full bg-orange px-5 py-3 text-center font-manrope text-base font-[800] text-white shadow-hard-red transition active:translate-y-[2px] active:shadow-hard-sm"
      >
        Study Now
      </Link>
    </div>
  );
}
