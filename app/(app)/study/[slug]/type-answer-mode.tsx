"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { calculateSM2, getQualityScore } from "@/utils/sm2";
import { t } from "@/utils/t";
import { playCorrectSound, playWrongSound } from "@/utils/answer-audio";
import AnswerFeedback from "./answer-feedback";
import MathToolbar from "@/app/(app)/_components/math-toolbar";
import type { StudyCard, CardAnswer, Outcome } from "./types";

interface TypeAnswerModeProps {
  card: StudyCard;
  onAnswer: (answer: CardAnswer) => void;
  onReveal?: () => void;
  showNoAudioNotice?: boolean;
  showRomanization?: boolean;
  showCustomAttributes?: boolean;
  hiddenCustomAttributeKeys?: string[];
  labels: {
    noAudio: string;
    letters: string;
    startsWith: string;
    placeholder: string;
    playAudio: string;
    correct: string;
    submit: string;
    continueBtn: string;
    feedbackCorrect: string[];
    feedbackWrong: string[];
  };
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i]![j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1]![j - 1]!
          : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
  return dp[m]![n]!;
}

function isClose(input: string, answer: string): boolean {
  const norm = (s: string) =>
    s.toLowerCase().trim().normalize("NFC").replace(/[?!.,;]/g, "");
  const a = norm(input);
  const b = norm(answer);
  if (a === b) return true;
  // Scale tolerance ~1 per 6 chars so longer answers are more forgiving
  const threshold = Math.max(1, Math.round(Math.max(a.length, b.length) / 6));
  return levenshtein(a, b) <= threshold;
}

export default function TypeAnswerMode({
  card,
  onAnswer,
  onReveal,
  showNoAudioNotice,
  showRomanization,
  showCustomAttributes,
  hiddenCustomAttributeKeys = [],
  labels,
}: TypeAnswerModeProps) {
  const startedAt = useRef(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  function insertSymbol(sym: string) {
    const el = inputRef.current;
    if (!el) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    setValue(value.slice(0, start) + sym + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + sym.length, start + sym.length);
    });
  }
  const [value, setValue] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [showFirstLetter, setShowFirstLetter] = useState(false);
  const [submitted, setSubmitted] = useState<{ correct: boolean; hesitant: boolean } | null>(null);
  const [isComposing, setIsComposing] = useState(false);

  const answers = [card.backText, ...card.acceptedAnswers];
  const customAttributeEntries = showCustomAttributes && card.customAttributes
    ? Object.entries(card.customAttributes).filter(([key, value]) => value && !hiddenCustomAttributeKeys.includes(key))
    : [];
  const letterCount = card.backText.length;
  const firstLetter = card.backText[0] ?? "";

  useEffect(() => {
    startedAt.current = Date.now();
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(focusTimer);
  }, []);

  useEffect(() => {
    if (!submitted) return;
    // Delay before accepting Enter to advance — prevents key-repeat from
    // immediately skipping past the feedback screen.
    let canAdvance = false;
    const timer = setTimeout(() => { canAdvance = true; }, 600);
    function onKey(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;
      if (canAdvance && e.key === "Enter") advance();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [submitted]); // eslint-disable-line react-hooks/exhaustive-deps

  function submit() {
    if (submitted) {
      advance();
      return;
    }
    if (!value.trim()) return;

    const correct = answers.some((a) => isClose(value, a));
    if (!correct && attempts === 0) {
      setAttempts(1);
      setShowFirstLetter(true);
      return;
    }

    const hesitant =
      !correct ? false : attempts > 0 || Date.now() - startedAt.current > 10_000;

    if (correct) playCorrectSound();
    else playWrongSound();

    setSubmitted({ correct, hesitant });
    onReveal?.();
  }

  function advance() {
    if (!submitted) return;
    const outcome: Outcome = submitted.correct
      ? submitted.hesitant
        ? "hesitant"
        : "correct"
      : "incorrect";
    const quality = getQualityScore(outcome, "type_answer");
    const ef = card.progress?.easeFactor ?? 2.5;
    const iv = card.progress?.intervalDays ?? 1;
    const rp = card.progress?.repetitions ?? 0;
    const result = calculateSM2(quality, ef, iv, rp);
    onAnswer({
      itemId: card.itemId,
      outcome,
      quality,
      questionType: "type_answer",
      wasSpeedMatch: false,
      newEaseFactor: result.easeFactor,
      newInterval: result.interval,
      newRepetitions: result.repetitions,
      newlyMastered: !( rp >= 5 && ef >= 2.5) && result.repetitions >= 5 && result.easeFactor >= 2.5,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {submitted && (
        <AnswerFeedback
          key={card.itemId}
          outcome={submitted.correct ? "correct" : "incorrect"}
          correctMessages={labels.feedbackCorrect}
          wrongMessages={labels.feedbackWrong}
          acceptedAnswers={submitted.correct ? undefined : answers}
        />
      )}
      <div className="flex flex-col gap-6 px-4 py-8">
        {showNoAudioNotice && (
        <p className="rounded-sm bg-yellow-soft px-3 py-2 text-center font-manrope text-xs text-ink-2">
          {labels.noAudio}
        </p>
      )}

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
        <p className="break-words font-fredoka text-xl font-[600] leading-snug text-ink sm:text-3xl">
          {card.frontText}
        </p>
        {card.frontAudioUrl && (
          <button
            type="button"
            onClick={() => new Audio(card.frontAudioUrl!).play()}
            className="mt-3 font-manrope text-xs text-ink-3 underline hover:text-ink"
          >
            {labels.playAudio}
          </button>
        )}
      </div>

      {/* Hint chips */}
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border-2 border-ink/10 px-3 py-1 font-mono text-xs text-ink-2">
          {t(labels.letters, { count: letterCount })}
        </span>
        {showFirstLetter && (
          <span className="rounded-full border-2 border-orange/40 px-3 py-1 font-mono text-xs text-orange-text">
            {t(labels.startsWith, { letter: firstLetter })}
          </span>
        )}
        {attempts > 0 && showRomanization && card.romanization && (
          <span className="rounded-full border-2 border-ink/20 px-3 py-1 font-kalam text-sm text-ink-2">
            {card.romanization}
          </span>
        )}
      </div>

      {/* Input */}
      <div>
        <MathToolbar onInsert={insertSymbol} />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => !submitted && setValue(e.target.value)}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          onKeyDown={(e) => e.key === "Enter" && !isComposing && submit()}
          disabled={!!submitted}
          placeholder={labels.placeholder}
          className={`w-full rounded-sm border-2 px-4 py-3 font-manrope text-base text-ink focus:outline-none disabled:opacity-70 ${
            submitted
              ? submitted.correct
                ? "border-acid-green bg-acid-green text-on-bright"
                : "border-electric-pink bg-electric-pink text-on-bright"
              : "border-ink/20 bg-ink/5 focus:border-orange"
          }`}
        />

        {submitted && (
          <div className="mt-2 flex flex-col gap-2">
            {submitted.correct ? (
              <span className="font-manrope text-sm text-ink-2">{labels.correct}</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {answers.map((ans, i) => (
                  <span key={i} className="rounded-full border-2 border-electric-pink/40 px-3 py-0.5 font-manrope text-sm text-ink">
                    {ans}
                  </span>
                ))}
              </div>
            )}
            {customAttributeEntries.length > 0 && (
              <div className="flex flex-col gap-1.5 rounded-md bg-paper-2 px-3 py-2.5">
                {customAttributeEntries.map(([k, v]) => (
                  <div key={k}>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">{k}</span>
                    <p className="font-manrope text-sm text-ink-2">{v}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-3 flex gap-2">
          {!submitted ? (
            <button
              type="button"
              onClick={submit}
              className="flex-1 cursor-pointer rounded-full bg-orange px-4 py-2.5 font-manrope text-sm font-[800] text-on-bright shadow-hard-red transition hover:opacity-90 active:translate-y-[1px]"
            >
              {labels.submit}
            </button>
          ) : (
            <button
              type="button"
              onClick={advance}
              className="flex-1 cursor-pointer rounded-full bg-orange px-4 py-2.5 font-manrope text-sm font-[800] text-on-bright shadow-hard-red transition hover:opacity-90 active:translate-y-[1px]"
            >
              {labels.continueBtn}
            </button>
          )}
        </div>
      </div>

      </div>
    </div>
  );
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}
