import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/utils/supabase/server";
import { logout } from "./actions";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "🏠" },
  { label: "My Courses", href: "/lessons", icon: "📚" },
  { label: "Study", href: "/study", icon: "🧠" },
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, avatar_url, plan, total_xp, current_streak")
    .eq("id", user.id)
    .single();

  const displayName = profile?.display_name ?? profile?.username ?? user.email?.split("@")[0] ?? "Learner";
  const initial = displayName[0].toUpperCase();
  const plan = profile?.plan ?? "free";
  const totalXp = profile?.total_xp ?? 0;
  const currentStreak = profile?.current_streak ?? 0;

  return (
    <div className="font-nunito flex min-h-screen">
      {/*
        CSS-only mobile sidebar toggle.
        The hidden checkbox is the state store; the sidebar and overlay
        are siblings and respond via peer-checked: variants.
        The hamburger button and overlay are <label> elements pointing
        at the checkbox by id — they can live anywhere in the DOM.
      */}
      <input type="checkbox" id="sidebar-toggle" className="peer sr-only" />

      {/* Overlay — closes sidebar when tapped on mobile */}
      <label
        htmlFor="sidebar-toggle"
        className="fixed inset-0 z-20 bg-dark/60 backdrop-blur-sm hidden peer-checked:block lg:hidden cursor-default"
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside className="
        fixed inset-y-0 left-0 z-30 w-64 bg-dark flex flex-col border-r border-cream/10
        -translate-x-full peer-checked:translate-x-0
        transition-transform duration-300
        lg:relative lg:translate-x-0 lg:z-auto
      ">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-cream/10 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/logos/brainana-navbar.svg"
              alt="Brainana"
              width={140}
              height={32}
              priority
            />
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-cream/55 hover:text-cream hover:bg-cream/10 transition"
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Streak widget */}
        <div className="px-3 pb-4 shrink-0 space-y-3">
          <div className="bg-banana/10 border border-banana/20 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-xl">🔥</span>
            <div>
              <p className="text-banana font-extrabold text-sm">{currentStreak}-day streak!</p>
              <p className="text-banana/50 text-xs">Keep going</p>
            </div>
          </div>

          {/* User card */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-9 h-9 rounded-full bg-banana flex items-center justify-center text-dark font-extrabold text-sm shrink-0 overflow-hidden">
              {profile?.avatar_url ? (
                <Image src={profile.avatar_url} alt={displayName} width={36} height={36} className="object-cover" />
              ) : (
                initial
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-cream font-bold text-sm truncate">{displayName}</p>
              <p className="text-cream/40 text-xs capitalize">{plan} plan</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Topbar */}
        <header className="bg-white border-b border-dark/10 px-6 py-3.5 flex items-center gap-4 shrink-0">
          {/* Hamburger — toggles sidebar on mobile */}
          <label
            htmlFor="sidebar-toggle"
            className="lg:hidden p-2 rounded-xl text-dark/60 hover:text-dark hover:bg-dark/5 transition cursor-pointer"
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </label>

          {/* Page title placeholder — real title comes from page metadata */}
          <span className="flex-1 text-dark font-extrabold text-lg">Brainana</span>

          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <button className="p-2 rounded-xl text-dark/40 hover:text-dark hover:bg-dark/5 transition" aria-label="Notifications">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </button>

            {/* XP badge */}
            <div className="hidden sm:flex items-center gap-1.5 bg-banana/10 border border-banana/20 rounded-full px-3 py-1.5">
              <span className="text-sm">⭐</span>
              <span className="text-dark font-extrabold text-xs">{totalXp.toLocaleString()} XP</span>
            </div>

            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-banana flex items-center justify-center text-dark font-extrabold text-sm shrink-0 overflow-hidden">
              {profile?.avatar_url ? (
                <Image src={profile.avatar_url} alt={displayName} width={36} height={36} className="object-cover" />
              ) : (
                initial
              )}
            </div>

            {/* Logout */}
            <form action={logout}>
              <button
                type="submit"
                className="border-2 border-dark/15 text-dark font-bold text-sm px-4 py-2 rounded-full hover:bg-dark hover:text-cream hover:border-dark transition"
              >
                Log out
              </button>
            </form>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 bg-cream">
          {children}
        </main>
      </div>
    </div>
  );
}
