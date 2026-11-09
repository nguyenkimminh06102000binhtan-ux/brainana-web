import { cookies } from "next/headers";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

export default async function AdminUsers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const supabase = createClient(await cookies());
  const { q } = await searchParams;

  let query = supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, created_at, user_subscriptions(plan, chars_balance)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (q) {
    query = query.or(`username.ilike.%${q}%,display_name.ilike.%${q}%`);
  }

  const { data: users } = await query;

  return (
    <div>
      <h1 className="mb-6 font-fredoka text-3xl font-[600] text-ink">Users</h1>

      {/* Search */}
      <form className="mb-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by username or name…"
          className="w-full max-w-sm rounded-lg border border-ink/10 bg-paper-2 px-4 py-2.5 font-manrope text-sm text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-ink"
        />
      </form>

      {/* Table */}
      <div className="rounded-lg border border-ink/10 overflow-hidden">
        <table className="w-full">
          <thead className="bg-paper-2 border-b border-ink/10">
            <tr>
              {["User", "Plan", "Chars balance", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-mono text-xs uppercase tracking-widest text-ink-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {(users ?? []).map((u) => {
              const sub = Array.isArray(u.user_subscriptions) ? u.user_subscriptions[0] : u.user_subscriptions;
              return (
                <tr key={u.id} className="hover:bg-paper-2/50 transition">
                  <td className="px-4 py-3">
                    <p className="font-manrope text-sm font-[700] text-ink">{u.display_name ?? u.username}</p>
                    <p className="font-mono text-xs text-ink-3">@{u.username}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 font-manrope text-xs font-[700] ${
                      sub?.plan === "pro"  ? "bg-orange/20 text-orange" :
                      sub?.plan === "plus" ? "bg-blue/20 text-blue"     :
                      "bg-ink/10 text-ink-3"
                    }`}>
                      {sub?.plan ?? "free"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-ink">{(sub?.chars_balance ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/users/${u.id}`} className="font-manrope text-xs font-[700] text-ink-2 hover:text-ink">
                      View →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
