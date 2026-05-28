"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { StudyCard, QType } from "./types";

const ESCALATION: Record<string, QType> = {
  speed_match: "multiple_choice",
  multiple_choice: "type_answer",
  type_answer: "flashcard",
  audio_type: "flashcard",
  flashcard: "flashcard",
};

function assignQuestionType(lastType: string | null, selectedTypes: QType[]): QType {
  const types = selectedTypes.length > 0 ? selectedTypes : (["flashcard"] as QType[]);
  if (lastType == null) {
    return types[Math.floor(Math.random() * types.length)]!;
  }

  // Card with history: escalate to the next difficulty level
  const target: QType = ESCALATION[lastType] ?? "flashcard";
  if (types.includes(target)) return target;

  // Target not in selected types — find nearest available in the ladder
  const ladder: QType[] = ["speed_match", "multiple_choice", "type_answer", "audio_type", "flashcard"];
  const targetIdx = ladder.indexOf(target);
  for (let i = targetIdx + 1; i < ladder.length; i++) {
    if (types.includes(ladder[i])) return ladder[i];
  }
  for (let i = targetIdx - 1; i >= 0; i--) {
    if (types.includes(ladder[i])) return ladder[i];
  }
  return types[0]!;
}

function pickDistractors(
  correctBackText: string,
  allBackTexts: string[],
  presetDistractors: string[] | null,
): string[] {
  const pool = (presetDistractors?.length ?? 0) >= 3
    ? presetDistractors!
    : allBackTexts.filter((t) => t !== correctBackText);

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}


export async function fetchStudyCards(
  courseId: string,
  count: number,
  selectedTypes: QType[],
): Promise<StudyCard[]> {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch overdue items with progress
  const { data: overdueRows } = await supabase
    .from("item_progress")
    .select(
      "item_id, ease_factor, interval_days, repetitions, last_question_type, correct_count, incorrect_count, items!item_progress_item_id_fkey(id, front_text, back_text, front_audio_url, back_audio_url, romanization, accepted_answers, distractors)",
    )
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .lte("next_review_at", new Date().toISOString())
    .order("next_review_at", { ascending: true })
    .limit(count);

  const overdue = overdueRows ?? [];

  // Fetch new items if we need more
  const needed = count - overdue.length;
  let newItems: { id: string; front_text: string; back_text: string; front_audio_url: string | null; back_audio_url: string | null; romanization: string | null; accepted_answers: string[] | null; distractors: string[] | null }[] = [];

  if (needed > 0) {
    const { data: allProgressIds } = await supabase
      .from("item_progress")
      .select("item_id")
      .eq("user_id", user.id)
      .eq("course_id", courseId);

    const allSeen = (allProgressIds ?? []).map((r) => r.item_id);

    let q = supabase
      .from("items")
      .select("id, front_text, back_text, front_audio_url, back_audio_url, romanization, accepted_answers, distractors")
      .eq("course_id", courseId)
      .order("position")
      .limit(needed);

    if (allSeen.length > 0) {
      q = q.not("id", "in", `(${allSeen.join(",")})`);
    }

    const { data } = await q;
    newItems = data ?? [];
  }

  let practiceRows: typeof overdueRows = [];
  if (overdue.length === 0 && newItems.length === 0 && count > 0) {
    const { data } = await supabase
      .from("item_progress")
      .select(
        "item_id, ease_factor, interval_days, repetitions, last_question_type, correct_count, incorrect_count, items!item_progress_item_id_fkey(id, front_text, back_text, front_audio_url, back_audio_url, romanization, accepted_answers, distractors)",
      )
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .order("last_reviewed_at", { ascending: true, nullsFirst: false })
      .limit(count);

    practiceRows = data ?? [];
  }

  // Fetch all back_text for distractor pool
  const { data: allItemsRaw } = await supabase
    .from("items")
    .select("back_text")
    .eq("course_id", courseId);
  const allBackTexts = (allItemsRaw ?? []).map((i) => i.back_text);

  // Build card queue
  const cards: StudyCard[] = [];

  for (const row of overdue) {
    const item = row.items as unknown as typeof newItems[number];
    if (!item) continue;
    const questionType = assignQuestionType(row.last_question_type, selectedTypes);
    cards.push({
      itemId: row.item_id,
      courseId,
      frontText: item.front_text,
      backText: item.back_text,
      frontAudioUrl: item.front_audio_url,
      backAudioUrl: item.back_audio_url,
      romanization: item.romanization,
      acceptedAnswers: item.accepted_answers ?? [],
      distractors: pickDistractors(item.back_text, allBackTexts, item.distractors),
      questionType,
      progress: {
        easeFactor: row.ease_factor,
        intervalDays: row.interval_days,
        repetitions: row.repetitions,
        correctCount: row.correct_count,
        incorrectCount: row.incorrect_count,
      },
    });
  }

  for (const row of practiceRows ?? []) {
    const item = row.items as unknown as typeof newItems[number];
    if (!item) continue;
    const questionType = assignQuestionType(row.last_question_type, selectedTypes);
    cards.push({
      itemId: row.item_id,
      courseId,
      frontText: item.front_text,
      backText: item.back_text,
      frontAudioUrl: item.front_audio_url,
      backAudioUrl: item.back_audio_url,
      romanization: item.romanization,
      acceptedAnswers: item.accepted_answers ?? [],
      distractors: pickDistractors(item.back_text, allBackTexts, item.distractors),
      questionType,
      progress: {
        easeFactor: row.ease_factor,
        intervalDays: row.interval_days,
        repetitions: row.repetitions,
        correctCount: row.correct_count,
        incorrectCount: row.incorrect_count,
      },
    });
  }

  for (const item of newItems) {
    const questionType = assignQuestionType(null, selectedTypes);
    cards.push({
      itemId: item.id,
      courseId,
      frontText: item.front_text,
      backText: item.back_text,
      frontAudioUrl: item.front_audio_url,
      backAudioUrl: item.back_audio_url,
      romanization: item.romanization,
      acceptedAnswers: item.accepted_answers ?? [],
      distractors: pickDistractors(item.back_text, allBackTexts, item.distractors),
      questionType,
      progress: null,
    });
  }

  return cards;
}
