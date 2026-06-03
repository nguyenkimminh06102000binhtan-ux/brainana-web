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

  // Insert enrollment. learner_count is maintained by the database trigger.
  await supabase
    .from("user_courses")
    .insert({ user_id: user.id, course_id: courseId });

  revalidatePath("/courses");
  revalidatePath("/browse");
}
