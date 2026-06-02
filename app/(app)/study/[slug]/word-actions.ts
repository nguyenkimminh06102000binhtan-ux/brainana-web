"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

type WordFlag = "hard" | "ignored";

const FLAGS: ReadonlySet<string> = new Set(["hard", "ignored"]);

export async function updateStudyWordFlag(
  courseId: string,
  itemId: string,
  flag: WordFlag,
  value: boolean,
) {
  if (!FLAGS.has(flag)) return { error: "Invalid word action." };

  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: item } = await supabase
    .from("items")
    .select("id")
    .eq("id", itemId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (!item) return { error: "Card not found." };

  const updates = flag === "ignored"
    ? { ignored: value, ...(value ? { hard: false } : {}) }
    : { hard: value, ignored: false, ...(value ? { next_review_at: new Date().toISOString() } : {}) };

  const { error } = await supabase
    .from("item_progress")
    .upsert(
      {
        user_id: user.id,
        item_id: itemId,
        course_id: courseId,
        ...updates,
      },
      { onConflict: "user_id,item_id" },
    );

  if (error) return { error: error.message };
  return { ok: true };
}
