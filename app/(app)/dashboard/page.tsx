import { logout } from "../actions";

const stats = [
  { label: "Day streak", value: "7", icon: "🔥", iconBg: "bg-brain/10" },
  { label: "Lessons done", value: "42", icon: "📖", iconBg: "bg-zombie/10" },
  { label: "XP earned", value: "1,250", icon: "⭐", iconBg: "bg-banana/10" },
];

const courses = [
  { title: "JavaScript Basics", progress: 65, emoji: "🟨", done: 13, total: 20 },
  { title: "Brain Science 101", progress: 30, emoji: "🧠", done: 5, total: 15 },
  { title: "Zombie Survival Guide", progress: 80, emoji: "🧟", done: 8, total: 10 },
];

const activity = [
  { text: "Completed 'Variables & Scope'", time: "2h ago", icon: "✅" },
  { text: "Earned 50 XP bonus", time: "2h ago", icon: "⭐" },
  { text: "Hit a 7-day streak!", time: "Yesterday", icon: "🔥" },
  { text: "Started 'Brain Science 101'", time: "2 days ago", icon: "📚" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8 max-w-5xl">
      {/* Welcome banner */}
      <div className="bg-banana rounded-3xl px-8 py-7 flex items-center justify-between gap-4">
        <div>
          <p className="text-dark/60 text-sm font-semibold mb-1">Welcome back 👋</p>
          <h1 className="text-dark text-2xl font-extrabold leading-tight">
            Ready to feed your brain?
          </h1>
          <p className="text-dark/50 text-sm mt-1.5">
            You&apos;re on a 7-day streak — don&apos;t break it.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-5 shrink-0">
          <span className="text-6xl">🧟</span>
          <form action={logout}>
            <button
              type="submit"
              className="bg-dark text-cream font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-dark/80 transition"
            >
              Log out
            </button>
          </form>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-3xl p-6 border border-dark/10">
            <div
              className={`w-12 h-12 ${s.iconBg} rounded-2xl flex items-center justify-center text-xl mb-4`}
            >
              {s.icon}
            </div>
            <p className="text-dark text-3xl font-extrabold">{s.value}</p>
            <p className="text-dark/45 text-sm font-semibold mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Continue learning */}
      <div>
        <h2 className="text-dark text-xl font-extrabold mb-4">Continue Learning</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {courses.map((c) => (
            <div
              key={c.title}
              className="bg-white rounded-3xl p-6 border border-dark/10 hover:shadow-md transition cursor-pointer group"
            >
              <div className="text-4xl mb-4">{c.emoji}</div>
              <h3 className="text-dark font-extrabold mb-1 group-hover:text-zombie transition">
                {c.title}
              </h3>
              <p className="text-dark/40 text-xs mb-4">
                {c.done} of {c.total} lessons complete
              </p>
              <div className="h-2 bg-dark/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-zombie rounded-full"
                  style={{ width: `${c.progress}%` }}
                />
              </div>
              <p className="text-dark/35 text-xs mt-1.5 text-right font-semibold">
                {c.progress}%
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="text-dark text-xl font-extrabold mb-4">Recent Activity</h2>
        <div className="bg-white rounded-3xl border border-dark/10 overflow-hidden divide-y divide-dark/5">
          {activity.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-6 py-4 hover:bg-cream/50 transition"
            >
              <span className="text-xl">{item.icon}</span>
              <p className="text-dark text-sm font-semibold flex-1">{item.text}</p>
              <p className="text-dark/30 text-xs shrink-0">{item.time}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
