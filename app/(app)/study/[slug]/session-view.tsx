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
  showRomanization: boolean;
  onComplete: (stats: SessionStats) => void;
  onExit: () => void;
  labels: {
    allSections: string;
    savingProgress: string;
    exitSession: string;
    exitConfirm: string;
    exit: string;
    keepStudying: string;
    flashcardFlip: string;
    howWellRemember: string;
    ratingAgain: string;
    ratingHard: string;
    ratingGood: string;
    ratingEasy: string;
    noAudio: string;
    letters: string;
    startsWith: string;
    typeAnswerPlaceholder: string;
    typeWhatYouHear: string;
    playAudio: string;
    correctAnswer: string;
    wrongAnswer: string;
    submitButton: string;
    continueButton: string;
    timesUp: string;
    speedMatchResult: string;
    speedMatchQuestion: string;
    speedMatchBonus: string;
    speedMatchNo: string;
    speedMatchYes: string;
    xpEarned: string;
    feedbackCorrect: string[];
    feedbackWrong: string[];
  };
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
  showRomanization,
  onComplete,
  onExit,
  labels,
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
        <p className="font-manrope text-sm text-ink-2">{labels.savingProgress}</p>
      </div>
    );
  }

  const currentRegularCard = regularCards[regularIndex];
  const topBarLabels = { allSections: labels.allSections };
  const exitLabels = { exitSession: labels.exitSession, exitConfirm: labels.exitConfirm, exit: labels.exit, keepStudying: labels.keepStudying };
  const flashcardLabels = { flip: labels.flashcardFlip, howWellRemember: labels.howWellRemember, ratingAgain: labels.ratingAgain, ratingHard: labels.ratingHard, ratingGood: labels.ratingGood, ratingEasy: labels.ratingEasy };
  const typeAnswerLabels = { noAudio: labels.noAudio, letters: labels.letters, startsWith: labels.startsWith, placeholder: labels.typeAnswerPlaceholder, playAudio: labels.playAudio, correct: labels.correctAnswer, wrong: labels.wrongAnswer, submit: labels.submitButton, continueBtn: labels.continueButton, feedbackCorrect: labels.feedbackCorrect, feedbackWrong: labels.feedbackWrong };
  const audioTypeLabels = { letters: labels.letters, startsWith: labels.startsWith, placeholder: labels.typeWhatYouHear, correct: labels.correctAnswer, wrong: labels.wrongAnswer, submit: labels.submitButton, continueBtn: labels.continueButton, noAudio: labels.noAudio, playAudio: labels.playAudio, feedbackCorrect: labels.feedbackCorrect, feedbackWrong: labels.feedbackWrong };
  const speedMatchLabels = { timesUp: labels.timesUp, xpEarned: labels.xpEarned, result: labels.speedMatchResult, question: labels.speedMatchQuestion, bonus: labels.speedMatchBonus, no: labels.speedMatchNo, yes: labels.speedMatchYes, continueBtn: labels.continueButton };

  return (
    <div className="min-h-screen">
      {phase === "speed_match" ? (
        <>
          <TopBar
            courseTitle={courseTitle}
            current={0}
            total={speedMatchCards.length}
            onClose={() => setShowExitConfirm(true)}
            labels={topBarLabels}
          />
          <SpeedMatchMode cards={speedMatchCards} onComplete={handleSpeedMatchComplete} labels={speedMatchLabels} />
        </>
      ) : currentRegularCard ? (
        <>
          <TopBar
            courseTitle={courseTitle}
            current={regularIndex}
            total={regularCards.length}
            onClose={() => setShowExitConfirm(true)}
            labels={topBarLabels}
          />
          <div className="mx-auto max-w-lg">
            {currentRegularCard.questionType === "flashcard" && (
              <FlashcardMode card={currentRegularCard} showRomanization={showRomanization} onAnswer={handleRegularAnswer} labels={flashcardLabels} />
            )}
            {currentRegularCard.questionType === "multiple_choice" && (
              <MultipleChoiceMode card={currentRegularCard} onAnswer={handleRegularAnswer} feedbackCorrect={labels.feedbackCorrect} feedbackWrong={labels.feedbackWrong} />
            )}
            {currentRegularCard.questionType === "type_answer" && (
              <TypeAnswerMode card={currentRegularCard} onAnswer={handleRegularAnswer} labels={typeAnswerLabels} />
            )}
            {currentRegularCard.questionType === "audio_type" && (
              <AudioTypeMode card={currentRegularCard} onAnswer={handleRegularAnswer} labels={audioTypeLabels} />
            )}
          </div>
        </>
      ) : null}

      {showExitConfirm && (
        <ExitConfirm
          onConfirm={handleExit}
          onCancel={() => setShowExitConfirm(false)}
          labels={exitLabels}
        />
      )}
    </div>
  );
}
