"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

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
