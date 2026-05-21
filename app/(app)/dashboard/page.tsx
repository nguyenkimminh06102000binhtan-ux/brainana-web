import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

const exploreCourses = [
  {
    title: "Japanese N5",
    category: "Language",
    learners: "12.4k",
    icon: "🇯🇵",
    desc: "Master hiragana, katakana, and 800 vocabulary words.",
  },
  {
    title: "Human Anatomy",
    category: "Science",
    learners: "8.1k",
    icon: "🫁",
    desc: "Bones, organs, and systems — everything for your med exam.",
  },
  {
    title: "World History",
    category: "History",
    learners: "5.9k",
    icon: "🌍",
    desc: "From ancient civilisations to the modern era.",
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
    profile?.display_name ??
    profile?.username ??
    user.email?.split("@")[0] ??
    "Learner";
  const streak = profile?.current_streak ?? 0;
  const xp = profile?.total_xp ?? 0;
  const longestStreak = (profile as { longest_streak?: number } | null)?.longest_streak ?? 0;

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto space-y-10">

      {/* Welcome */}
      <div>
        <h1 className="text-dark text-3xl font-extrabold mb-1">
          Welcome back, {displayName} 👋
        </h1>
        <p className="text-dark/50 text-sm">
          {streak > 0
            ? `You're on a ${streak}-day streak — don't break it!`
            : "Start studying today to build your streak."}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon="🔥" label="Day Streak" value={streak.toString()} sub="current streak" accent="banana" />
        <StatCard icon="⭐" label="Total XP" value={xp.toLocaleString()} sub="experience points" accent="banana" />
        <StatCard icon="🏆" label="Longest Streak" value={longestStreak.toString()} sub="personal best" accent="zombie" />
      </div>

      {/* Continue Studying */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-dark text-xl font-extrabold">Continue Studying</h2>
          <Link href="/lessons" className="text-brain font-bold text-sm hover:underline">View all →</Link>
        </div>

        {enrollments && enrollments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrollments.map((e) => {
              const course = Array.isArray(e.courses) ? e.courses[0] : e.courses;
              if (!course) return null;
              const c = course as { id: string; title: string; category?: string };
              const progress = Math.min(100, Math.round((e.completed_items / 100) * 100));
              return (
                <CourseCard
                  key={c.id}
                  title={c.title}
                  category={c.category ?? "Course"}
                  progress={progress}
                  completed={e.completed_items}
                  href={`/study?course=${c.id}`}
                />
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-dark/10 rounded-2xl p-8 text-center">
            <span className="text-4xl block mb-3">📚</span>
            <p className="text-dark font-bold mb-1">No courses yet</p>
            <p className="text-dark/50 text-sm mb-4">Pick a course below to start learning.</p>
            <Link
              href="/lessons"
              className="inline-block bg-banana text-dark font-extrabold text-sm px-5 py-2.5 rounded-full hover:bg-banana/90 transition"
            >
              Browse Courses
            </Link>
          </div>
        )}
      </section>

      {/* Explore Courses */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-dark text-xl font-extrabold">Explore Courses</h2>
          <Link href="/lessons" className="text-brain font-bold text-sm hover:underline">See all →</Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {exploreCourses.map((c) => (
            <div
              key={c.title}
              className="bg-white border border-dark/10 rounded-2xl p-6 flex flex-col gap-3 hover:border-banana/40 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-banana/10 border border-banana/20 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  {c.icon}
                </div>
                <div>
                  <p className="text-dark font-extrabold text-sm">{c.title}</p>
                  <p className="text-dark/40 text-xs">{c.category} · {c.learners} learners</p>
                </div>
              </div>
              <p className="text-dark/55 text-sm leading-relaxed flex-1">{c.desc}</p>
              <Link
                href="/lessons"
                className="block text-center bg-dark text-cream font-bold text-sm py-2.5 rounded-full hover:bg-banana hover:text-dark transition"
              >
                Study Now
              </Link>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  sub: string;
  accent: "banana" | "zombie";
}) {
  const ring =
    accent === "banana"
      ? "bg-banana/10 border-banana/20"
      : "bg-zombie/10 border-zombie/20";

  return (
    <div className="bg-white border border-dark/10 rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-2xl shrink-0 ${ring}`}>
        {icon}
      </div>
      <div>
        <p className="text-dark text-2xl font-extrabold leading-none">{value}</p>
        <p className="text-dark font-bold text-sm mt-0.5">{label}</p>
        <p className="text-dark/40 text-xs">{sub}</p>
      </div>
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
    <div className="bg-white border border-dark/10 rounded-2xl p-5 flex flex-col gap-3">
      <div>
        <p className="text-dark/40 text-xs font-bold uppercase tracking-widest mb-1">{category}</p>
        <p className="text-dark font-extrabold">{title}</p>
        <p className="text-dark/40 text-xs mt-1">{completed} items completed</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-dark/50 text-xs font-semibold">Progress</span>
          <span className="text-dark font-bold text-xs">{progress}%</span>
        </div>
        <div className="h-2 bg-dark/10 rounded-full overflow-hidden">
          <div className="h-full bg-banana rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <Link
        href={href}
        className="block text-center bg-banana text-dark font-extrabold text-sm py-2.5 rounded-full hover:bg-banana/90 transition"
      >
        Study Now
      </Link>
    </div>
  );
}
