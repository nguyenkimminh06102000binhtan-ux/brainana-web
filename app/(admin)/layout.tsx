import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient(await cookies());

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, display_name, username")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/home");

  const name = profile.display_name ?? profile.username ?? user.email;

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Admin header */}
      <header className="border-b border-ink/10 bg-paper-2 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/home" className="font-fredoka text-xl font-[700] tracking-tight">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-yellow text-lg text-on-bright shadow-hard-sm">B</span>
            </Link>
            <span className="font-mono text-xs uppercase tracking-widest text-ink-3">Admin</span>
            <nav className="flex items-center gap-2">
              <Link href="/admin" className="font-manrope text-sm font-[700] text-ink-2 hover:text-ink px-3 py-1.5 rounded-full hover:bg-ink/5 transition">
                Dashboard
              </Link>
              <Link href="/admin/users" className="font-manrope text-sm font-[700] text-ink-2 hover:text-ink px-3 py-1.5 rounded-full hover:bg-ink/5 transition">
                Users
              </Link>
            </nav>
          </div>
          <span className="font-manrope text-xs text-ink-3">{name}</span>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        {children}
      </main>
    </div>
  );
}
