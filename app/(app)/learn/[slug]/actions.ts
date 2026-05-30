"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { calculateSM2 } from "@/utils/sm2";
import { addDays } from "@/utils/sm2";

export async function saveLearnProgress(
  courseId: string,
  evals: { itemId: string; correct: boolean }[],
) {
  if (evals.length === 0) return;

  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const itemIds = evals.map((e) => e.itemId);

  const { data: existing } = await supabase
    .from("item_progress")
    .select("item_id, ease_factor, interval_days, repetitions, correct_count, incorrect_count")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .in("item_id", itemIds);

  const progressMap = new Map(
    (existing ?? []).map((p) => [p.item_id, p]),
  );

  const now = new Date();
  const upserts = evals.map(({ itemId, correct }) => {
    const prev = progressMap.get(itemId);
    const quality = correct ? 5 : 1;
    const result = calculateSM2(
      quality,
      prev?.ease_factor ?? 2.5,
      prev?.interval_days ?? 0,
      prev?.repetitions ?? 0,
    );
    const isMastered = result.repetitions >= 5 && result.easeFactor >= 2.5;

    return {
      user_id: user.id,
      course_id: courseId,
      item_id: itemId,
      ease_factor: result.easeFactor,
      interval_days: result.interval,
      repetitions: result.repetitions,
      next_review_at: addDays(now, result.interval).toISOString(),
      correct_count: (prev?.correct_count ?? 0) + (correct ? 1 : 0),
      incorrect_count: (prev?.incorrect_count ?? 0) + (correct ? 0 : 1),
      is_mastered: isMastered,
      last_question_type: "flashcard",
    };
  });

  await supabase
    .from("item_progress")
    .upsert(upserts, { onConflict: "user_id,item_id" });
}
