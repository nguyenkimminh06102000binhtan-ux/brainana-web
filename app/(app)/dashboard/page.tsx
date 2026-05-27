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
        <h1 className="text-3xl font-semibold tracking-tight">Welcome back, {displayName}</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {streak > 0
            ? `You are on a ${streak}-day streak.`
            : "Start studying today to build your streak."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Day Streak" value={streak.toString()} sub="current streak" />
        <StatCard label="Total XP" value={xp.toLocaleString()} sub="experience points" />
        <StatCard label="Longest Streak" value={longestStreak.toString()} sub="personal best" />
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Continue Studying</h2>
          <Link href="/courses" className="text-sm font-medium underline-offset-4 hover:underline">
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
          <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
            <p className="font-medium">No courses yet</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Pick a course below to start learning.
            </p>
            <Link
              href="/courses"
              className="mt-4 inline-block rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Browse Courses
            </Link>
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Explore Courses</h2>
          <Link href="/courses" className="text-sm font-medium underline-offset-4 hover:underline">
            See all
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exploreCourses.map((course) => (
            <article
              key={course.title}
              className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {course.category} · {course.learners} learners
              </p>
              <h3 className="mt-2 font-semibold">{course.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {course.description}
              </p>
              <Link
                href="/courses"
                className="mt-4 inline-block rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
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
    <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm font-medium">{label}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{sub}</p>
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
    <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{category}</p>
      <p className="mt-1 font-semibold">{title}</p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{completed} items completed</p>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-zinc-500 dark:text-zinc-400">Progress</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div className="h-full rounded-full bg-zinc-950 dark:bg-zinc-50" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <Link
        href={href}
        className="mt-4 block rounded-md bg-zinc-950 px-3 py-2 text-center text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        Study Now
      </Link>
    </div>
  );
}
