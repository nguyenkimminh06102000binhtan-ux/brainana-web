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
  showRomanization?: boolean;
  showCustomAttributes?: boolean;
  hiddenCustomAttributeKeys?: string[];
}

export default function MultipleChoiceMode({ card, onAnswer, onReveal, feedbackCorrect, feedbackWrong, continueLabel, showRomanization, showCustomAttributes, hiddenCustomAttributeKeys = [] }: MCModeProps) {
  const startedAt = useRef(Date.now());
  const [selected, setSelected] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<"correct" | "incorrect" | null>(null);
  const [pendingAnswer, setPendingAnswer] = useState<CardAnswer | null>(null);
  const customAttributeEntries = showCustomAttributes && card.customAttributes
    ? Object.entries(card.customAttributes).filter(([key, value]) => value && !hiddenCustomAttributeKeys.includes(key))
    : [];

  const options = useMemo(() => {
    const seen = new Set<string>();
    seen.add(card.backText.trim().toLowerCase());
    const uniqueDistractors = card.distractors
      .slice(0, 3)
      .filter((d) => {
        const key = d.trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    const pool = [card.backText, ...uniqueDistractors];
    // Shuffle deterministically per itemId so re-renders don't reshuffle
    return pool
      .map((text, i) => ({ text, isCorrect: i === 0, originalIndex: i }))
      .sort(() => hashShuffle(card.itemId));
  }, [card.itemId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;
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
          acceptedAnswers={outcome === "incorrect" ? [card.backText, ...card.acceptedAnswers] : undefined}
        />
      )}
      <div className="mx-4 mt-8 rounded-[1.4rem] border-2 border-ink bg-paper-2 p-6 text-center shadow-hard-sm">
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
        <p className="break-words font-fredoka text-xl font-[600] leading-snug text-ink sm:text-3xl">
          {card.frontText}
        </p>
        {showRomanization && card.romanization && (
          <p className="mt-2 font-kalam text-base text-ink-2">{card.romanization}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 px-4 pb-3">
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
              aria-pressed={isSelected}
              aria-label={`${i + 1}. ${opt.text}${showCorrect ? " — correct" : showWrong ? " — incorrect" : ""}`}
              className={`flex cursor-pointer items-center gap-3 rounded-[1rem] border-2 px-4 py-3 text-left font-manrope text-sm font-[700] shadow-hard-sm transition active:translate-y-[1px] disabled:cursor-default ${
                showCorrect
                  ? "border-ink bg-green-soft text-ink"
                  : showWrong
                    ? "border-ink bg-red-soft text-ink"
                    : "border-ink bg-paper text-ink hover:bg-yellow-soft"
              }`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-current font-mono text-xs" aria-hidden="true">
                {showCorrect ? "✓" : showWrong ? "✗" : i + 1}
              </span>
              <span>{opt.text}</span>
            </button>
          );
        })}
      </div>

      {selected !== null && customAttributeEntries.length > 0 && (
        <div className="mx-4 flex flex-col gap-1.5 rounded-[1rem] border-2 border-ink bg-paper-2 px-4 py-3 shadow-hard-sm">
          {customAttributeEntries.map(([k, v]) => (
            <div key={k}>
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">{k}</span>
              <p className="font-manrope text-sm text-ink-2">{v}</p>
            </div>
          ))}
        </div>
      )}

      {pendingAnswer && (
        <div className="px-4">
          <button
            type="button"
            onClick={() => onAnswer(pendingAnswer)}
            className="w-full cursor-pointer rounded-full border-2 border-ink bg-orange px-4 py-2.5 font-manrope text-sm font-[800] text-on-bright shadow-hard-red transition hover:opacity-90 active:translate-y-[1px]"
          >
            {continueLabel}
          </button>
        </div>
      )}
    </div>
  );
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

// Deterministic shuffle seed from itemId string
function hashShuffle(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return (h % 2 === 0 ? 1 : -1);
}
