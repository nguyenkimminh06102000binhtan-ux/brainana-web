"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { PRIVATE_BUCKET, PUBLIC_BUCKET, parseStoragePath, buildStoragePath } from "@/utils/storage";

export type UpdateCourseState = { error: string } | null;

type ItemPayload = {
  dbId: string | null;
  front: string;
  back: string;
  romanization: string;
  imagePath: string;
  frontAudioPath: string;
  backAudioPath: string;
  distractors?: string[];
  acceptedAnswers?: string[];
  customAttributeValues?: Record<string, string>;
};

type SectionPayload = {
  dbId: string | null;
  title: string;
  description: string;
  customAttributes?: string[];
  items: ItemPayload[];
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_SECTIONS = 100;
const MAX_ITEMS_PER_SECTION = 500;
const MAX_CUSTOM_ATTRIBUTES = 12;
const MAX_CUSTOM_ATTRIBUTE_NAME_LENGTH = 40;
const MAX_CUSTOM_ATTRIBUTE_VALUE_LENGTH = 500;
const MAX_ACCEPTED_ANSWERS = 20;
const MAX_ACCEPTED_ANSWER_LENGTH = 200;
const MAX_DISTRACTORS = 10;
const MAX_DISTRACTOR_LENGTH = 200;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableUuid(value: unknown): string | null {
  const text = asString(value);
  return UUID_RE.test(text) ? text : null;
}

function normalizeStringList(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    const text = asString(item).slice(0, maxLength);
    if (!text) continue;
    const key = text.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(text);
    if (result.length >= maxItems) break;
  }
  return result;
}

function normalizeCustomAttributes(value: unknown): string[] {
  return normalizeStringList(value, MAX_CUSTOM_ATTRIBUTES, MAX_CUSTOM_ATTRIBUTE_NAME_LENGTH);
}

function normalizeCustomAttributeValues(value: unknown, attributes: string[]): Record<string, string> {
  const source = asRecord(value);
  const result: Record<string, string> = {};
  for (const attr of attributes) {
    const text = asString(source[attr]).slice(0, MAX_CUSTOM_ATTRIBUTE_VALUE_LENGTH);
    if (text) result[attr] = text;
  }
  return result;
}

function normalizeSectionsPayload(value: unknown): SectionPayload[] | null {
  if (!Array.isArray(value) || value.length > MAX_SECTIONS) return null;
  return value.map((rawSection) => {
    const section = asRecord(rawSection);
    const customAttributes = normalizeCustomAttributes(section.customAttributes);
    const rawItems = Array.isArray(section.items) ? section.items.slice(0, MAX_ITEMS_PER_SECTION) : [];
    return {
      dbId: asNullableUuid(section.dbId),
      title: asString(section.title),
      description: asString(section.description),
      customAttributes,
      items: rawItems.map((rawItem) => {
        const item = asRecord(rawItem);
        return {
          dbId: asNullableUuid(item.dbId),
          front: asString(item.front),
          back: asString(item.back),
          romanization: asString(item.romanization),
          imagePath: asString(item.imagePath),
          frontAudioPath: asString(item.frontAudioPath),
          backAudioPath: asString(item.backAudioPath),
          distractors: normalizeStringList(item.distractors, MAX_DISTRACTORS, MAX_DISTRACTOR_LENGTH),
          acceptedAnswers: normalizeStringList(item.acceptedAnswers, MAX_ACCEPTED_ANSWERS, MAX_ACCEPTED_ANSWER_LENGTH),
          customAttributeValues: normalizeCustomAttributeValues(item.customAttributeValues, customAttributes),
        };
      }),
    };
  });
}

// Copies one object from private-course-assets to public-course-assets,
// deletes the source, and returns the new storage path.
// Returns the original path unchanged on any error so the caller can continue.
async function migrateAssetToPublic(
  supabase: ReturnType<typeof createClient>,
  storagePath: string,
): Promise<string> {
  const parsed = parseStoragePath(storagePath);
  if (!parsed || parsed.bucket !== PRIVATE_BUCKET) return storagePath;

  const { objectPath } = parsed;

  const { data: blob, error: downloadErr } = await supabase.storage
    .from(PRIVATE_BUCKET)
    .download(objectPath);

  if (downloadErr || !blob) {
    console.error(`[asset-migration] download failed for ${objectPath}:`, downloadErr?.message);
    return storagePath;
  }

  const { data: uploaded, error: uploadErr } = await supabase.storage
    .from(PUBLIC_BUCKET)
    .upload(objectPath, blob, { upsert: true });

  if (uploadErr || !uploaded) {
    console.error(`[asset-migration] upload failed for ${objectPath}:`, uploadErr?.message);
    return storagePath;
  }

  // Best-effort delete from private bucket — don't fail if this errors
  await supabase.storage.from(PRIVATE_BUCKET).remove([objectPath]);

  return buildStoragePath(PUBLIC_BUCKET, uploaded.path);
}

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
  if (!UUID_RE.test(courseId)) return { error: "Invalid form state. Please refresh and try again." };
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

  let sections: SectionPayload[] | null;
  try {
    sections = normalizeSectionsPayload(JSON.parse(String(formData.get("sections_data") ?? "[]")));
  } catch {
    return { error: "Invalid form data. Please refresh and try again." };
  }
  if (!sections) return { error: "Invalid form data. Please refresh and try again." };

  // Verify ownership and fetch current visibility first
  const { data: course, error: fetchError } = await supabase
    .from("courses")
    .select("id, creator_id, visibility")
    .eq("id", courseId)
    .single();

  if (fetchError || !course) return { error: "Course not found." };
  if (course.creator_id !== user.id) return { error: "Not authorized." };

  const wasPublic = course.visibility === "public";
  const goingPublic = visibility === "public";
  // Lock existing content if the course is (or is becoming) public
  const lockContent = wasPublic || goingPublic;

  // Title required only when course isn't locked (locked courses keep their DB title)
  if (!title && !lockContent) return { error: "Course title is required." };

  const validSections = sections.filter((s) =>
    s.items.some((i) => i.front.trim() && i.back.trim())
  );
  if (validSections.length === 0)
    return { error: "Add at least one card with both a question and answer." };

  // 1. Update course metadata
  // Locked courses: only visibility can change
  const courseUpdate = lockContent
    ? { visibility }
    : { title, description, category, subcategory, source_language: sourceLanguage, target_language: targetLanguage, visibility, level };
  const { error: courseError } = await supabase
    .from("courses")
    .update(courseUpdate)
    .eq("id", courseId);

  if (courseError) return { error: courseError.message };

  // 2. Migrate assets from private bucket → public bucket when going public
  if (!wasPublic && goingPublic) {
    const { data: assetItems } = await supabase
      .from("items")
      .select("id, image_url, front_audio_url, back_audio_url")
      .eq("course_id", courseId);

    for (const item of assetItems ?? []) {
      type AssetCol = "image_url" | "front_audio_url" | "back_audio_url";
      const cols: AssetCol[] = ["image_url", "front_audio_url", "back_audio_url"];
      const updates: Partial<Record<AssetCol, string>> = {};
      let changed = false;

      for (const col of cols) {
        const current = item[col] as string | null;
        if (!current) continue;
        const migrated = await migrateAssetToPublic(supabase, current);
        if (migrated !== current) {
          updates[col] = migrated;
          changed = true;
        }
      }

      if (changed) {
        await supabase.from("items").update(updates).eq("id", item.id);
      }
    }
  }

  // 3. Delete sections that were removed — blocked for locked courses
  const keepSectionIds = sections.filter((s) => s.dbId).map((s) => s.dbId!);
  const { data: existingSections } = await supabase
    .from("sections")
    .select("id")
    .eq("course_id", courseId);
  const existingSectionIds = new Set((existingSections ?? []).map((s) => s.id as string));

  const sectionsToDelete = (existingSections ?? [])
    .map((s) => s.id as string)
    .filter((id) => !keepSectionIds.includes(id));

  if (!lockContent && sectionsToDelete.length > 0) {
    await supabase.from("sections").delete().in("id", sectionsToDelete);
  }

  // 4. Upsert sections and their items
  let totalCards = 0;

  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const sec = sections[sIdx];
    const validItems = sec.items.filter((i) => i.front.trim() && i.back.trim());
    if (validItems.length === 0) continue;

    let sectionId: string;

    if (sec.dbId) {
      if (!existingSectionIds.has(sec.dbId)) return { error: "Invalid section state. Please refresh and try again." };
      // Locked courses: only update position, not title/description
      const sectionUpdate = lockContent
        ? { position: sIdx }
        : { title: sec.title || `Section ${sIdx + 1}`, description: sec.description || null, custom_attributes: sec.customAttributes?.length ? sec.customAttributes : null, position: sIdx };
      await supabase.from("sections").update(sectionUpdate).eq("id", sec.dbId).eq("course_id", courseId);
      sectionId = sec.dbId;
    } else {
      const { data: newSection, error: sectionError } = await supabase
        .from("sections")
        .insert({ course_id: courseId, title: sec.title || `Section ${sIdx + 1}`, description: sec.description || null, custom_attributes: sec.customAttributes?.length ? sec.customAttributes : null, position: sIdx })
        .select("id")
        .single();
      if (sectionError || !newSection) return { error: sectionError?.message ?? "Failed to create section." };
      sectionId = newSection.id;
    }

    // Delete items removed from this section — blocked for locked courses
    const keepItemIds = validItems.filter((i) => i.dbId).map((i) => i.dbId!);
    const { data: existingItems } = await supabase
      .from("items")
      .select("id")
      .eq("course_id", courseId)
      .eq("section_id", sectionId);
    const existingItemIds = new Set((existingItems ?? []).map((i) => i.id as string));

    const itemsToDelete = (existingItems ?? [])
      .map((i) => i.id as string)
      .filter((id) => !keepItemIds.includes(id));

    if (!lockContent && itemsToDelete.length > 0) {
      await supabase.from("items").delete().in("id", itemsToDelete);
    }

    // Upsert items
    for (let iIdx = 0; iIdx < validItems.length; iIdx++) {
      const item = validItems[iIdx];
      const fullPayload = {
        front_text: item.front,
        back_text: item.back,
        romanization: item.romanization || null,
        image_url: item.imagePath || null,
        front_audio_url: item.frontAudioPath || null,
        back_audio_url: item.backAudioPath || null,
        distractors: item.distractors?.length ? item.distractors : null,
        accepted_answers: item.acceptedAnswers?.length ? item.acceptedAnswers : null,
        custom_attributes: item.customAttributeValues && Object.keys(item.customAttributeValues).length ? item.customAttributeValues : null,
        position: iIdx,
      };

      if (item.dbId) {
        if (!existingItemIds.has(item.dbId)) return { error: "Invalid card state. Please refresh and try again." };
        // Locked courses: only update position, never content
        const updatePayload = lockContent ? { position: iIdx } : fullPayload;
        await supabase.from("items").update(updatePayload).eq("id", item.dbId).eq("course_id", courseId).eq("section_id", sectionId);
      } else {
        await supabase.from("items").insert({ ...fullPayload, course_id: courseId, section_id: sectionId });
      }
    }

    totalCards += validItems.length;
  }

  // 5. Sync card_count, has_images, has_audio
  const allValidItems = sections.flatMap((s) => s.items.filter((i) => i.front.trim() && i.back.trim()));
  const hasImages       = allValidItems.some((i) => i.imagePath);
  const hasAudio        = allValidItems.some((i) => i.frontAudioPath || i.backAudioPath);
  const hasRomanization = allValidItems.some((i) => i.romanization?.trim());
  await supabase
    .from("courses")
    .update({ card_count: totalCards, has_images: hasImages, has_audio: hasAudio, has_romanization: hasRomanization })
    .eq("id", courseId);

  redirect(`/c/${courseSlug}`);
}
