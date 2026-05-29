"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type CreateCourseState = { error: string } | null;

type ItemPayload = {
  front: string;
  back: string;
  imagePath: string;
  frontAudioPath: string;
  backAudioPath: string;
};

type SectionPayload = {
  title: string;
  description: string;
  items: ItemPayload[];
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

export async function createCourse(
  _prev: CreateCourseState,
  formData: FormData
): Promise<CreateCourseState> {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const prospectiveCourseId = String(formData.get("prospective_course_id") ?? "").trim();
  if (!UUID_RE.test(prospectiveCourseId)) {
    return { error: "Invalid form state. Please refresh and try again." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "").trim() || null;
  const subcategory = String(formData.get("subcategory") ?? "").trim() || null;
  const sourceLanguage = String(formData.get("source_language") ?? "").trim() || null;
  const targetLanguage = String(formData.get("target_language") ?? "").trim() || null;
  const visibility = String(formData.get("visibility") ?? "public") as "public" | "unlisted" | "private";
  const levelRaw = String(formData.get("level") ?? "");
  const level = (["beginner", "intermediate", "advanced"].includes(levelRaw) ? levelRaw : null) as
    | "beginner" | "intermediate" | "advanced" | null;

  let sections: SectionPayload[];
  try {
    sections = JSON.parse(String(formData.get("sections_data") ?? "[]"));
  } catch {
    return { error: "Invalid form data. Please refresh and try again." };
  }

  if (!title) return { error: "Course title is required." };
  if (!sections.length) return { error: "Add at least one section." };

  const validItems = sections.flatMap((s) =>
    s.items.filter((i) => i.front.trim() && i.back.trim())
  );
  if (validItems.length === 0) return { error: "Add at least one card with both a question and answer." };

  const slug = generateSlug(title);
  const totalCards = validItems.length;

  const hasImages = validItems.some((i) => i.imagePath);
  const hasAudio  = validItems.some((i) => i.frontAudioPath || i.backAudioPath);

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .insert({
      id: prospectiveCourseId,
      creator_id: user.id,
      title,
      description,
      category,
      subcategory,
      source_language: sourceLanguage,
      target_language: targetLanguage,
      visibility,
      level,
      slug,
      is_published: true,
      card_count: totalCards,
      has_images: hasImages,
      has_audio: hasAudio,
    })
    .select("id, slug")
    .single();

  if (courseError || !course) return { error: courseError?.message ?? "Failed to create course." };

  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const sec = sections[sIdx];
    const sectionItems = sec.items.filter((i) => i.front.trim() && i.back.trim());
    if (sectionItems.length === 0) continue;

    const { data: section, error: sectionError } = await supabase
      .from("sections")
      .insert({
        course_id: course.id,
        title: sec.title || `Section ${sIdx + 1}`,
        description: sec.description || null,
        position: sIdx,
      })
      .select("id")
      .single();

    if (sectionError || !section) {
      await supabase.from("courses").delete().eq("id", course.id);
      return { error: sectionError?.message ?? "Failed to create section." };
    }

    const { error: itemsError } = await supabase.from("items").insert(
      sectionItems.map((item, i) => ({
        course_id: course.id,
        section_id: section.id,
        front_text: item.front,
        back_text: item.back,
        image_url: item.imagePath || null,
        front_audio_url: item.frontAudioPath || null,
        back_audio_url: item.backAudioPath || null,
        position: i,
      }))
    );

    if (itemsError) {
      await supabase.from("courses").delete().eq("id", course.id);
      return { error: itemsError.message };
    }
  }

  redirect(`/c/${course.slug}`);
}
