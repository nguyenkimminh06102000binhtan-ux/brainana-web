import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "🏠" },
  { label: "Lessons", href: "/lessons", icon: "📚" },
  { label: "Progress", href: "/progress", icon: "📈" },
  { label: "Leaderboard", href: "/leaderboard", icon: "🏆" },
  { label: "Settings", href: "/settings", icon: "⚙️" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const initial = (user.email?.[0] ?? "U").toUpperCase();
  const displayName = user.email?.split("@")[0] ?? "Learner";

  return (
    <div className="flex min-h-full">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-dark flex flex-col border-r border-cream/10">
        <div className="px-6 py-6 border-b border-cream/10">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🧠</span>
            <span className="text-banana font-extrabold text-xl">Brainana</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-cream/55 hover:text-cream hover:bg-cream/10 font-semibold text-sm transition"
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-4 pb-6">
          <div className="bg-banana/10 border border-banana/20 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-xl">🔥</span>
            <div>
              <p className="text-banana font-extrabold text-sm">7-day streak!</p>
              <p className="text-banana/50 text-xs">Keep going</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <header className="bg-white border-b border-dark/10 px-8 py-4 flex items-center justify-end gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-dark font-bold text-sm">{displayName}</p>
              <p className="text-dark/40 text-xs">Free plan</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-banana flex items-center justify-center text-dark font-extrabold text-sm">
              {initial}
            </div>
          </div>
        </header>

        <main className="flex-1 bg-cream px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
