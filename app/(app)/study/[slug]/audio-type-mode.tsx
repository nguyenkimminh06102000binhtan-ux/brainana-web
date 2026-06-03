"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { calculateSM2, getQualityScore } from "@/utils/sm2";
import { t } from "@/utils/t";
import { playCorrectSound, playWrongSound } from "@/utils/answer-audio";
import AnswerFeedback from "./answer-feedback";
import TypeAnswerMode from "./type-answer-mode";
import type { StudyCard, CardAnswer } from "./types";

interface AudioTypeModeLabels {
  letters: string;
  startsWith: string;
  placeholder: string;
  correct: string;
  submit: string;
  continueBtn: string;
  noAudio: string;
  playAudio: string;
  feedbackCorrect: string[];
  feedbackWrong: string[];
}

interface AudioTypeModeProps {
  card: StudyCard;
  onAnswer: (answer: CardAnswer) => void;
  onReveal?: () => void;
  labels: AudioTypeModeLabels;
  showFallbackNotice: boolean;
  showCustomAttributes?: boolean;
  hiddenCustomAttributeKeys?: string[];
}

export default function AudioTypeMode({ card, onAnswer, onReveal, labels, showFallbackNotice, showCustomAttributes, hiddenCustomAttributeKeys = [] }: AudioTypeModeProps) {
  if (!card.frontAudioUrl) {
    return (
      <TypeAnswerMode
        card={card}
        onAnswer={(a) => onAnswer({ ...a, questionType: "audio_type" })}
        onReveal={onReveal}
        showNoAudioNotice={showFallbackNotice}
        showCustomAttributes={showCustomAttributes}
        hiddenCustomAttributeKeys={hiddenCustomAttributeKeys}
        labels={labels}
      />
    );
  }

  return <AudioTypePlayer card={card} onAnswer={onAnswer} onReveal={onReveal} labels={labels} showCustomAttributes={showCustomAttributes} hiddenCustomAttributeKeys={hiddenCustomAttributeKeys} />;
}

function AudioTypePlayer({ card, onAnswer, onReveal, labels, showCustomAttributes, hiddenCustomAttributeKeys }: { card: StudyCard; onAnswer: (a: CardAnswer) => void; onReveal?: () => void; labels: AudioTypeModeLabels; showCustomAttributes?: boolean; hiddenCustomAttributeKeys: string[] }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedAt = useRef(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSlowSpeed, setIsSlowSpeed] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showFirstLetter, setShowFirstLetter] = useState(false);
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState<{ correct: boolean; hesitant: boolean } | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [playing, setPlaying] = useState(false);

  const answers = [card.backText, ...card.acceptedAnswers];
  const customAttributeEntries = showCustomAttributes && card.customAttributes
    ? Object.entries(card.customAttributes).filter(([key, value]) => value && !hiddenCustomAttributeKeys.includes(key))
    : [];

  useEffect(() => {
    const audio = new Audio(card.frontAudioUrl!);
    audioRef.current = audio;
    audio.onplay = () => setPlaying(true);
    audio.onended = () => setPlaying(false);
    audio.play().catch(() => {});
    startedAt.current = Date.now();
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 200);
    return () => {
      clearTimeout(focusTimer);
      audio.pause();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function replay() {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.playbackRate = isSlowSpeed ? 0.75 : 1;
      audioRef.current.play();
    }
  }

  function toggleSpeed() {
    const newSlow = !isSlowSpeed;
    setIsSlowSpeed(newSlow);
    if (audioRef.current) audioRef.current.playbackRate = newSlow ? 0.75 : 1;
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
    const threshold = Math.max(1, Math.round(Math.max(a.length, b.length) / 6));
    return levenshtein(a, b) <= threshold;
  }

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
    if (submitted) { advance(); return; }
    if (!value.trim()) return;
    const correct = answers.some((a) => isClose(value, a));
    if (!correct && attempts === 0) {
      setAttempts(1);
      setShowFirstLetter(true);
      return;
    }
    const hesitant = !correct ? false : attempts > 0 || Date.now() - startedAt.current > 10_000;

    if (correct) playCorrectSound();
    else playWrongSound();

    setSubmitted({ correct, hesitant });
    onReveal?.();
  }

  function advance() {
    if (!submitted) return;
    const outcome = submitted.correct ? (submitted.hesitant ? "hesitant" : "correct") : "incorrect";
    const quality = getQualityScore(outcome, "audio_type");
    const ef = card.progress?.easeFactor ?? 2.5;
    const iv = card.progress?.intervalDays ?? 1;
    const rp = card.progress?.repetitions ?? 0;
    const result = calculateSM2(quality, ef, iv, rp);
    onAnswer({
      itemId: card.itemId,
      outcome,
      quality,
      questionType: "audio_type",
      wasSpeedMatch: false,
      newEaseFactor: result.easeFactor,
      newInterval: result.interval,
      newRepetitions: result.repetitions,
      newlyMastered: !(rp >= 5 && ef >= 2.5) && result.repetitions >= 5 && result.easeFactor >= 2.5,
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
        />
      )}
      <div className="flex flex-col items-center gap-6 px-4 py-8">
      {card.imageUrl && (
        <div className="relative h-32 w-full overflow-hidden rounded-md">
          <Image
            src={card.imageUrl}
            alt={card.frontText}
            fill
            className="object-contain"
            sizes="(max-width: 448px) 100vw, 448px"
          />
        </div>
      )}
      {/* Play button */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={replay}
          aria-label="Play audio"
          className={`flex h-24 w-24 cursor-pointer items-center justify-center rounded-full border-4 border-ink text-3xl shadow-hard-red transition active:scale-95 ${playing ? "bg-orange text-on-bright" : "bg-yellow-soft text-orange-text hover:bg-orange/10"}`}
        >
          {playing ? "◼" : "▶"}
        </button>
        <button
          type="button"
          onClick={toggleSpeed}
          className={`rounded-full border-2 px-3 py-1 font-mono text-xs shadow-hard-sm transition ${isSlowSpeed ? "border-ink bg-yellow-soft text-orange-text" : "border-ink bg-paper text-ink-3 hover:bg-yellow-soft"}`}
        >
          0.75×
        </button>
      </div>

      {/* Hint chips */}
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border-2 border-ink bg-paper px-3 py-1 font-mono text-xs text-ink-2 shadow-hard-sm">
          {t(labels.letters, { count: card.backText.length })}
        </span>
        {showFirstLetter && (
          <span className="rounded-full border-2 border-ink bg-yellow-soft px-3 py-1 font-mono text-xs text-orange-text shadow-hard-sm">
            {t(labels.startsWith, { letter: card.backText[0] ?? "" })}
          </span>
        )}
        {card.romanization && (
          <span className="rounded-full border-2 border-ink bg-paper px-3 py-1 font-kalam text-sm text-ink-2 shadow-hard-sm">
            {card.romanization}
          </span>
        )}
      </div>

      {/* Input */}
      <div className="w-full max-w-sm">
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
          className={`w-full rounded-[1rem] border-2 px-4 py-3 font-manrope text-base text-ink shadow-hard-sm focus:outline-none disabled:opacity-70 ${
            submitted
              ? submitted.correct ? "border-ink bg-green-soft text-ink" : "border-ink bg-red-soft text-ink"
              : "border-ink bg-paper focus:border-orange"
          }`}
        />
        {submitted && (
          <div className="mt-2 flex flex-col gap-2">
            {submitted.correct ? (
              <span className="font-manrope text-sm text-ink-2">{labels.correct}</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {answers.map((ans, i) => (
                  <span key={i} className="block max-w-full break-words rounded-[1rem] border-2 border-ink bg-red-soft px-3 py-1.5 font-manrope text-sm leading-relaxed text-ink shadow-hard-sm">
                    {ans}
                  </span>
                ))}
              </div>
            )}
            {customAttributeEntries.length > 0 && (
              <div className="flex flex-col gap-1.5 rounded-[1rem] border-2 border-ink bg-paper-2 px-3 py-2.5 shadow-hard-sm">
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
        <div className="mt-3">
          {!submitted ? (
            <button
              type="button"
              onClick={submit}
              className="w-full cursor-pointer rounded-full border-2 border-ink bg-orange px-4 py-2.5 font-manrope text-sm font-[800] text-on-bright shadow-hard-red transition hover:opacity-90 active:translate-y-[1px]"
            >
              {labels.submit}
            </button>
          ) : (
            <button
              type="button"
              onClick={advance}
              className="w-full cursor-pointer rounded-full border-2 border-ink bg-orange px-4 py-2.5 font-manrope text-sm font-[800] text-on-bright shadow-hard-red transition hover:opacity-90 active:translate-y-[1px]"
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
