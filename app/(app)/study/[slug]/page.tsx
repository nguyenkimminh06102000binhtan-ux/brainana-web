import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getLocale } from "@/utils/i18n";
import StudyClient from "./study-client";

type QType = "flashcard" | "multiple_choice" | "audio_type" | "speed_match" | "type_answer";

export default async function StudyPage({
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

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, slug, has_audio")
    .eq("slug", slug)
    .single();

  if (!course) notFound();

  const [
    { data: enrollment },
    { data: profile },
    { count: totalCount },
    { count: progressDueCount },
    { count: progressTotalCount },
  ] = await Promise.all([
    supabase
      .from("user_courses")
      .select("preferred_question_types")
      .eq("user_id", user.id)
      .eq("course_id", course.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("show_romanization, active_origin_language")
      .eq("id", user.id)
      .single(),
    supabase
      .from("items")
      .select("*", { count: "exact", head: true })
      .eq("course_id", course.id),
    supabase
      .from("item_progress")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("course_id", course.id)
      .lte("next_review_at", new Date().toISOString()),
    supabase
      .from("item_progress")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("course_id", course.id),
  ]);

  const loc = getLocale((profile?.active_origin_language as string | null) ?? null);

  const total = totalCount ?? 0;
  const reviewDue = progressDueCount ?? 0;
  const newCards = Math.max(0, total - (progressTotalCount ?? 0));
  const hasAudio = course.has_audio ?? false;
  const preferredTypesRaw = (
    (enrollment?.preferred_question_types ?? ["flashcard"]) as QType[]
  ).filter((t) => t !== "audio_type" || hasAudio);
  const preferredTypes = preferredTypesRaw.length > 0 ? preferredTypesRaw : (["flashcard"] as QType[]);

  return (
    <StudyClient
      userId={user.id}
      courseId={course.id}
      courseTitle={course.title}
      courseSlug={course.slug}
      reviewDue={reviewDue}
      newCards={newCards}
      totalCount={total}
      preferredTypes={preferredTypes}
      hasAudio={hasAudio}
      showRomanization={profile?.show_romanization ?? true}
      memsLabels={loc.mems}
      labels={{
        ...loc.study,
        studyWith: loc.course.studyWithSection,
        flashcard: loc.course.flashcard,
        multipleChoice: loc.course.multipleChoice,
        audioType: loc.course.audioType,
        speedMatch: loc.course.speedMatch,
        typeAnswer: loc.course.typeAnswer,
      }}
    />
  );
}
