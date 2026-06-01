"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

function generateSlug(title: string): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

export type DuplicateResult = { slug: string } | { error: string };

export async function duplicateCourse(sourceCourseId: string): Promise<DuplicateResult> {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Gate: Plus or Pro only
  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("plan")
    .eq("user_id", user.id)
    .single();
  const plan = (sub?.plan as string | null) ?? "free";
  if (!["plus", "pro"].includes(plan)) {
    return { error: "This feature requires a Plus or Pro plan." };
  }

  // Fetch the source course (must be public)
  const { data: source } = await supabase
    .from("courses")
    .select("id, title, description, category, subcategory, source_language, target_language, level, has_audio, has_images, has_romanization")
    .eq("id", sourceCourseId)
    .eq("visibility", "public")
    .single();
  if (!source) return { error: "Course not found or not public." };

  // Create the duplicate as a private course under the current user
  const slug = generateSlug(`${source.title} copy`);
  const { data: newCourse, error: courseErr } = await supabase
    .from("courses")
    .insert({
      creator_id: user.id,
      title: `${source.title} (Copy)`,
      description: source.description,
      category: source.category,
      subcategory: source.subcategory,
      source_language: source.source_language,
      target_language: source.target_language,
      level: source.level,
      visibility: "private",
      slug,
      is_published: false,
      card_count: 0,
      has_audio: source.has_audio,
      has_images: source.has_images,
      has_romanization: source.has_romanization,
    })
    .select("id, slug")
    .single();
  if (courseErr || !newCourse) return { error: courseErr?.message ?? "Failed to create course." };

  // Copy sections + items (media paths reference the original public bucket — safe since public
  // courses and their assets are permanent)
  type RawItem = {
    id: string; front_text: string; back_text: string; romanization: string | null;
    image_url: string | null; front_audio_url: string | null; back_audio_url: string | null;
    accepted_answers: string[] | null; distractors: string[] | null; position: number | null;
  };
  type RawSection = { id: string; title: string | null; description: string | null; position: number | null; items: RawItem[] };

  const { data: sections } = await supabase
    .from("sections")
    .select("id, title, description, position, items(id, front_text, back_text, romanization, image_url, front_audio_url, back_audio_url, accepted_answers, distractors, position)")
    .eq("course_id", sourceCourseId)
    .order("position");

  let totalCards = 0;
  for (const sec of (sections ?? []) as unknown as RawSection[]) {
    const { data: newSec } = await supabase
      .from("sections")
      .insert({ course_id: newCourse.id, title: sec.title, description: sec.description, position: sec.position ?? 0 })
      .select("id")
      .single();
    if (!newSec) continue;

    const sortedItems = [...(sec.items ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    if (sortedItems.length > 0) {
      await supabase.from("items").insert(
        sortedItems.map((item) => ({
          course_id: newCourse.id,
          section_id: newSec.id,
          front_text: item.front_text,
          back_text: item.back_text,
          romanization: item.romanization,
          image_url: item.image_url,
          front_audio_url: item.front_audio_url,
          back_audio_url: item.back_audio_url,
          accepted_answers: item.accepted_answers,
          distractors: item.distractors,
          position: item.position ?? 0,
        }))
      );
      totalCards += sortedItems.length;
    }
  }

  // Update card_count on the new course
  await supabase.from("courses").update({ card_count: totalCards }).eq("id", newCourse.id);

  // Auto-enroll user in their new course
  await supabase.from("user_courses").upsert(
    { user_id: user.id, course_id: newCourse.id },
    { onConflict: "user_id,course_id" }
  );

  return { slug: newCourse.slug };
}

type QuestionType = 'flashcard' | 'multiple_choice' | 'audio_type' | 'speed_match' | 'type_answer';
const VALID_TYPES = new Set<QuestionType>(['flashcard', 'multiple_choice', 'audio_type', 'speed_match', 'type_answer']);

export async function updateQuestionTypes(formData: FormData) {
  const courseId = String(formData.get("course_id") ?? "");
  const raw = formData.getAll("question_types") as string[];
  const types = raw.filter((t): t is QuestionType => VALID_TYPES.has(t as QuestionType));
  if (types.length === 0) return;

  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("user_courses")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle();

  await supabase
    .from("user_courses")
    .upsert(
      { user_id: user.id, course_id: courseId, preferred_question_types: types },
      { onConflict: "user_id,course_id" }
    );

  // Keep learner_count in sync when this creates a new row
  if (!existing) {
    const { count } = await supabase
      .from("user_courses")
      .select("*", { count: "exact", head: true })
      .eq("course_id", courseId);
    await supabase.from("courses").update({ learner_count: count ?? 0 }).eq("id", courseId);
  }
}

export async function toggleFollow(formData: FormData) {
  const creatorId = String(formData.get("creator_id") ?? "");
  const slug = String(formData.get("slug") ?? "");

  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", user.id)
    .eq("following_id", creatorId)
    .single();

  if (existing) {
    await supabase.from("follows").delete()
      .eq("follower_id", user.id)
      .eq("following_id", creatorId);
  } else {
    await supabase.from("follows").insert({ follower_id: user.id, following_id: creatorId });
  }

  revalidatePath(`/c/${slug}`);
}

export async function saveWordConfig(courseId: string, slug: string, ignoredItemIds: string[]) {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Clear existing ignored flags for this user+course
  await supabase
    .from("item_progress")
    .update({ ignored: false })
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .eq("ignored", true);

  // Set ignored=true for specified items
  if (ignoredItemIds.length > 0) {
    const rows = ignoredItemIds.map((itemId) => ({
      user_id: user.id,
      item_id: itemId,
      course_id: courseId,
      ignored: true,
    }));
    await supabase
      .from("item_progress")
      .upsert(rows, { onConflict: "user_id,item_id" });
  }

  revalidatePath(`/c/${slug}`);
}

export async function toggleEnroll(formData: FormData) {
  const courseId = String(formData.get("course_id") ?? "");
  const slug = String(formData.get("slug") ?? "");

  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("user_courses")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .single();

  if (existing) {
    await supabase.from("user_courses").delete().eq("user_id", user.id).eq("course_id", courseId);
  } else {
    await supabase.from("user_courses").insert({ user_id: user.id, course_id: courseId });
  }

  const { count } = await supabase
    .from("user_courses")
    .select("*", { count: "exact", head: true })
    .eq("course_id", courseId);
  await supabase.from("courses").update({ learner_count: count ?? 0 }).eq("id", courseId);

  revalidatePath(`/c/${slug}`);
}
