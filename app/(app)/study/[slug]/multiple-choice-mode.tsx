"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { calculateSM2, getQualityScore } from "@/utils/sm2";
import { playCorrectSound, playWrongSound } from "@/utils/answer-audio";
import AnswerFeedback from "./answer-feedback";
import type { StudyCard, CardAnswer, Outcome } from "./types";

interface MCModeProps {
  card: StudyCard;
  onAnswer: (answer: CardAnswer) => void;
  onReveal?: () => void;
  feedbackCorrect: string[];
  feedbackWrong: string[];
  continueLabel: string;
}

export default function MultipleChoiceMode({ card, onAnswer, onReveal, feedbackCorrect, feedbackWrong, continueLabel }: MCModeProps) {
  const startedAt = useRef(Date.now());
  const [selected, setSelected] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<"correct" | "incorrect" | null>(null);
  const [pendingAnswer, setPendingAnswer] = useState<CardAnswer | null>(null);

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
    setOutcome(null);
    setPendingAnswer(null);
  }, [card.itemId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (selected === null) {
        const idx = ["1", "2", "3", "4"].indexOf(e.key);
        if (idx !== -1 && idx < options.length) choose(idx);
      } else if (e.key === "Enter" && pendingAnswer) {
        onAnswer(pendingAnswer);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, options, pendingAnswer]); // eslint-disable-line react-hooks/exhaustive-deps

  function choose(idx: number) {
    if (selected !== null) return;
    setSelected(idx);

    const isCorrect = options[idx]!.isCorrect;
    const hesitant = !isCorrect ? false : Date.now() - startedAt.current > 10_000;
    const cardOutcome: Outcome = isCorrect ? (hesitant ? "hesitant" : "correct") : "incorrect";
    const quality = getQualityScore(cardOutcome, "multiple_choice");

    if (isCorrect) playCorrectSound();
    else playWrongSound();
    setOutcome(isCorrect ? "correct" : "incorrect");
    onReveal?.();

    const ef = card.progress?.easeFactor ?? 2.5;
    const iv = card.progress?.intervalDays ?? 1;
    const rp = card.progress?.repetitions ?? 0;
    const result = calculateSM2(quality, ef, iv, rp);
    const wasMastered = rp >= 5 && ef >= 2.5;
    const nowMastered = result.repetitions >= 5 && result.easeFactor >= 2.5;

    setPendingAnswer({
      itemId: card.itemId,
      outcome: cardOutcome,
      quality,
      questionType: "multiple_choice",
      wasSpeedMatch: false,
      newEaseFactor: result.easeFactor,
      newInterval: result.interval,
      newRepetitions: result.repetitions,
      newlyMastered: !wasMastered && nowMastered,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {outcome && (
        <AnswerFeedback
          key={card.itemId}
          outcome={outcome}
          correctMessages={feedbackCorrect}
          wrongMessages={feedbackWrong}
        />
      )}
      <div className="rounded-lg bg-paper-2 mx-4 mt-8 p-6 shadow-hard-sm text-center">
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

      <div className="grid grid-cols-1 gap-2 px-4">
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
                  ? "border-acid-green bg-acid-green text-ink"
                  : showWrong
                    ? "border-electric-pink bg-electric-pink text-white"
                    : "border-ink/15 bg-ink/5 text-ink hover:border-ink/30 hover:bg-ink/10"
              }`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-current font-mono text-xs">
                {i + 1}
              </span>
              <span>{opt.text}</span>
            </button>
          );
        })}
      </div>

      {pendingAnswer && (
        <div className="px-4">
          <button
            type="button"
            onClick={() => onAnswer(pendingAnswer)}
            className="w-full cursor-pointer rounded-full bg-orange px-4 py-2.5 font-manrope text-sm font-[800] text-white shadow-hard-red transition hover:opacity-90 active:translate-y-[1px]"
          >
            {continueLabel}
          </button>
        </div>
      )}
    </div>
  );
}

// Deterministic shuffle seed from itemId string
function hashShuffle(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return (h % 2 === 0 ? 1 : -1);
}
