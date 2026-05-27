import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/utils/supabase/server";
import { logout } from "./actions";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Courses", href: "/courses" },
  { label: "Study", href: "/study" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Settings", href: "/settings" },
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

  const displayName =
    profile?.display_name ?? profile?.username ?? user.email?.split("@")[0] ?? "Learner";
  const initial = displayName[0].toUpperCase();
  const plan = profile?.plan ?? "free";
  const totalXp = profile?.total_xp ?? 0;
  const currentStreak = profile?.current_streak ?? 0;

  return (
    <div className="flex min-h-screen bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <input type="checkbox" id="sidebar-toggle" className="peer sr-only" />

      <label
        htmlFor="sidebar-toggle"
        className="fixed inset-0 z-20 hidden bg-black/40 peer-checked:block lg:hidden"
        aria-hidden="true"
      />

      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 -translate-x-full flex-col border-r border-zinc-200 bg-white transition-transform peer-checked:translate-x-0 dark:border-zinc-800 dark:bg-zinc-950 lg:relative lg:z-auto lg:translate-x-0">
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <Link href="/dashboard" className="text-lg font-semibold">
            Brainana
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
          <div className="mb-3 rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800">
            <p className="font-medium">{currentStreak}-day streak</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{totalXp.toLocaleString()} XP</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={displayName}
                  width={36}
                  height={36}
                  className="h-full w-full object-cover"
                />
              ) : (
                initial
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="text-xs capitalize text-zinc-500 dark:text-zinc-400">{plan} plan</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-4 border-b border-zinc-200 bg-white px-6 py-3 dark:border-zinc-800 dark:bg-zinc-950">
          <label
            htmlFor="sidebar-toggle"
            className="cursor-pointer rounded-md border border-zinc-300 px-2 py-1 text-sm lg:hidden dark:border-zinc-700"
            aria-label="Toggle menu"
          >
            Menu
          </label>

          <span className="flex-1 text-sm font-medium">Brainana</span>

          <div className="hidden text-sm text-zinc-500 dark:text-zinc-400 sm:block">
            {totalXp.toLocaleString()} XP
          </div>

          <form action={logout}>
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              Log out
            </button>
          </form>
        </header>

        <main className="flex-1 bg-zinc-50 dark:bg-zinc-900/40">{children}</main>
      </div>
    </div>
  );
}
