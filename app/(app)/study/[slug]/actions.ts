"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { resolveMediaUrl } from "@/utils/resolve-media-url";
import { reviewDayCutoff } from "@/utils/review-schedule";
import type { StudyCard, QType } from "./types";

const VALID_TYPES = new Set<QType>(["flashcard", "multiple_choice", "audio_type", "speed_match", "type_answer"]);

export async function updateQuestionTypes(formData: FormData) {
  const courseId = String(formData.get("course_id") ?? "");
  const raw = formData.getAll("question_types") as string[];
  const types = raw.filter((t): t is QType => VALID_TYPES.has(t as QType));
  if (types.length === 0) return;

  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("user_courses")
    .upsert(
      { user_id: user.id, course_id: courseId, preferred_question_types: types },
      { onConflict: "user_id,course_id" }
    );
  if (error) throw new Error(error.message);
}

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

  // At the top of the escalation ladder (target === lastType), randomly pick
  // from all selected types so the user sees variety across sessions.
  if (target === lastType) {
    return types[Math.floor(Math.random() * types.length)]!;
  }

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
  mode?: "review" | "new",
): Promise<StudyCard[]> {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const dueCutoff = reviewDayCutoff().toISOString();

  // Fetch overdue items with progress (skip in "new" mode)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let overdue: any[] = [];
  if (mode !== "new") {
    const { data: overdueRows, error: overdueError } = await supabase
      .from("item_progress")
      .select(
        "item_id, ease_factor, interval_days, repetitions, last_question_type, correct_count, incorrect_count, hard, ignored, items!item_progress_item_id_fkey!inner(id, front_text, back_text, image_url, front_audio_url, back_audio_url, romanization, accepted_answers, distractors, custom_attributes)",
      )
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .eq("ignored", false)
      .lt("next_review_at", dueCutoff)
      .order("hard", { ascending: false })
      .order("next_review_at", { ascending: true })
      .limit(count);
    if (overdueError) throw new Error(overdueError.message);
    overdue = overdueRows ?? [];
  }

  // Fetch new items if we need more (skip in "review" mode)
  const needed = mode === "review" ? 0 : count - overdue.length;
  let newItems: { id: string; front_text: string; back_text: string; image_url: string | null; front_audio_url: string | null; back_audio_url: string | null; romanization: string | null; accepted_answers: string[] | null; distractors: string[] | null; custom_attributes?: Record<string, string> | null }[] = [];

  if (needed > 0) {
    const { data: allProgressIds } = await supabase
      .from("item_progress")
      .select("item_id")
      .eq("user_id", user.id)
      .eq("course_id", courseId);

    const allSeen = (allProgressIds ?? []).map((r) => r.item_id as string);

    // Also exclude ignored items from new cards
    const { data: ignoredIds } = await supabase
      .from("item_progress")
      .select("item_id")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .eq("ignored", true);
    const excluded = [...new Set([...allSeen, ...(ignoredIds ?? []).map((r) => r.item_id as string)])];

    let q = supabase
      .from("items")
      .select("id, front_text, back_text, image_url, front_audio_url, back_audio_url, romanization, accepted_answers, distractors, custom_attributes")
      .eq("course_id", courseId)
      .order("position")
      .limit(needed);

    if (excluded.length > 0) {
      q = q.not("id", "in", `(${excluded.join(",")})`);
    }

    const { data } = await q;
    newItems = data ?? [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let practiceRows: any[] = [];
  if (overdue.length === 0 && newItems.length === 0 && count > 0 && !mode) {
    const { data, error: practiceError } = await supabase
      .from("item_progress")
      .select(
        "item_id, ease_factor, interval_days, repetitions, last_question_type, correct_count, incorrect_count, hard, ignored, items!item_progress_item_id_fkey!inner(id, front_text, back_text, image_url, front_audio_url, back_audio_url, romanization, accepted_answers, distractors, custom_attributes)",
      )
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .eq("ignored", false)
      .order("hard", { ascending: false })
      .order("last_reviewed_at", { ascending: true, nullsFirst: false })
      .limit(count);

    if (practiceError) throw new Error(practiceError.message);
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
      imageUrl: item.image_url,
      frontAudioUrl: item.front_audio_url,
      backAudioUrl: item.back_audio_url,
      romanization: item.romanization,
      acceptedAnswers: item.accepted_answers ?? [],
      distractors: pickDistractors(item.back_text, allBackTexts, item.distractors),
      customAttributes: (item as { custom_attributes?: Record<string, string> | null }).custom_attributes ?? null,
      questionType,
      progress: {
        easeFactor: row.ease_factor,
        intervalDays: row.interval_days,
        repetitions: row.repetitions,
        correctCount: row.correct_count,
        incorrectCount: row.incorrect_count,
        hard: row.hard ?? false,
        ignored: row.ignored ?? false,
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
      imageUrl: item.image_url,
      frontAudioUrl: item.front_audio_url,
      backAudioUrl: item.back_audio_url,
      romanization: item.romanization,
      acceptedAnswers: item.accepted_answers ?? [],
      distractors: pickDistractors(item.back_text, allBackTexts, item.distractors),
      customAttributes: (item as { custom_attributes?: Record<string, string> | null }).custom_attributes ?? null,
      questionType,
      progress: {
        easeFactor: row.ease_factor,
        intervalDays: row.interval_days,
        repetitions: row.repetitions,
        correctCount: row.correct_count,
        incorrectCount: row.incorrect_count,
        hard: row.hard ?? false,
        ignored: row.ignored ?? false,
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
      imageUrl: item.image_url,
      frontAudioUrl: item.front_audio_url,
      backAudioUrl: item.back_audio_url,
      romanization: item.romanization,
      acceptedAnswers: item.accepted_answers ?? [],
      distractors: pickDistractors(item.back_text, allBackTexts, item.distractors),
      customAttributes: (item as { custom_attributes?: Record<string, string> | null }).custom_attributes ?? null,
      questionType,
      progress: null,
    });
  }

  // Resolve storage paths to displayable URLs
  await Promise.all(
    cards.map(async (card) => {
      card.imageUrl = await resolveMediaUrl(card.imageUrl, supabase);
      card.frontAudioUrl = await resolveMediaUrl(card.frontAudioUrl, supabase);
      card.backAudioUrl = await resolveMediaUrl(card.backAudioUrl, supabase);
    })
  );

  return cards;
}
