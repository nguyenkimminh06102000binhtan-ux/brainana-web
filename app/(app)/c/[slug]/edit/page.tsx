import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import EditCourseForm from "./form";
import { getLocale } from "@/utils/i18n";
import { resolveMediaUrl } from "@/utils/resolve-media-url";

export default async function EditCoursePage({
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
    .select("id, title, description, category, subcategory, source_language, target_language, visibility, level, creator_id, slug")
    .eq("slug", slug)
    .single();

  if (!course) notFound();
  if (course.creator_id !== user.id) redirect(`/c/${slug}`);

  const [{ data: sections }, { data: profile }, { data: sub }] = await Promise.all([
    supabase.from("sections").select("id, title, description, custom_attributes, position").eq("course_id", course.id).order("position"),
    supabase.from("profiles").select("active_origin_language").eq("id", user.id).single(),
    supabase.from("user_subscriptions").select("plan, chars_balance").eq("user_id", user.id).single(),
  ]);
  const loc = getLocale((profile?.active_origin_language as string | null) ?? null);

  const { data: items } = await supabase
    .from("items")
    .select("id, section_id, front_text, back_text, romanization, image_url, front_audio_url, back_audio_url, distractors, accepted_answers, custom_attributes, position")
    .eq("course_id", course.id)
    .order("position");

  // Resolve display URLs for all items
  const resolvedItems = await Promise.all(
    (items ?? []).map(async (item) => ({
      ...item,
      image_display_url: await resolveMediaUrl(item.image_url, supabase),
      front_audio_display_url: await resolveMediaUrl(item.front_audio_url, supabase),
      back_audio_display_url: await resolveMediaUrl(item.back_audio_url, supabase),
    }))
  );

  const sectionsWithItems = (sections ?? []).map((section) => ({
    ...section,
    items: resolvedItems
      .filter((item) => item.section_id === section.id)
      .sort((a, b) => a.position - b.position),
  }));

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">{loc.createEdit.editEyebrow}</p>
        <h1 className="mt-1 font-fredoka text-4xl font-[700] tracking-tight">
          {loc.createEdit.editTitlePrefix} <span className="text-orange-text">{loc.createEdit.editTitleAccent}</span>
        </h1>
        <p className="mt-2 font-manrope text-sm text-ink-2">
          {loc.createEdit.editIntro}
        </p>
      </div>

      <EditCourseForm
        userId={user.id}
        course={course}
        sections={sectionsWithItems}
        plan={(sub?.plan as string | null) ?? "free"}
        initialCharsBalance={(sub?.chars_balance as number | null) ?? 0}
        labels={loc.createEdit}
        categories={loc.categories}
        levels={{
          beginner: loc.course.beginner,
          intermediate: loc.course.intermediate,
          advanced: loc.course.advanced,
        }}
      />
    </div>
  );
}
