"use client";

import { useState } from "react";
import Link from "next/link";
import { fetchStudyCards } from "./actions";
import PageLoading from "../../_components/page-loading";
import SessionView from "./session-view";
import ResultsScreen from "./results-screen";
import type { QType, StudyCard, SessionStats } from "./types";

type Stage = "setup" | "loading" | "session" | "results";

type StudyLabels = {
  allSections: string;
  howManyWords: string;
  dueForReview: string;
  newCards: string;
  totalCards: string;
  allCaughtUpPractice: string;
  allCaughtUpNoDue: string;
  practiceAgain: string;
  startStudying: string;
  backToCourse: string;
  preparingCards: string;
  savingProgress: string;
  brainFed: string;
  greatSession: string;
  cardsStudied: string;
  correctRate: string;
  xpEarned: string;
  streak: string;
  masteredNew: string;
  masteredCard: string;
  masteredCards: string;
  studyMore: string;
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
};

interface StudyClientProps {
  userId: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  reviewDue: number;
  newCards: number;
  totalCount: number;
  preferredTypes: QType[];
  showRomanization: boolean;
  labels: StudyLabels;
}

export default function StudyClient({
  userId,
  courseId,
  courseTitle,
  courseSlug,
  reviewDue,
  newCards,
  totalCount,
  preferredTypes,
  showRomanization,
  labels,
}: StudyClientProps) {
  const available = reviewDue + newCards;
  const sessionLimit = available > 0 ? available : totalCount;
  const isPracticeMode = available === 0 && totalCount > 0;
  const [stage, setStage] = useState<Stage>("setup");
  const [sessionCards, setSessionCards] = useState<StudyCard[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [count, setCount] = useState(sessionLimit > 0 ? Math.min(10, sessionLimit) : 0);

  async function handleStart() {
    setStage("loading");
    try {
      const cards = await fetchStudyCards(courseId, count, preferredTypes);
      setSessionCards(cards);
      setStage("session");
    } catch {
      setStage("setup");
    }
  }

  function handleSessionComplete(stats: SessionStats) {
    setSessionStats(stats);
    setStage("results");
  }

  function handleExit() {
    setStage("setup");
  }

  function handleStudyMore() {
    setSessionCards([]);
    setSessionStats(null);
    setStage("setup");
  }

  if (stage === "loading") {
    return <PageLoading label={labels.preparingCards} />;
  }

  if (stage === "session") {
    return (
      <SessionView
        userId={userId}
        courseId={courseId}
        courseTitle={courseTitle}
        courseSlug={courseSlug}
        cards={sessionCards}
        showRomanization={showRomanization}
        onComplete={handleSessionComplete}
        onExit={handleExit}
        labels={{
          allSections: labels.allSections,
          savingProgress: labels.savingProgress,
          exitSession: labels.exitSession,
          exitConfirm: labels.exitConfirm,
          exit: labels.exit,
          keepStudying: labels.keepStudying,
          flashcardFlip: labels.flashcardFlip,
          howWellRemember: labels.howWellRemember,
          ratingAgain: labels.ratingAgain,
          ratingHard: labels.ratingHard,
          ratingGood: labels.ratingGood,
          ratingEasy: labels.ratingEasy,
          noAudio: labels.noAudio,
          letters: labels.letters,
          startsWith: labels.startsWith,
          typeAnswerPlaceholder: labels.typeAnswerPlaceholder,
          typeWhatYouHear: labels.typeWhatYouHear,
          playAudio: labels.playAudio,
          correctAnswer: labels.correctAnswer,
          wrongAnswer: labels.wrongAnswer,
          submitButton: labels.submitButton,
          continueButton: labels.continueButton,
          timesUp: labels.timesUp,
          speedMatchResult: labels.speedMatchResult,
          speedMatchQuestion: labels.speedMatchQuestion,
          speedMatchBonus: labels.speedMatchBonus,
          speedMatchNo: labels.speedMatchNo,
          speedMatchYes: labels.speedMatchYes,
          xpEarned: labels.xpEarned,
        }}
      />
    );
  }

  if (stage === "results" && sessionStats) {
    return (
      <ResultsScreen
        courseSlug={courseSlug}
        stats={sessionStats}
        totalCards={sessionCards.length}
        onStudyMore={handleStudyMore}
        labels={{
          brainFed: labels.brainFed,
          greatSession: labels.greatSession,
          cardsStudied: labels.cardsStudied,
          correctRate: labels.correctRate,
          xpEarned: labels.xpEarned,
          streak: labels.streak,
          masteredNew: labels.masteredNew,
          masteredCard: labels.masteredCard,
          masteredCards: labels.masteredCards,
          studyMore: labels.studyMore,
          backToCourse: labels.backToCourse,
        }}
      />
    );
  }

  // ─── Setup screen ─────────────────────────────────────────────────────────

  function adjustCount(delta: number) {
    setCount((prev) => Math.min(sessionLimit, Math.max(1, prev + delta)));
  }

  function handleCountInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = Number(e.target.value);
    if (!Number.isNaN(val)) {
      setCount(Math.min(sessionLimit, Math.max(1, val)));
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      {/* Header */}
      <div className="mb-8 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-3">{labels.allSections}</p>
        <h1 className="mt-1 font-fredoka text-3xl font-[600] text-ink">{courseTitle}</h1>
      </div>

      <div className="rounded-lg bg-paper-2 p-6 shadow-hard">
        {/* Speech bubble */}
        <div className="relative mb-8">
          <div className="rounded-md bg-paper px-5 py-4 shadow-hard-sm">
            <p className="font-kalam text-xl leading-snug text-ink">
              {labels.howManyWords}
            </p>
          </div>
          <div className="absolute -bottom-[11px] left-8 h-0 w-0 border-l-[11px] border-r-[11px] border-t-[11px] border-l-transparent border-r-transparent border-t-paper" />
        </div>

        {/* Count input */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-sm border-2 border-ink/20 bg-ink/5">
              <button
                type="button"
                onClick={() => adjustCount(-1)}
                disabled={count <= 1 || sessionLimit === 0}
                className="px-3 py-2 font-fredoka text-2xl text-ink-2 transition hover:text-ink disabled:opacity-30"
                aria-label="Decrease"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                max={sessionLimit}
                value={count}
                onChange={handleCountInput}
                disabled={sessionLimit === 0}
                className="w-16 bg-transparent py-2 text-center font-fredoka text-3xl font-[600] text-ink focus:outline-none disabled:opacity-40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={() => adjustCount(1)}
                disabled={count >= sessionLimit || sessionLimit === 0}
                className="px-3 py-2 font-fredoka text-2xl text-ink-2 transition hover:text-ink disabled:opacity-30"
                aria-label="Increase"
              >
                +
              </button>
            </div>
            <p className="font-manrope text-sm text-ink-2">
              <span className="font-[700] text-ink">{reviewDue}</span> {labels.dueForReview}
              {newCards > 0 && (
                <>
                  <span className="mx-1.5 text-ink-3">·</span>
                  <span className="font-[700] text-ink">{newCards}</span> {labels.newCards}
                </>
              )}
              <span className="mx-1.5 text-ink-3">·</span>
              <span className="font-[700] text-ink">{totalCount}</span> {labels.totalCards}
            </p>
          </div>
          {isPracticeMode ? (
            <p className="mt-2 font-manrope text-xs text-ink-3">
              {labels.allCaughtUpPractice}
            </p>
          ) : available === 0 && (
            <p className="mt-2 font-manrope text-xs text-ink-3">
              {labels.allCaughtUpNoDue}
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleStart}
            disabled={sessionLimit === 0}
            className="w-full cursor-pointer rounded-full bg-orange px-4 py-3 font-manrope text-sm font-[800] text-white shadow-hard-red transition hover:opacity-90 active:translate-y-[1px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPracticeMode ? labels.practiceAgain : labels.startStudying}
          </button>
          <Link
            href={`/c/${courseSlug}`}
            className="w-full rounded-full border-2 border-ink/20 px-4 py-3 text-center font-manrope text-sm font-[700] text-ink-2 transition hover:border-ink/30 hover:text-ink"
          >
            {labels.backToCourse}
          </Link>
        </div>
      </div>
    </div>
  );
}
