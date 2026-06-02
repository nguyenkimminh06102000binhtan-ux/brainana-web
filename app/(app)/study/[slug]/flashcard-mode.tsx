"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { calculateSM2, formatInterval } from "@/utils/sm2";
import type { StudyCard, CardAnswer } from "./types";

interface FlashcardModeProps {
  card: StudyCard;
  showRomanization: boolean;
  showCustomAttributes: boolean;
  onAnswer: (answer: CardAnswer) => void;
  onReveal?: () => void;
  labels: {
    flip: string;
    howWellRemember: string;
    ratingAgain: string;
    ratingHard: string;
    ratingGood: string;
    ratingEasy: string;
  };
}

const QUALITIES = [1, 3, 4, 5] as const;

export default function FlashcardMode({ card, showRomanization, showCustomAttributes, onAnswer, onReveal, labels }: FlashcardModeProps) {
  const ratingButtons = [
    { label: labels.ratingAgain, quality: QUALITIES[0] },
    { label: labels.ratingHard,  quality: QUALITIES[1] },
    { label: labels.ratingGood,  quality: QUALITIES[2] },
    { label: labels.ratingEasy,  quality: QUALITIES[3] },
  ];
  const [flipped, setFlipped] = useState(false);

  const ef = card.progress?.easeFactor ?? 2.5;
  const iv = card.progress?.intervalDays ?? 1;
  const rp = card.progress?.repetitions ?? 0;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === " ") {
        e.preventDefault();
        if (!flipped) onReveal?.();
        setFlipped((f) => !f);
      }
      if (!flipped) return;
      const idx = ["1", "2", "3", "4"].indexOf(e.key);
      if (idx !== -1) rate(QUALITIES[idx]!);
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
        onClick={() => { if (!flipped) onReveal?.(); setFlipped((f) => !f); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") { if (!flipped) onReveal?.(); setFlipped((f) => !f); } }}
        aria-label={flipped ? "Card back — click to flip back" : "Card front — press Space or click to flip"}
      >
        <div
          className={`grid min-h-52 w-full rounded-lg bg-paper-2 shadow-hard transition-all duration-300 motion-reduce:duration-0 [transform-style:preserve-3d] ${flipped ? "[transform:rotateY(180deg)]" : ""}`}
        >
          {/* Front */}
          <div className="[grid-area:1/1] flex flex-col items-center justify-center rounded-lg p-6 [backface-visibility:hidden]">
            {card.imageUrl && (
              <div className="relative mb-4 h-32 w-full overflow-hidden rounded-md">
                <Image
                  src={card.imageUrl}
                  alt={card.frontText}
                  fill
                  className="object-contain"
                  sizes="(max-width: 448px) 100vw, 448px"
                />
              </div>
            )}
            <p className="break-words text-center font-fredoka text-xl font-[600] leading-snug text-ink sm:text-3xl">
              {card.frontText}
            </p>
            {showRomanization && card.romanization && (
              <p className="mt-2 font-kalam text-base text-ink-2">{card.romanization}</p>
            )}
            <p className="mt-4 font-manrope text-xs text-ink-3">
              {labels.flip}
            </p>
          </div>
          {/* Back */}
          <div className="[grid-area:1/1] flex flex-col items-center justify-center rounded-lg p-6 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <p className="break-words text-center font-fredoka text-xl font-[600] leading-snug text-ink sm:text-3xl">
              {card.backText}
            </p>
            {showCustomAttributes && card.customAttributes && Object.entries(card.customAttributes).filter(([, v]) => v).length > 0 && (
              <div className="mt-4 w-full border-t border-ink/10 pt-3 flex flex-col gap-1.5">
                {Object.entries(card.customAttributes).filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="text-left">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">{k}</span>
                    <p className="font-manrope text-sm text-ink-2">{v}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rating buttons */}
      {flipped && (
        <div className="w-full max-w-md">
          <p className="mb-2 text-center font-manrope text-xs font-[600] uppercase tracking-wider text-ink-3">
            {labels.howWellRemember}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ratingButtons.map((r, i) => {
              const result = calculateSM2(r.quality, ef, iv, rp);
              return (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => rate(r.quality)}
                  className="flex cursor-pointer flex-col items-center gap-1 rounded-sm border-2 border-ink/15 bg-ink/5 px-2 py-3 font-manrope transition hover:border-ink/30 hover:bg-ink/10 active:translate-y-[1px]"
                >
                  <span className="text-sm font-[700] text-ink">{r.label}</span>
                  <span className="font-mono text-xs text-ink-3">
                    {formatInterval(result.interval)}
                  </span>
                  <span className="font-mono text-xs text-ink-3">{i + 1}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
