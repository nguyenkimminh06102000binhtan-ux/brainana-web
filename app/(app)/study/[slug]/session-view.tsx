"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { nextReviewDay } from "@/utils/review-schedule";
import { calculateSM2, getQualityScore } from "@/utils/sm2";
import TopBar from "./top-bar";
import ExitConfirm from "./exit-confirm";
import FlashcardMode from "./flashcard-mode";
import MultipleChoiceMode from "./multiple-choice-mode";
import TypeAnswerMode from "./type-answer-mode";
import AudioTypeMode from "./audio-type-mode";
import SpeedMatchMode from "./speed-match-mode";
import StudyWordControls from "./study-word-controls";
import MemSection from "../../_components/MemSection";
import { updateStudyWordFlag } from "./word-actions";
import type { StudyCard, CardAnswer, SessionStats } from "./types";

interface MemsLabels {
  memoryHints: string;
  writeYourOwn: string;
  editYourMem: string;
  placeholder: string;
  submit: string;
  cancel: string;
  delete: string;
  deleteConfirm: string;
  seeAll: string;
  helpful: string;
  editLabel: string;
  charsLeft: string;
  noHints: string;
}

interface SessionViewProps {
  userId: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  cards: StudyCard[];
  showRomanization: boolean;
  showCustomAttributes: boolean;
  hiddenCustomAttributeKeys: string[];
  audioOnlyMode: boolean;
  memsLabels: MemsLabels;
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
    submitButton: string;
    continueButton: string;
    timesUp: string;
    speedMatchResult: string;
    speedMatchQuestion: string;
    speedMatchBonus: string;
    speedMatchNo: string;
    speedMatchYes: string;
    xpEarned: string;
    dontKnow: string;
    markHard: string;
    unmarkHard: string;
    ignoreWord: string;
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
  cards,
  showRomanization,
  showCustomAttributes,
  hiddenCustomAttributeKeys,
  audioOnlyMode,
  memsLabels,
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
  const [revealedCardId, setRevealedCardId] = useState<string | null>(null);
  const [hardItemIds, setHardItemIds] = useState<Set<string>>(
    () => new Set(cards.filter((card) => card.progress?.hard).map((card) => card.itemId)),
  );
  const [controlBusy, setControlBusy] = useState(false);

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
    const isHard = answer.hard ?? hardItemIds.has(answer.itemId) ?? card.progress?.hard ?? false;
    const nextInterval = isHard
      ? Math.max(1, Math.ceil(answer.newInterval / 2))
      : answer.newInterval;
    const nextReview = nextReviewDay(now, nextInterval);
    await supabase.from("item_progress").upsert(
      {
        user_id: userId,
        item_id: answer.itemId,
        course_id: courseId,
        ease_factor: answer.newEaseFactor,
        interval_days: nextInterval,
        repetitions: answer.newRepetitions,
        next_review_at: nextReview.toISOString(),
        last_reviewed_at: now.toISOString(),
        last_question_type: answer.questionType,
        correct_count: (card.progress?.correctCount ?? 0) + (answer.outcome !== "incorrect" ? 1 : 0),
        incorrect_count: (card.progress?.incorrectCount ?? 0) + (answer.outcome === "incorrect" ? 1 : 0),
        mastered: answer.newlyMastered || (answer.newRepetitions >= 5 && answer.newEaseFactor >= 2.5),
        hard: isHard,
        ignored: false,
      },
      { onConflict: "user_id,item_id" },
    );
  }

  function buildIncorrectAnswer(card: StudyCard): CardAnswer {
    const ef = card.progress?.easeFactor ?? 2.5;
    const iv = card.progress?.intervalDays ?? 1;
    const rp = card.progress?.repetitions ?? 0;
    const questionType = card.questionType === "flashcard" ? "type_answer" : card.questionType;
    const quality = getQualityScore("incorrect", questionType);
    const result = calculateSM2(quality, ef, iv, rp);
    return {
      itemId: card.itemId,
      outcome: "incorrect",
      quality,
      questionType,
      wasSpeedMatch: false,
      newEaseFactor: result.easeFactor,
      newInterval: result.interval,
      newRepetitions: result.repetitions,
      newlyMastered: false,
      hard: hardItemIds.has(card.itemId) || card.progress?.hard || false,
    };
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
      setRevealedCardId(null);
      setRegularIndex(next);
    }
  }

  async function handleDontKnow(card: StudyCard) {
    if (controlBusy) return;
    setControlBusy(true);
    try {
      setRevealedCardId(card.itemId);
      await handleRegularAnswer(buildIncorrectAnswer(card));
    } finally {
      setControlBusy(false);
    }
  }

  async function handleToggleHard(card: StudyCard) {
    if (controlBusy) return;
    const nextHard = !hardItemIds.has(card.itemId);
    setHardItemIds((prev) => {
      const next = new Set(prev);
      if (nextHard) next.add(card.itemId);
      else next.delete(card.itemId);
      return next;
    });
    setControlBusy(true);
    try {
      const result = await updateStudyWordFlag(courseId, card.itemId, "hard", nextHard);
      if (result?.error) {
        setHardItemIds((prev) => {
          const next = new Set(prev);
          if (nextHard) next.delete(card.itemId);
          else next.add(card.itemId);
          return next;
        });
      }
    } finally {
      setControlBusy(false);
    }
  }

  async function handleIgnore(card: StudyCard) {
    if (controlBusy) return;
    setControlBusy(true);
    let ok = false;
    try {
      const result = await updateStudyWordFlag(courseId, card.itemId, "ignored", true);
      ok = !result?.error;
    } finally {
      setControlBusy(false);
    }
    if (!ok) return;
    const next = regularIndex + 1;
    if (next >= regularCards.length) {
      finishSession(answers, speedMatchXp);
    } else {
      setRevealedCardId(null);
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
  const typeAnswerLabels = { noAudio: labels.noAudio, letters: labels.letters, startsWith: labels.startsWith, placeholder: labels.typeAnswerPlaceholder, playAudio: labels.playAudio, correct: labels.correctAnswer, submit: labels.submitButton, continueBtn: labels.continueButton, feedbackCorrect: labels.feedbackCorrect, feedbackWrong: labels.feedbackWrong };
  const audioTypeLabels = { letters: labels.letters, startsWith: labels.startsWith, placeholder: labels.typeWhatYouHear, correct: labels.correctAnswer, submit: labels.submitButton, continueBtn: labels.continueButton, noAudio: labels.noAudio, playAudio: labels.playAudio, feedbackCorrect: labels.feedbackCorrect, feedbackWrong: labels.feedbackWrong };
  const speedMatchLabels = { timesUp: labels.timesUp, xpEarned: labels.xpEarned, result: labels.speedMatchResult, question: labels.speedMatchQuestion, bonus: labels.speedMatchBonus, no: labels.speedMatchNo, yes: labels.speedMatchYes, continueBtn: labels.continueButton };
  const wordControlLabels = { dontKnow: labels.dontKnow, markHard: labels.markHard, unmarkHard: labels.unmarkHard, ignoreWord: labels.ignoreWord };

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
              <FlashcardMode key={currentRegularCard.itemId} card={currentRegularCard} showRomanization={showRomanization} showCustomAttributes={showCustomAttributes} hiddenCustomAttributeKeys={hiddenCustomAttributeKeys} onAnswer={handleRegularAnswer} onReveal={() => setRevealedCardId(currentRegularCard.itemId)} labels={flashcardLabels} />
            )}
            {currentRegularCard.questionType === "multiple_choice" && (
              <MultipleChoiceMode key={currentRegularCard.itemId} card={currentRegularCard} onAnswer={handleRegularAnswer} onReveal={() => setRevealedCardId(currentRegularCard.itemId)} continueLabel={labels.continueButton} showRomanization={showRomanization} showCustomAttributes={showCustomAttributes} hiddenCustomAttributeKeys={hiddenCustomAttributeKeys} />
            )}
            {currentRegularCard.questionType === "type_answer" && (
              <TypeAnswerMode key={currentRegularCard.itemId} card={currentRegularCard} onAnswer={handleRegularAnswer} onReveal={() => setRevealedCardId(currentRegularCard.itemId)} labels={typeAnswerLabels} showRomanization={showRomanization} showCustomAttributes={showCustomAttributes} hiddenCustomAttributeKeys={hiddenCustomAttributeKeys} />
            )}
            {currentRegularCard.questionType === "audio_type" && (
              <AudioTypeMode key={currentRegularCard.itemId} card={currentRegularCard} onAnswer={handleRegularAnswer} onReveal={() => setRevealedCardId(currentRegularCard.itemId)} labels={audioTypeLabels} showFallbackNotice={audioOnlyMode} showCustomAttributes={showCustomAttributes} hiddenCustomAttributeKeys={hiddenCustomAttributeKeys} />
            )}
            <StudyWordControls
              hard={hardItemIds.has(currentRegularCard.itemId)}
              disabled={controlBusy}
              showDontKnow={currentRegularCard.questionType !== "flashcard"}
              labels={wordControlLabels}
              onDontKnow={() => handleDontKnow(currentRegularCard)}
              onToggleHard={() => handleToggleHard(currentRegularCard)}
              onIgnore={() => handleIgnore(currentRegularCard)}
            />
            {revealedCardId === currentRegularCard.itemId && (
              <div className="px-4 pb-6">
                <MemSection cardId={currentRegularCard.itemId} currentUserId={userId} labels={memsLabels} />
              </div>
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
