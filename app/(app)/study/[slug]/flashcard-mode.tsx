"use client";

import { useState, useEffect } from "react";
import { calculateSM2, formatInterval } from "@/utils/sm2";
import type { StudyCard, CardAnswer } from "./types";

interface FlashcardModeProps {
  card: StudyCard;
  onAnswer: (answer: CardAnswer) => void;
}

const RATINGS = [
  { label: "Again", quality: 1 },
  { label: "Hard",  quality: 3 },
  { label: "Good",  quality: 4 },
  { label: "Easy",  quality: 5 },
] as const;

export default function FlashcardMode({ card, onAnswer }: FlashcardModeProps) {
  const [flipped, setFlipped] = useState(false);

  const ef = card.progress?.easeFactor ?? 2.5;
  const iv = card.progress?.intervalDays ?? 1;
  const rp = card.progress?.repetitions ?? 0;

  useEffect(() => {
    setFlipped(false);
  }, [card.itemId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === " ") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
      if (!flipped) return;
      const idx = ["1", "2", "3", "4"].indexOf(e.key);
      if (idx !== -1) rate(RATINGS[idx]!.quality);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flipped, card.itemId]); // eslint-disable-line react-hooks/exhaustive-deps

  function rate(quality: number) {
    const result = calculateSM2(quality, ef, iv, rp);
    const wasMastered = (card.progress?.repetitions ?? 0) >= 5 && ef >= 2.5;
    const nowMastered = result.repetitions >= 5 && result.easeFactor >= 2.5;
    onAnswer({
      itemId: card.itemId,
      outcome: quality >= 4 ? "correct" : quality >= 2 ? "hesitant" : "incorrect",
      quality,
      questionType: "flashcard",
      wasSpeedMatch: false,
      newEaseFactor: result.easeFactor,
      newInterval: result.interval,
      newRepetitions: result.repetitions,
      newlyMastered: !wasMastered && nowMastered,
    });
  }

  return (
    <div className="flex flex-col items-center gap-6 px-4 py-8">
      {/* Card */}
      <div
        className="perspective-[1000px] w-full max-w-md cursor-pointer"
        onClick={() => setFlipped((f) => !f)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setFlipped((f) => !f)}
        aria-label={flipped ? "Card back — click to flip back" : "Card front — press Space or click to flip"}
      >
        <div
          className={`relative min-h-48 w-full rounded-lg bg-paper-2 shadow-hard transition-all duration-300 motion-reduce:duration-0 [transform-style:preserve-3d] ${flipped ? "[transform:rotateY(180deg)]" : ""}`}
        >
          {/* Front */}
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg p-6 [backface-visibility:hidden]">
            <p className="text-center font-fredoka text-3xl font-[600] text-ink leading-snug">
              {card.frontText}
            </p>
            <p className="mt-4 font-manrope text-xs text-ink-3">
              Click or press Space to flip
            </p>
          </div>
          {/* Back */}
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg p-6 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <p className="text-center font-fredoka text-3xl font-[600] text-ink leading-snug">
              {card.backText}
            </p>
            {card.romanization && (
              <p className="mt-2 font-kalam text-lg text-ink-2">{card.romanization}</p>
            )}
          </div>
        </div>
      </div>

      {/* Rating buttons */}
      {flipped && (
        <div className="w-full max-w-md">
          <p className="mb-2 text-center font-manrope text-xs font-[600] uppercase tracking-wider text-ink-3">
            How well did you remember?
          </p>
          <div className="grid grid-cols-4 gap-2">
            {RATINGS.map((r, i) => {
              const result = calculateSM2(r.quality, ef, iv, rp);
              return (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => rate(r.quality)}
                  className="flex cursor-pointer flex-col items-center gap-1 rounded-sm border-2 border-ink/15 bg-ink/5 px-2 py-3 font-manrope transition hover:border-ink/30 hover:bg-ink/10 active:translate-y-[1px]"
                >
                  <span className="text-sm font-[700] text-ink">{r.label}</span>
                  <span className="font-mono text-[10px] text-ink-3">
                    {formatInterval(result.interval)}
                  </span>
                  <span className="font-mono text-[10px] text-ink-3/60">{i + 1}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
