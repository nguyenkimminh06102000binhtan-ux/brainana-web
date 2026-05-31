import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export default async function AdminDashboard() {
  const supabase = createClient(await cookies());

  // Basic stats
  const [{ count: totalUsers }, { count: totalFree }, { count: totalPlus }, { count: totalPro }] =
    await Promise.all([
      supabase.from("user_subscriptions").select("*", { count: "exact", head: true }),
      supabase.from("user_subscriptions").select("*", { count: "exact", head: true }).eq("plan", "free"),
      supabase.from("user_subscriptions").select("*", { count: "exact", head: true }).eq("plan", "plus"),
      supabase.from("user_subscriptions").select("*", { count: "exact", head: true }).eq("plan", "pro"),
    ]);

  const stats = [
    { label: "Total users",  value: totalUsers ?? 0 },
    { label: "Free",         value: totalFree  ?? 0 },
    { label: "Plus",         value: totalPlus  ?? 0 },
    { label: "Pro",          value: totalPro   ?? 0 },
  ];

  return (
    <div>
      <h1 className="mb-8 font-fredoka text-3xl font-[600] text-ink">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-ink/10 bg-paper-2 px-5 py-4">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-3">{s.label}</p>
            <p className="mt-1 font-fredoka text-3xl font-[600] text-ink">{s.value.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
