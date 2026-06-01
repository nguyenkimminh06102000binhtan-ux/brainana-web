import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getLocale } from "@/utils/i18n";
import { resolveMediaUrl } from "@/utils/resolve-media-url";
import LearnClient from "./learn-client";
import type { LearnSection } from "./learn-client";

export default async function LearnPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: course }, { data: profile }, { data: sub }] = await Promise.all([
    supabase
      .from("courses")
      .select("id, title, slug, source_language, target_language, category, level")
      .eq("slug", slug)
      .single(),
    supabase
      .from("profiles")
      .select("active_origin_language")
      .eq("id", user.id)
      .single(),
    supabase
      .from("user_subscriptions")
      .select("tutor_sessions_balance")
      .eq("user_id", user.id)
      .single(),
  ]);

  if (!course) notFound();

  const loc = getLocale((profile?.active_origin_language as string | null) ?? null);

  const [{ data: sectionsRaw }, { data: progressRows }] = await Promise.all([
    supabase
      .from("sections")
      .select(
        "id, title, items(id, front_text, back_text, romanization, accepted_answers, back_audio_url)",
      )
      .eq("course_id", course.id)
      .order("position"),
    supabase
      .from("item_progress")
      .select("item_id, ignored")
      .eq("user_id", user.id)
      .eq("course_id", course.id)
      .eq("ignored", true),
  ]);

  const ignoredIds = new Set((progressRows ?? []).map((r) => r.item_id));

  type RawItem = {
    id: string;
    front_text: string;
    back_text: string;
    romanization: string | null;
    accepted_answers: string[] | null;
    back_audio_url: string | null;
  };

  const sections: LearnSection[] = await Promise.all(
    (sectionsRaw ?? []).map(async (s) => ({
      id: String(s.id),
      title: s.title ?? "",
      cards: await Promise.all(
        ((s.items ?? []) as RawItem[]).map(async (item) => ({
          id: item.id,
          front: item.front_text,
          back: item.back_text,
          romanization: item.romanization ?? null,
          acceptedAnswers: item.accepted_answers ?? [item.back_text],
          backAudioUrl: await resolveMediaUrl(item.back_audio_url, supabase),
          ignored: ignoredIds.has(item.id),
        })),
      ),
    })),
  );

  return (
    <LearnClient
      courseId={course.id}
      courseSlug={course.slug}
      courseTitle={course.title}
      sourceLanguage={(course.source_language as string | null) ?? null}
      targetLanguage={(course.target_language as string | null) ?? null}
      category={(course.category as string | null) ?? null}
      level={(course.level as string | null) ?? null}
      sections={sections}
      labels={loc.learn}
      initialSessionsBalance={sub?.tutor_sessions_balance ?? 0}
    />
  );
}
