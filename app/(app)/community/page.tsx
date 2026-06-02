import type { Metadata } from "next";
export const metadata: Metadata = { title: "Community — Brainana" };

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { getLocale } from "@/utils/i18n";

type MemOfWeek = {
  id: string;
  text: string;
  helpful_count: number;
  profiles: { username: string; display_name: string | null } | null;
  items: { front_text: string; courses: { title: string; slug: string } | null } | null;
};

export default async function CommunityPage() {
  noStore(); // Date.now() used in query — opt out of static caching
  // eslint-disable-next-line react-hooks/purity -- dynamic server page; noStore() opts out of static caching.
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: memRaw }] = await Promise.all([
    supabase.from("profiles").select("active_origin_language").eq("id", user.id).single(),
    supabase
      .from("mems")
      .select("id, text, helpful_count, profiles!author_id(username, display_name), items!card_id(front_text, courses!course_id(title, slug))")
      .gte("created_at", oneWeekAgo)
      .order("helpful_count", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const loc = getLocale((profile?.active_origin_language as string | null) ?? null);
  const mem = memRaw as unknown as MemOfWeek | null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 flex flex-col gap-6">

      {/* Mem of the Week */}
      <section className="rounded-lg bg-paper-2 p-6 shadow-hard">
        <p className="mb-4 font-mono text-xs uppercase tracking-widest text-ink-2">🏆 {loc.mems.memOfWeek}</p>
        {!mem ? (
          <p className="font-manrope text-sm text-ink-2">{loc.mems.memOfWeekEmpty}</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-ink/10 bg-paper p-4">
              <p className="mb-1 font-mono text-xs uppercase tracking-wider text-ink-2">
                {loc.mems.forCard.replace("{front}", mem.items?.front_text ?? "")}
                {mem.items?.courses && (
                  <>
                    {" · "}
                    <Link href={`/c/${mem.items.courses.slug}`} className="hover:text-orange-text transition">
                      {loc.mems.inCourse.replace("{course}", mem.items.courses.title)}
                    </Link>
                  </>
                )}
              </p>
              <p className="font-kalam text-lg leading-relaxed text-ink">{mem.text}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-xs text-ink-2">
                  @{mem.profiles?.username ?? "anonymous"}
                </span>
                <span className="flex items-center gap-1.5 rounded-full border border-orange/40 bg-orange/10 px-3 py-1 font-mono text-xs text-orange-text">
                  ▲ {loc.mems.helpful.replace("{count}", String(mem.helpful_count))}
                </span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Placeholder for future community content */}
      <section className="rounded-lg bg-paper-2 p-8 shadow-hard">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Community</p>
        <h1 className="mt-3 font-fredoka text-4xl font-[600] leading-tight tracking-tight">
          Social feed
        </h1>
        <p className="mt-3 font-manrope text-sm leading-6 text-ink-2">
          Forum-style community feed coming soon.
        </p>
      </section>
    </div>
  );
}
