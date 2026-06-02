"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { saveSpeedReviewResults } from "./actions";
import type { SpeedCard } from "./page";
import type { Locale } from "@/utils/i18n";
import { t } from "@/utils/t";

const HEARTS_MAX = 3;
const TIME_PER_CARD = 10;
const SHOW_RESULT_MS = 1200;
const POINTS_BASE = 100;
const POINTS_TIME_MULTIPLIER = 10; // up to 100 bonus

type Stage = "playing" | "showing" | "game_over" | "complete";

interface Props {
  courseSlug: string;
  courseTitle: string;
  courseId: string;
  cards: SpeedCard[];
  labels: Locale["speedReview"];
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-7 w-7 transition-all duration-300 ${filled ? "fill-red-500 drop-shadow-sm scale-110" : "fill-ink/20"}`}>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

export default function SpeedReviewClient({ courseSlug, courseTitle, courseId, cards, labels }: Props) {
  const [stage, setStage] = useState<Stage>("playing");
  const [index, setIndex] = useState(0);
  const [hearts, setHearts] = useState(HEARTS_MAX);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_CARD);
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<{ itemId: string; correct: boolean }[]>([]);

  const card = cards[index];
  const totalCards = cards.length;

  const advance = useCallback((isCorrect: boolean, chosenIndex: number | null) => {
    if (stage !== "playing") return;

    const newResults = [...results, { itemId: card.id, correct: isCorrect }];
    setResults(newResults);
    setSelected(chosenIndex);
    setStage("showing");

    let newHearts = hearts;
    if (isCorrect) {
      const bonus = Math.floor(timeLeft * POINTS_TIME_MULTIPLIER);
      setScore((s) => s + POINTS_BASE + bonus);
    } else {
      newHearts = hearts - 1;
      setHearts(newHearts);
    }

    setTimeout(() => {
      if (newHearts <= 0) {
        setStage("game_over");
        saveSpeedReviewResults(courseId, newResults);
        return;
      }
      if (index >= totalCards - 1) {
        setStage("complete");
        saveSpeedReviewResults(courseId, newResults);
        return;
      }
      setIndex((i) => i + 1);
      setTimeLeft(TIME_PER_CARD);
      setSelected(null);
      setStage("playing");
    }, SHOW_RESULT_MS);
  }, [stage, results, card, hearts, timeLeft, index, totalCards, courseId]);

  // Countdown timer — only ticks, never calls advance directly
  useEffect(() => {
    if (stage !== "playing" || timeLeft <= 0) return;
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft, stage]);

  // Time expiry — separated so the countdown effect stays pure
  useEffect(() => {
    if (stage === "playing" && timeLeft <= 0) advance(false, null);
  }, [stage, timeLeft, advance]);

  function handleRestart() {
    setStage("playing");
    setIndex(0);
    setHearts(HEARTS_MAX);
    setScore(0);
    setTimeLeft(TIME_PER_CARD);
    setSelected(null);
    setResults([]);
  }

  const isGameEnd = stage === "game_over" || stage === "complete";

  if (isGameEnd) {
    const correct = results.filter((r) => r.correct).length;
    const isComplete = stage === "complete";
    return (
      <div className="flex min-h-[80dvh] items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className={`rounded-2xl p-8 shadow-hard text-center ${isComplete ? "bg-green-soft" : "bg-red-soft"}`}>
            <p className="font-fredoka text-4xl font-[700]">
              {isComplete ? labels.complete : labels.gameOver}
            </p>
            <p className="mt-1 font-manrope text-sm text-ink-2">
              {t(labels.cardsReviewed, { count: String(correct) })}
            </p>

            {/* Hearts remaining */}
            <div className="mt-6 flex justify-center gap-2">
              {Array.from({ length: HEARTS_MAX }).map((_, i) => (
                <Heart key={i} filled={i < hearts} />
              ))}
            </div>

            {/* Score */}
            <div className="mt-4 rounded-xl bg-paper/60 py-4">
              <p className="font-mono text-xs uppercase tracking-widest text-ink-2">{labels.yourScore}</p>
              <p className="mt-1 font-fredoka text-5xl font-[700] text-ink">{score.toLocaleString()}</p>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleRestart}
                className="w-full rounded-full bg-orange py-3 font-manrope text-sm font-[800] text-on-bright shadow-hard-red transition hover:opacity-90 active:translate-y-[1px] active:shadow-hard-sm"
              >
                {labels.playAgain}
              </button>
              <Link
                href={`/c/${courseSlug}`}
                className="w-full rounded-full bg-paper py-3 font-manrope text-sm font-[800] text-ink shadow-hard-sm transition text-center hover:bg-paper-2 active:translate-y-[1px] active:shadow-none"
              >
                {labels.backToCourse}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const showResult = stage === "showing";
  const wasCorrect = selected !== null && selected === card.correctIndex;
  const timerPct = (timeLeft / TIME_PER_CARD) * 100;
  const timerColor = timeLeft > 5 ? "bg-orange" : timeLeft > 2 ? "bg-yellow-400" : "bg-red-500";

  return (
    <div className="mx-auto flex min-h-[80dvh] max-w-lg flex-col px-4 py-6 gap-4">

      {/* Header: hearts + score + progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {Array.from({ length: HEARTS_MAX }).map((_, i) => (
            <Heart key={i} filled={i < hearts} />
          ))}
        </div>
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">
          {index + 1} / {totalCards}
        </p>
        <div className="rounded-full bg-orange/10 px-3 py-1">
          <span className="font-mono text-xs font-[700] text-orange">{score.toLocaleString()}</span>
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-ink/10">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${timerColor}`}
          style={{ width: `${timerPct}%` }}
        />
      </div>

      {/* Timer number */}
      <div className="text-center">
        <span className={`font-fredoka text-3xl font-[700] tabular-nums transition-colors ${timeLeft <= 3 ? "text-red-500" : "text-ink-2"}`}>
          {timeLeft}
        </span>
      </div>

      {/* Card question */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full rounded-2xl bg-paper-2 p-8 shadow-hard text-center">
          {showResult && (
            <p className={`mb-2 font-manrope text-sm font-[800] ${wasCorrect ? "text-green-600" : "text-red-500"}`}>
              {timeLeft === 0 ? labels.timeUp : wasCorrect ? labels.correct : labels.wrong}
            </p>
          )}
          <p className="font-fredoka text-3xl font-[700] leading-tight tracking-tight text-ink">
            {card.front}
          </p>
        </div>
      </div>

      {/* MC options — 2×2 grid */}
      <div className="grid grid-cols-2 gap-3">
        {card.options.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrectOpt = i === card.correctIndex;
          let cls = "rounded-xl border-2 px-4 py-4 font-manrope text-sm font-[700] text-left transition active:translate-y-[1px]";

          if (!showResult) {
            cls += " border-ink/15 bg-paper text-ink hover:border-orange/40 hover:bg-orange/5 cursor-pointer";
          } else if (isCorrectOpt) {
            cls += " border-green-500 bg-green-soft text-ink cursor-default";
          } else if (isSelected && !isCorrectOpt) {
            cls += " border-red-400 bg-red-soft text-ink cursor-default";
          } else {
            cls += " border-ink/10 bg-paper text-ink-3 cursor-default";
          }

          return (
            <button
              key={i}
              type="button"
              disabled={showResult}
              onClick={() => advance(i === card.correctIndex, i)}
              className={cls}
            >
              <span className="mr-2 font-mono text-xs text-ink-3">
                {String.fromCharCode(65 + i)}.
              </span>
              {opt}
            </button>
          );
        })}
      </div>

      {/* Course title footer */}
      <p className="text-center font-mono text-xs text-ink-3 truncate">{courseTitle}</p>
    </div>
  );
}
