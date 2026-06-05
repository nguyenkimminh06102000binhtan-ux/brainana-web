"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type SpeedResult = { itemId: string; correct: boolean };

export async function saveSpeedReviewResults(
  courseId: string,
  results: SpeedResult[],
) {
  if (results.length === 0) return;

  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();

  // Fetch existing progress rows for these items
  const itemIds = results.map((r) => r.itemId);
  const { data: existing } = await supabase
    .from("item_progress")
    .select("item_id, ease_factor, interval_days, repetitions")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .in("item_id", itemIds);

  const progressMap = new Map(
    (existing ?? []).map((r) => [r.item_id as string, r]),
  );

  const upserts = results.map((r) => {
    const prev = progressMap.get(r.itemId);
    const easeFactor = prev?.ease_factor ?? 2.5;
    const intervalDays = prev?.interval_days ?? 1;
    const repetitions = prev?.repetitions ?? 0;

    // Lighter SRS update than classic review:
    // correct → small interval nudge (×1.2, capped growth)
    // wrong   → small interval penalty (÷1.5, floor at 1)
    let newInterval: number;
    let newEase: number;
    let newRepetitions: number;

    if (r.correct) {
      newInterval = Math.round(Math.min(intervalDays * 1.2, intervalDays + 3));
      newEase = Math.min(2.7, easeFactor + 0.05);
      newRepetitions = repetitions + 1;
    } else {
      newInterval = Math.max(1, Math.round(intervalDays / 1.5));
      newEase = Math.max(1.3, easeFactor - 0.1);
      newRepetitions = Math.max(0, repetitions - 1);
    }

    const nextReview = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + newInterval));

    return {
      user_id: user.id,
      item_id: r.itemId,
      course_id: courseId,
      ease_factor: newEase,
      interval_days: newInterval,
      repetitions: newRepetitions,
      next_review_at: nextReview.toISOString(),
      last_reviewed_at: now.toISOString(),
      correct_count: r.correct ? (prev ? (prev as unknown as { correct_count?: number }).correct_count ?? 0 : 0) + 1 : (prev ? (prev as unknown as { correct_count?: number }).correct_count ?? 0 : 0),
      incorrect_count: !r.correct ? (prev ? (prev as unknown as { incorrect_count?: number }).incorrect_count ?? 0 : 0) + 1 : (prev ? (prev as unknown as { incorrect_count?: number }).incorrect_count ?? 0 : 0),
    };
  });

  await supabase
    .from("item_progress")
    .upsert(upserts, { onConflict: "user_id,item_id" });
}
