import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import EditCourseForm from "./form";

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

  const { data: sections } = await supabase
    .from("sections")
    .select("id, title, description, position")
    .eq("course_id", course.id)
    .order("position");

  const { data: items } = await supabase
    .from("items")
    .select("id, section_id, front_text, back_text, image_url, front_audio_url, back_audio_url, position")
    .eq("course_id", course.id)
    .order("position");

  const sectionsWithItems = (sections ?? []).map((section) => ({
    ...section,
    items: (items ?? [])
      .filter((item) => item.section_id === section.id)
      .sort((a, b) => a.position - b.position),
  }));

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Edit</p>
        <h1 className="mt-1 font-fredoka text-4xl font-[700] tracking-tight">
          Edit <span className="text-orange">course</span>
        </h1>
        <p className="mt-2 font-manrope text-sm text-ink-2">
          Changes are saved immediately when you hit save.
        </p>
      </div>

      <EditCourseForm course={course} sections={sectionsWithItems} />
    </div>
  );
}
