import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import AvatarMenu from "./_components/avatar-menu";

const navItems = [
  { label: "Home", href: "/home" },
  { label: "Browse", href: "/browse" },
  { label: "Library", href: "/library" },
  { label: "Create", href: "/create" },
  { label: "Community", href: "/community" },
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
    .select("display_name, username, avatar_url, current_streak")
    .eq("id", user.id)
    .single();

  const displayName =
    profile?.display_name ?? profile?.username ?? user.email?.split("@")[0] ?? "Learner";
  const initial = displayName[0].toUpperCase();
  const currentStreak = profile?.current_streak ?? 0;

  return (
    <div className="flex min-h-screen bg-paper text-ink">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="m-4 flex flex-wrap items-center gap-4 rounded-full bg-paper-2 px-6 py-4 shadow-hard">
          <Link href="/home" className="flex items-center gap-3 font-fredoka text-xl font-[700] tracking-tight">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-yellow text-2xl text-ink">
              B
            </span>
            Brainana
          </Link>

          <nav className="flex flex-1 flex-wrap items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 font-manrope text-sm font-[800] text-ink-2 hover:bg-blue hover:text-ocean"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <form action="/browse" className="hidden min-w-48 sm:block">
            <input
              name="q"
              placeholder="Search"
              className="w-full rounded-full bg-paper px-4 py-2 font-manrope text-sm text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-yellow"
            />
          </form>

          <div className="rounded-full bg-blue px-4 py-2 font-mono text-xs uppercase tracking-widest text-ocean">
            🔥 {currentStreak} days
          </div>

          <AvatarMenu
            avatarUrl={profile?.avatar_url ?? null}
            initial={initial}
            username={profile?.username ?? ""}
          />
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
