"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { t } from "@/utils/t";
import type { StudyCard } from "./types";

interface SpeedMatchResult {
  correct: number;
  total: number;
  xp: number;
}

interface SpeedMatchModeProps {
  cards: StudyCard[];
  onComplete: (result: SpeedMatchResult) => void;
  labels: {
    timesUp: string;
    xpEarned: string;
    result: string;
    question: string;
    bonus: string;
    no: string;
    yes: string;
    continueBtn: string;
  };
}

interface Pairing {
  card: StudyCard;
  shownTranslation: string;
  isCorrectPairing: boolean;
}

const TOTAL_TIME = 60;
const STREAK_BONUS_EVERY = 5;
const STREAK_BONUS_XP = 20;
const CORRECT_XP = 10;
const TIMER_BONUS_SECONDS = 2;

function buildPairings(cards: StudyCard[]): Pairing[] {
  // Build a shuffled sequence: ~50% correct pairings, ~50% wrong
  const pairings: Pairing[] = [];
  const allBackTexts = cards.map((c) => c.backText);

  for (const card of cards) {
    // Correct pairing
    pairings.push({ card, shownTranslation: card.backText, isCorrectPairing: true });
    // Wrong pairing — pick a different card's back text
    const wrong = allBackTexts.find((t) => t !== card.backText) ?? allBackTexts[0]!;
    pairings.push({ card, shownTranslation: wrong, isCorrectPairing: false });
  }

  // Shuffle
  return pairings.sort(() => Math.random() - 0.5);
}

export default function SpeedMatchMode({ cards, onComplete, labels }: SpeedMatchModeProps) {
  const pairings = useMemo(() => buildPairings(cards), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [index, setIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const [streakCelebration, setStreakCelebration] = useState(false);
  const [done, setDone] = useState(false);
  // finalStats captures ref values at game-end so they can be read safely in JSX
  // (the React Compiler disallows reading .current during render).
  const [finalStats, setFinalStats] = useState<{ xp: number; total: number } | null>(null);
  const xpRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalRef = useRef(0);

  const currentPairing = pairings[index % pairings.length]!;

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setFinalStats({ xp: xpRef.current, total: totalRef.current });
          setDone(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const answer = useCallback(
    (userSaysMatch: boolean) => {
      if (done) return;
      totalRef.current += 1;
      const wasRight = userSaysMatch === currentPairing.isCorrectPairing;

      if (wasRight) {
        const newStreak = streak + 1;
        const newCorrect = correct + 1;
        xpRef.current += CORRECT_XP;
        if (newStreak % STREAK_BONUS_EVERY === 0) {
          xpRef.current += STREAK_BONUS_XP;
          setTimeLeft((t) => Math.min(TOTAL_TIME, t + TIMER_BONUS_SECONDS));
          setStreakCelebration(true);
          setTimeout(() => setStreakCelebration(false), 800);
        }
        setStreak(newStreak);
        setCorrect(newCorrect);
        setFlash("correct");
      } else {
        setStreak(0);
        setFlash("wrong");
      }

      setIndex((i) => i + 1);
      setTimeout(() => setFlash(null), 250);
    },
    [done, streak, correct, currentPairing],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done) return;
      if (e.key === "ArrowRight") answer(true);
      if (e.key === "ArrowLeft") answer(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, answer]);

  if (done && finalStats) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4">
        <p className="font-fredoka text-4xl font-[600] text-ink">{labels.timesUp}</p>
        <div className="rounded-lg bg-paper-2 p-6 shadow-hard text-center">
          <p className="font-mono text-5xl font-[700] text-orange-text">{finalStats.xp}</p>
          <p className="mt-1 font-manrope text-sm text-ink-2">{labels.xpEarned}</p>
          <p className="mt-4 font-manrope text-sm text-ink-2">
            {t(labels.result, { correct, wrong: finalStats.total - correct })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onComplete({ correct, total: finalStats.total, xp: finalStats.xp })}
          className="w-full max-w-sm cursor-pointer rounded-full bg-orange px-4 py-3 font-manrope text-sm font-[800] text-on-bright shadow-hard-red transition hover:opacity-90 active:translate-y-[1px]"
        >
          {labels.continueBtn}
        </button>
      </div>
    );
  }

  const timerPct = (timeLeft / TOTAL_TIME) * 100;

  return (
    <div
      className={`flex min-h-[60vh] flex-col transition-colors duration-150 motion-reduce:transition-none ${
        flash === "correct" ? "bg-green-soft" : flash === "wrong" ? "bg-red-soft" : ""
      }`}
    >
      {/* Speed match timer bar */}
      <div className="h-2 w-full bg-ink/10">
        <div
          className={`h-full transition-[width] duration-1000 motion-reduce:transition-none ${
            timeLeft <= 10 ? "bg-red" : "bg-orange"
          }`}
          style={{ width: `${timerPct}%` }}
        />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-8">
        {/* Timer + streak */}
        <div className="flex w-full max-w-sm items-center justify-between">
          <span
            className={`font-mono text-2xl font-[700] ${
              timeLeft <= 10 ? "animate-pulse text-red" : "text-ink"
            }`}
          >
            {timeLeft}s
          </span>
          <span
            className={`font-mono text-2xl font-[700] transition-transform duration-150 ${
              streakCelebration ? "scale-125 text-orange-text" : "text-ink"
            }`}
          >
            🔥 {streak}
          </span>
        </div>

        {/* Card — front + proposed translation */}
        <div className="w-full max-w-sm rounded-lg bg-paper-2 p-6 shadow-hard text-center">
          <p className="font-fredoka text-3xl font-[600] text-ink leading-snug">
            {currentPairing.card.frontText}
          </p>
          <div className="my-3 h-px w-full bg-ink/10" />
          <p className="font-fredoka text-2xl font-[500] text-ink-2 leading-snug">
            {currentPairing.shownTranslation}
          </p>
        </div>

        <p className="font-manrope text-xs text-ink-3">
          {labels.question}
        </p>

        {/* Buttons */}
        <div className="flex w-full max-w-sm gap-3">
          <button
            type="button"
            onClick={() => answer(false)}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-sm border-2 border-red-soft bg-red-soft py-4 font-manrope text-base font-[800] text-ink transition hover:opacity-80 active:scale-95"
          >
            <span>{labels.no}</span>
            <span className="font-mono text-xs text-ink-3">←</span>
          </button>
          <button
            type="button"
            onClick={() => answer(true)}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-sm border-2 border-green-soft bg-green-soft py-4 font-manrope text-base font-[800] text-ink transition hover:opacity-80 active:scale-95"
          >
            <span className="font-mono text-xs text-ink-3">→</span>
            <span>{labels.yes}</span>
          </button>
        </div>

        {streakCelebration && (
          <p className="animate-bounce font-fredoka text-xl font-[600] text-orange-text motion-reduce:animate-none">
            {t(labels.bonus, { seconds: TIMER_BONUS_SECONDS })}
          </p>
        )}
      </div>
    </div>
  );
}
