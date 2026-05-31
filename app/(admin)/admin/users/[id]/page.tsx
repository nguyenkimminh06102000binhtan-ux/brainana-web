import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { adminGrantQuota, adminRefundQuota, adminSetPlan } from "./actions";

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default async function AdminUserDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createClient(await cookies());

  const [{ data: profile }, { data: sub }, { data: transactions }] = await Promise.all([
    supabase.from("profiles").select("id, username, display_name, avatar_url, created_at, is_admin").eq("id", id).single(),
    supabase.from("user_subscriptions").select("*").eq("user_id", id).single(),
    supabase.from("quota_transactions").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(50),
  ]);

  if (!profile) notFound();

  const planColor = sub?.plan === "pro" ? "bg-orange/20 text-orange" : sub?.plan === "plus" ? "bg-blue/20 text-blue" : "bg-ink/10 text-ink-3";

  return (
    <div className="flex flex-col gap-8">

      {/* Back */}
      <a href="/admin/users" className="font-manrope text-sm text-ink-3 hover:text-ink">← Back to users</a>

      {/* Profile header */}
      <div className="flex items-center gap-4 rounded-lg border border-ink/10 bg-paper-2 px-6 py-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-orange font-fredoka text-2xl font-[600] text-on-bright">
          {(profile.display_name ?? profile.username ?? "?")[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-fredoka text-xl font-[600] text-ink">{profile.display_name ?? profile.username}</p>
          <p className="font-mono text-xs text-ink-3">@{profile.username} · {id}</p>
        </div>
        <span className={`rounded-full px-3 py-1 font-manrope text-sm font-[700] ${planColor}`}>
          {sub?.plan ?? "free"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Balances */}
        <div className="flex flex-col gap-4 lg:col-span-1">

          <div className="rounded-lg border border-ink/10 bg-paper-2 p-5">
            <p className="mb-4 font-mono text-xs uppercase tracking-widest text-ink-3">Balances</p>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-manrope text-sm text-ink-2">Characters</span>
                <span className="font-mono text-sm font-[700] text-ink">{fmt(sub?.chars_balance ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-manrope text-sm text-ink-2">Tutor sessions</span>
                <span className="font-mono text-sm font-[700] text-ink">{sub?.tutor_sessions_balance ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Set plan */}
          <div className="rounded-lg border border-ink/10 bg-paper-2 p-5">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-3">Override plan</p>
            <form action={adminSetPlan} className="flex flex-col gap-2">
              <input type="hidden" name="user_id" value={id} />
              <select name="plan" defaultValue={sub?.plan ?? "free"} className="w-full rounded-md bg-paper px-3 py-2 font-manrope text-sm text-ink outline-none focus:ring-2 focus:ring-ink">
                <option value="free">Free</option>
                <option value="plus">Plus</option>
                <option value="pro">Pro</option>
              </select>
              <button type="submit" className="rounded-full bg-ink px-4 py-2 font-manrope text-sm font-[700] text-paper transition hover:opacity-80">
                Save plan
              </button>
            </form>
          </div>

          {/* Grant quota */}
          <div className="rounded-lg border border-ink/10 bg-paper-2 p-5">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-3">Grant quota</p>
            <form action={adminGrantQuota} className="flex flex-col gap-2">
              <input type="hidden" name="user_id" value={id} />
              <select name="resource" className="w-full rounded-md bg-paper px-3 py-2 font-manrope text-sm text-ink outline-none focus:ring-2 focus:ring-ink">
                <option value="chars">Characters</option>
                <option value="tutor_sessions">Tutor sessions</option>
              </select>
              <input type="number" name="amount" min={1} placeholder="Amount" className="w-full rounded-md bg-paper px-3 py-2 font-manrope text-sm text-ink outline-none focus:ring-2 focus:ring-ink" />
              <select name="reason" className="w-full rounded-md bg-paper px-3 py-2 font-manrope text-sm text-ink outline-none focus:ring-2 focus:ring-ink">
                <option value="admin_grant">Admin grant</option>
                <option value="compensation">Compensation</option>
                <option value="monthly_grant">Monthly grant</option>
              </select>
              <input type="text" name="note" placeholder="Internal note (optional)" className="w-full rounded-md bg-paper px-3 py-2 font-manrope text-sm text-ink outline-none focus:ring-2 focus:ring-ink" />
              <button type="submit" className="rounded-full bg-orange px-4 py-2 font-manrope text-sm font-[700] text-on-bright shadow-hard-red transition hover:opacity-90">
                Grant
              </button>
            </form>
          </div>

          {/* Refund quota */}
          <div className="rounded-lg border border-orange/30 bg-orange/5 p-5">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-orange">Refund quota</p>
            <form action={adminRefundQuota} className="flex flex-col gap-2">
              <input type="hidden" name="user_id" value={id} />
              <select name="resource" className="w-full rounded-md bg-paper px-3 py-2 font-manrope text-sm text-ink outline-none focus:ring-2 focus:ring-ink">
                <option value="chars">Characters</option>
                <option value="tutor_sessions">Tutor sessions</option>
              </select>
              <input type="number" name="amount" min={1} placeholder="Amount to refund" className="w-full rounded-md bg-paper px-3 py-2 font-manrope text-sm text-ink outline-none focus:ring-2 focus:ring-ink" />
              <select name="reason" className="w-full rounded-md bg-paper px-3 py-2 font-manrope text-sm text-ink outline-none focus:ring-2 focus:ring-ink">
                <option value="refund">Refund</option>
                <option value="chargeback">Chargeback</option>
              </select>
              <input type="text" name="paddle_refund_id" placeholder="Paddle refund ID (optional)" className="w-full rounded-md bg-paper px-3 py-2 font-manrope text-sm text-ink outline-none focus:ring-2 focus:ring-ink" />
              <button type="submit" className="rounded-full border-2 border-orange px-4 py-2 font-manrope text-sm font-[700] text-orange transition hover:bg-orange hover:text-on-bright">
                Process refund
              </button>
            </form>
          </div>

        </div>

        {/* Transaction history */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-ink/10 overflow-hidden">
            <div className="bg-paper-2 border-b border-ink/10 px-5 py-3">
              <p className="font-mono text-xs uppercase tracking-widest text-ink-3">Transaction history</p>
            </div>
            <div className="divide-y divide-ink/5">
              {(transactions ?? []).length === 0 && (
                <p className="px-5 py-6 text-center font-manrope text-sm text-ink-3">No transactions yet</p>
              )}
              {(transactions ?? []).map((tx) => {
                const isCredit = tx.amount > 0;
                return (
                  <div key={tx.id} className="flex items-start gap-4 px-5 py-3">
                    <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 font-mono text-xs ${isCredit ? "bg-green/20 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {isCredit ? "+" : ""}{fmt(tx.amount)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-manrope text-sm font-[700] text-ink">{tx.reason}</span>
                        <span className="rounded bg-ink/10 px-1.5 py-0.5 font-mono text-[10px] text-ink-3">{tx.resource}</span>
                      </div>
                      {tx.metadata && (
                        <p className="font-mono text-xs text-ink-3 truncate">{JSON.stringify(tx.metadata)}</p>
                      )}
                    </div>
                    <span className="shrink-0 font-mono text-xs text-ink-3">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
