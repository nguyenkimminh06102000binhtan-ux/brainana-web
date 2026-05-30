"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function enrollInCourse(formData: FormData) {
  const courseId = formData.get("course_id") as string;
  if (!courseId) return;

  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Insert enrollment (ignore conflict if already enrolled)
  const { error } = await supabase
    .from("user_courses")
    .insert({ user_id: user.id, course_id: courseId });

  if (!error) {
    const { count } = await supabase
      .from("user_courses")
      .select("*", { count: "exact", head: true })
      .eq("course_id", courseId);
    await supabase.from("courses").update({ learner_count: count ?? 0 }).eq("id", courseId);
  }

  revalidatePath("/courses");
}
