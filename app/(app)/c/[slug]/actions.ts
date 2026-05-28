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
    const { data: course } = await supabase.from("courses").select("learner_count").eq("id", courseId).single();
    if (course) {
      await supabase.from("courses").update({ learner_count: course.learner_count + 1 }).eq("id", courseId);
    }
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

  const { data: course } = await supabase.from("courses").select("learner_count").eq("id", courseId).single();
  if (!course) return;

  if (existing) {
    await supabase.from("user_courses").delete().eq("user_id", user.id).eq("course_id", courseId);
    await supabase.from("courses").update({ learner_count: Math.max(0, course.learner_count - 1) }).eq("id", courseId);
  } else {
    await supabase.from("user_courses").insert({ user_id: user.id, course_id: courseId });
    await supabase.from("courses").update({ learner_count: course.learner_count + 1 }).eq("id", courseId);
  }

  revalidatePath(`/c/${slug}`);
}
