"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

async function getUser() {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function createPost(courseId: string, courseSlug: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed || trimmed.length > 2000) return;
  const { supabase, user } = await getUser();
  await supabase.from("course_posts").insert({ course_id: courseId, user_id: user.id, body: trimmed });
  revalidatePath(`/c/${courseSlug}`);
}

export async function deletePost(postId: string, courseSlug: string) {
  const { supabase, user } = await getUser();
  await supabase.from("course_posts").delete().eq("id", postId).eq("user_id", user.id);
  revalidatePath(`/c/${courseSlug}`);
}

export async function createReply(postId: string, courseSlug: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed || trimmed.length > 1000) return;
  const { supabase, user } = await getUser();
  await supabase.from("course_post_replies").insert({ post_id: postId, user_id: user.id, body: trimmed });
  revalidatePath(`/c/${courseSlug}`);
}

export async function deleteReply(replyId: string, courseSlug: string) {
  const { supabase, user } = await getUser();
  await supabase.from("course_post_replies").delete().eq("id", replyId).eq("user_id", user.id);
  revalidatePath(`/c/${courseSlug}`);
}

export async function toggleVote(postId: string, courseSlug: string, currentlyVoted: boolean) {
  const { supabase, user } = await getUser();
  if (currentlyVoted) {
    await supabase.from("course_post_votes").delete().eq("post_id", postId).eq("user_id", user.id);
  } else {
    await supabase.from("course_post_votes").insert({ post_id: postId, user_id: user.id });
  }
  revalidatePath(`/c/${courseSlug}`);
}

export async function togglePin(postId: string, courseSlug: string, courseId: string, currentlyPinned: boolean) {
  const { supabase, user } = await getUser();
  // Only the course creator may pin
  const { data: course } = await supabase.from("courses").select("creator_id").eq("id", courseId).single();
  if (!course || course.creator_id !== user.id) return;
  await supabase.from("course_posts").update({ pinned: !currentlyPinned }).eq("id", postId);
  revalidatePath(`/c/${courseSlug}`);
}
