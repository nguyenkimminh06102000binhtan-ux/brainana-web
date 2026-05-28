"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type UpdateCourseState = { error: string } | null;

type ItemPayload = {
  dbId: string | null;
  front: string;
  back: string;
  imageUrl: string;
  frontAudioUrl: string;
  backAudioUrl: string;
};

type SectionPayload = {
  dbId: string | null;
  title: string;
  description: string;
  items: ItemPayload[];
};

export async function updateCourse(
  _prev: UpdateCourseState,
  formData: FormData
): Promise<UpdateCourseState> {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const courseId = String(formData.get("course_id") ?? "");
  const courseSlug = String(formData.get("course_slug") ?? "");
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

  const validSections = sections.filter((s) =>
    s.items.some((i) => i.front.trim() && i.back.trim())
  );
  if (validSections.length === 0)
    return { error: "Add at least one card with both a question and answer." };

  // Verify ownership
  const { data: course, error: fetchError } = await supabase
    .from("courses")
    .select("id, creator_id")
    .eq("id", courseId)
    .single();

  if (fetchError || !course) return { error: "Course not found." };
  if (course.creator_id !== user.id) return { error: "Not authorized." };

  // 1. Update course metadata
  const { error: courseError } = await supabase
    .from("courses")
    .update({ title, description, category, subcategory, source_language: sourceLanguage, target_language: targetLanguage, visibility, level })
    .eq("id", courseId);

  if (courseError) return { error: courseError.message };

  // 2. Delete sections that were removed (cascade deletes their items)
  const keepSectionIds = sections.filter((s) => s.dbId).map((s) => s.dbId!);
  const { data: existingSections } = await supabase
    .from("sections")
    .select("id")
    .eq("course_id", courseId);

  const sectionsToDelete = (existingSections ?? [])
    .map((s) => s.id)
    .filter((id) => !keepSectionIds.includes(id));

  if (sectionsToDelete.length > 0) {
    await supabase.from("sections").delete().in("id", sectionsToDelete);
  }

  // 3. Upsert sections and their items
  let totalCards = 0;

  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const sec = sections[sIdx];
    const validItems = sec.items.filter((i) => i.front.trim() && i.back.trim());
    if (validItems.length === 0) continue;

    let sectionId: string;

    if (sec.dbId) {
      await supabase
        .from("sections")
        .update({ title: sec.title || `Section ${sIdx + 1}`, description: sec.description || null, position: sIdx })
        .eq("id", sec.dbId);
      sectionId = sec.dbId;
    } else {
      const { data: newSection, error: sectionError } = await supabase
        .from("sections")
        .insert({ course_id: courseId, title: sec.title || `Section ${sIdx + 1}`, description: sec.description || null, position: sIdx })
        .select("id")
        .single();
      if (sectionError || !newSection) return { error: sectionError?.message ?? "Failed to create section." };
      sectionId = newSection.id;
    }

    // Delete items removed from this section
    const keepItemIds = validItems.filter((i) => i.dbId).map((i) => i.dbId!);
    const { data: existingItems } = await supabase
      .from("items")
      .select("id")
      .eq("section_id", sectionId);

    const itemsToDelete = (existingItems ?? [])
      .map((i) => i.id)
      .filter((id) => !keepItemIds.includes(id));

    if (itemsToDelete.length > 0) {
      await supabase.from("items").delete().in("id", itemsToDelete);
    }

    // Upsert items
    for (let iIdx = 0; iIdx < validItems.length; iIdx++) {
      const item = validItems[iIdx];
      const payload = {
        front_text: item.front,
        back_text: item.back,
        image_url: item.imageUrl || null,
        front_audio_url: item.frontAudioUrl || null,
        back_audio_url: item.backAudioUrl || null,
        position: iIdx,
      };

      if (item.dbId) {
        await supabase.from("items").update(payload).eq("id", item.dbId);
      } else {
        await supabase.from("items").insert({ ...payload, course_id: courseId, section_id: sectionId });
      }
    }

    totalCards += validItems.length;
  }

  // 4. Sync card_count, has_images, has_audio
  const allValidItems = sections.flatMap((s) => s.items.filter((i) => i.front.trim() && i.back.trim()));
  const hasImages = allValidItems.some((i) => i.imageUrl);
  const hasAudio  = allValidItems.some((i) => i.frontAudioUrl || i.backAudioUrl);
  await supabase
    .from("courses")
    .update({ card_count: totalCards, has_images: hasImages, has_audio: hasAudio })
    .eq("id", courseId);

  redirect(`/c/${courseSlug}`);
}
