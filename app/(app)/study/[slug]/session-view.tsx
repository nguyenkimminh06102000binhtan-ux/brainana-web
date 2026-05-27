"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { calculateSM2, getQualityScore, addDays } from "@/utils/sm2";
import TopBar from "./top-bar";
import ExitConfirm from "./exit-confirm";
import FlashcardMode from "./flashcard-mode";
import MultipleChoiceMode from "./multiple-choice-mode";
import TypeAnswerMode from "./type-answer-mode";
import AudioTypeMode from "./audio-type-mode";
import SpeedMatchMode from "./speed-match-mode";
import type { StudyCard, CardAnswer, SessionStats } from "./types";

interface SessionViewProps {
  userId: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  cards: StudyCard[];
  onComplete: (stats: SessionStats) => void;
  onExit: () => void;
}

interface SpeedMatchResult {
  correct: number;
  total: number;
  xp: number;
}

export default function SessionView({
  userId,
  courseId,
  courseTitle,
  courseSlug,
  cards,
  onComplete,
  onExit,
}: SessionViewProps) {
  const speedMatchCards = useMemo(() => cards.filter((c) => c.questionType === "speed_match"), [cards]);
  const regularCards = useMemo(() => cards.filter((c) => c.questionType !== "speed_match"), [cards]);

  const [phase, setPhase] = useState<"speed_match" | "regular" | "saving">(
    speedMatchCards.length > 0 ? "speed_match" : "regular",
  );
  const [regularIndex, setRegularIndex] = useState(0);
  const [answers, setAnswers] = useState<CardAnswer[]>([]);
  const [speedMatchXp, setSpeedMatchXp] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Total for progress bar: speed match phase shows SM card count, regular shows all regular
  const totalForProgress =
    phase === "speed_match" ? speedMatchCards.length : regularCards.length;
  const currentProgress =
    phase === "speed_match" ? 0 : regularIndex;

  // Keyboard: Escape → exit confirm
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowExitConfirm(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function upsertProgress(answer: CardAnswer, card: StudyCard) {
    if (answer.wasSpeedMatch) return;
    const supabase = createClient();
    const now = new Date();
    const nextReview = addDays(now, answer.newInterval);
    await supabase.from("item_progress").upsert(
      {
        user_id: userId,
        item_id: answer.itemId,
        course_id: courseId,
        ease_factor: answer.newEaseFactor,
        interval_days: answer.newInterval,
        repetitions: answer.newRepetitions,
        next_review_at: nextReview.toISOString(),
        last_reviewed_at: now.toISOString(),
        last_question_type: answer.questionType,
        correct_count: (card.progress?.correctCount ?? 0) + (answer.outcome !== "incorrect" ? 1 : 0),
        incorrect_count: (card.progress?.incorrectCount ?? 0) + (answer.outcome === "incorrect" ? 1 : 0),
        mastered: answer.newlyMastered || (answer.newRepetitions >= 5 && answer.newEaseFactor >= 2.5),
      },
      { onConflict: "user_id,item_id" },
    );
  }

  async function handleRegularAnswer(answer: CardAnswer) {
    const card = regularCards[regularIndex]!;
    await upsertProgress(answer, card);
    const updated = [...answers, answer];
    setAnswers(updated);

    const next = regularIndex + 1;
    if (next >= regularCards.length) {
      finishSession(updated, speedMatchXp);
    } else {
      setRegularIndex(next);
    }
  }

  function handleSpeedMatchComplete(result: SpeedMatchResult) {
    setSpeedMatchXp(result.xp);
    if (regularCards.length === 0) {
      finishSession([], result.xp);
    } else {
      setPhase("regular");
    }
  }

  async function finishSession(finalAnswers: CardAnswer[], smXp: number) {
    setPhase("saving");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const correct = finalAnswers.filter((a) => a.outcome !== "incorrect").length;
    const incorrect = finalAnswers.filter((a) => a.outcome === "incorrect").length;
    const masteredCount = finalAnswers.filter((a) => a.newlyMastered).length;

    // XP: 10 per correct + streak bonuses already counted in smXp, session bonus
    let sessionXp = smXp;
    let streak = 0;
    for (const a of finalAnswers) {
      if (a.outcome !== "incorrect") {
        sessionXp += 10;
        streak++;
        if (streak % 5 === 0) sessionXp += 20;
      } else {
        streak = 0;
      }
    }
    sessionXp += 50; // session completion bonus

    // Insert study session
    const sessionType = cards[0]?.questionType ?? "flashcard";
    await supabase.from("study_sessions").insert({
      user_id: user.id,
      course_id: courseId,
      items_studied: finalAnswers.length + (smXp > 0 ? speedMatchCards.length : 0),
      correct_count: correct,
      incorrect_count: incorrect,
      xp_earned: sessionXp,
      ended_at: new Date().toISOString(),
      session_type: sessionType,
    });

    // XP log
    await supabase.from("xp_logs").insert({
      user_id: user.id,
      xp_amount: sessionXp,
      reason: "study_session",
    });

    // Update profile XP + streak
    const { data: profile } = await supabase
      .from("profiles")
      .select("total_xp, current_streak, longest_streak, last_activity_date")
      .eq("id", user.id)
      .single();

    if (profile) {
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      let newStreak = 1;
      if (profile.last_activity_date === today) {
        newStreak = profile.current_streak;
      } else if (profile.last_activity_date === yesterday) {
        newStreak = profile.current_streak + 1;
      }
      const newLongest = Math.max(profile.longest_streak, newStreak);

      await supabase
        .from("profiles")
        .update({
          total_xp: profile.total_xp + sessionXp,
          current_streak: newStreak,
          longest_streak: newLongest,
          last_activity_date: today,
        })
        .eq("id", user.id);

      onComplete({
        correct,
        incorrect,
        xpEarned: sessionXp,
        masteredCount,
        updatedStreak: newStreak,
      });
    }
  }

  async function handleExit() {
    // item_progress already saved per-card; just exit
    onExit();
  }

  if (phase === "saving") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="font-manrope text-sm text-ink-2">Saving your progress…</p>
      </div>
    );
  }

  const currentRegularCard = regularCards[regularIndex];

  return (
    <div className="min-h-screen">
      {phase === "speed_match" ? (
        <>
          <TopBar
            courseTitle={courseTitle}
            current={0}
            total={speedMatchCards.length}
            onClose={() => setShowExitConfirm(true)}
          />
          <SpeedMatchMode cards={speedMatchCards} onComplete={handleSpeedMatchComplete} />
        </>
      ) : currentRegularCard ? (
        <>
          <TopBar
            courseTitle={courseTitle}
            current={regularIndex}
            total={regularCards.length}
            onClose={() => setShowExitConfirm(true)}
          />
          <div className="mx-auto max-w-lg">
            {currentRegularCard.questionType === "flashcard" && (
              <FlashcardMode card={currentRegularCard} onAnswer={handleRegularAnswer} />
            )}
            {currentRegularCard.questionType === "multiple_choice" && (
              <MultipleChoiceMode card={currentRegularCard} onAnswer={handleRegularAnswer} />
            )}
            {currentRegularCard.questionType === "type_answer" && (
              <TypeAnswerMode card={currentRegularCard} onAnswer={handleRegularAnswer} />
            )}
            {currentRegularCard.questionType === "audio_type" && (
              <AudioTypeMode card={currentRegularCard} onAnswer={handleRegularAnswer} />
            )}
          </div>
        </>
      ) : null}

      {showExitConfirm && (
        <ExitConfirm
          onConfirm={handleExit}
          onCancel={() => setShowExitConfirm(false)}
        />
      )}
    </div>
  );
}
