"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type CreateCourseState = { error: string } | null;

type ItemPayload = {
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
const DRAFT_KEY_RE = /^(create|edit:[0-9a-fA-F-]{36})$/;

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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
      title: asString(section.title),
      description: asString(section.description),
      customAttributes,
      items: rawItems.map((rawItem) => {
        const item = asRecord(rawItem);
        return {
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
  const draftKey = String(formData.get("draft_key") ?? "").trim();

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

  if (!title) return { error: "Course title is required." };
  if (!sections.length) return { error: "Add at least one section." };

  const validItems = sections.flatMap((s) =>
    s.items.filter((i) => i.front.trim() && i.back.trim())
  );
  if (validItems.length === 0) return { error: "Add at least one card with both a question and answer." };

  const slug = generateSlug(title);
  const totalCards = validItems.length;

  const hasImages        = validItems.some((i) => i.imagePath);
  const hasAudio         = validItems.some((i) => i.frontAudioPath || i.backAudioPath);
  const hasRomanization  = validItems.some((i) => i.romanization?.trim());

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
      has_romanization: hasRomanization,
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
        custom_attributes: sec.customAttributes?.length ? sec.customAttributes : null,
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
        romanization: item.romanization || null,
        image_url: item.imagePath || null,
        front_audio_url: item.frontAudioPath || null,
        back_audio_url: item.backAudioPath || null,
        distractors: item.distractors?.length ? item.distractors : null,
        accepted_answers: item.acceptedAnswers?.length ? item.acceptedAnswers : null,
        custom_attributes: item.customAttributeValues && Object.keys(item.customAttributeValues).length ? item.customAttributeValues : null,
        position: i,
      }))
    );

    if (itemsError) {
      await supabase.from("courses").delete().eq("id", course.id);
      return { error: itemsError.message };
    }
  }

  if (draftKey === "create" && DRAFT_KEY_RE.test(draftKey)) {
    await supabase
      .from("course_drafts")
      .delete()
      .eq("user_id", user.id)
      .eq("draft_key", draftKey);
  }

  redirect(`/c/${course.slug}`);
}
