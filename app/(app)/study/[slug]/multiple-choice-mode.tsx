"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { calculateSM2, getQualityScore } from "@/utils/sm2";
import type { StudyCard, CardAnswer, Outcome } from "./types";

interface MCModeProps {
  card: StudyCard;
  onAnswer: (answer: CardAnswer) => void;
}

export default function MultipleChoiceMode({ card, onAnswer }: MCModeProps) {
  const startedAt = useRef(Date.now());
  const [selected, setSelected] = useState<number | null>(null);

  const options = useMemo(() => {
    const pool = [card.backText, ...card.distractors.slice(0, 3)];
    // Shuffle deterministically per itemId so re-renders don't reshuffle
    return pool
      .map((text, i) => ({ text, isCorrect: i === 0, originalIndex: i }))
      .sort(() => hashShuffle(card.itemId));
  }, [card.itemId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    startedAt.current = Date.now();
    setSelected(null);
  }, [card.itemId]);

  useEffect(() => {
    if (selected === null) {
      function onKey(e: KeyboardEvent) {
        const idx = ["1", "2", "3", "4"].indexOf(e.key);
        if (idx !== -1 && idx < options.length) choose(idx);
      }
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [selected, options]); // eslint-disable-line react-hooks/exhaustive-deps

  function choose(idx: number) {
    if (selected !== null) return;
    setSelected(idx);

    const isCorrect = options[idx]!.isCorrect;
    const hesitant = !isCorrect ? false : Date.now() - startedAt.current > 10_000;
    const outcome: Outcome = isCorrect ? (hesitant ? "hesitant" : "correct") : "incorrect";
    const quality = getQualityScore(outcome, "multiple_choice");

    const ef = card.progress?.easeFactor ?? 2.5;
    const iv = card.progress?.intervalDays ?? 1;
    const rp = card.progress?.repetitions ?? 0;
    const result = calculateSM2(quality, ef, iv, rp);
    const wasMastered = rp >= 5 && ef >= 2.5;
    const nowMastered = result.repetitions >= 5 && result.easeFactor >= 2.5;

    const answer: CardAnswer = {
      itemId: card.itemId,
      outcome,
      quality,
      questionType: "multiple_choice",
      wasSpeedMatch: false,
      newEaseFactor: result.easeFactor,
      newInterval: result.interval,
      newRepetitions: result.repetitions,
      newlyMastered: !wasMastered && nowMastered,
    };

    // Auto-advance
    setTimeout(() => onAnswer(answer), isCorrect ? 1000 : 2500);
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-8">
      <div className="rounded-lg bg-paper-2 p-6 shadow-hard-sm text-center">
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
        <p className="font-fredoka text-3xl font-[600] text-ink leading-snug">
          {card.frontText}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {options.map((opt, i) => {
          const isSelected = selected === i;
          const showCorrect = selected !== null && opt.isCorrect;
          const showWrong = isSelected && !opt.isCorrect;

          return (
            <button
              key={i}
              type="button"
              onClick={() => choose(i)}
              disabled={selected !== null}
              className={`flex cursor-pointer items-center gap-3 rounded-sm border-2 px-4 py-3 text-left font-manrope text-sm font-[600] transition active:translate-y-[1px] disabled:cursor-default ${
                showCorrect
                  ? "border-green bg-green-soft text-ink"
                  : showWrong
                    ? "border-red-soft bg-red-soft text-ink"
                    : "border-ink/15 bg-ink/5 text-ink hover:border-ink/30 hover:bg-ink/10"
              }`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-current font-mono text-xs">
                {showCorrect ? "✓" : showWrong ? "✗" : i + 1}
              </span>
              <span>{opt.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Deterministic shuffle seed from itemId string
function hashShuffle(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return (h % 2 === 0 ? 1 : -1);
}
