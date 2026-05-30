import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
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

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, slug, source_language, target_language")
    .eq("slug", slug)
    .single();

  if (!course) notFound();

  // Fetch sections with their items
  const { data: sectionsRaw } = await supabase
    .from("sections")
    .select(
      "id, title, items(id, front_text, back_text, romanization, accepted_answers)",
    )
    .eq("course_id", course.id)
    .order("position");

  const sections: LearnSection[] = (sectionsRaw ?? []).map((s) => ({
    id: String(s.id),
    title: s.title ?? "",
    cards: ((s.items ?? []) as {
      id: string;
      front_text: string;
      back_text: string;
      romanization: string | null;
      accepted_answers: string[] | null;
    }[]).map((item) => ({
      id: item.id,
      front: item.front_text,
      back: item.back_text,
      romanization: item.romanization ?? null,
      acceptedAnswers: item.accepted_answers ?? [item.back_text],
    })),
  }));

  return (
    <LearnClient
      courseId={course.id}
      courseSlug={course.slug}
      courseTitle={course.title}
      sourceLanguage={(course.source_language as string | null) ?? null}
      targetLanguage={(course.target_language as string | null) ?? null}
      sections={sections}
    />
  );
}
