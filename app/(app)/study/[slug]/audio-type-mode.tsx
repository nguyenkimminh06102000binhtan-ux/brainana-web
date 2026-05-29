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
  wrong: string;
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
  labels: AudioTypeModeLabels;
}

export default function AudioTypeMode({ card, onAnswer, labels }: AudioTypeModeProps) {
  if (!card.frontAudioUrl) {
    return (
      <TypeAnswerMode
        card={card}
        onAnswer={(a) => onAnswer({ ...a, questionType: "audio_type" })}
        showNoAudioNotice
        labels={labels}
      />
    );
  }

  return <AudioTypePlayer card={card} onAnswer={onAnswer} labels={labels} />;
}

function AudioTypePlayer({ card, onAnswer, labels }: { card: StudyCard; onAnswer: (a: CardAnswer) => void; labels: AudioTypeModeLabels }) {
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

  useEffect(() => {
    const audio = new Audio(card.frontAudioUrl!);
    audioRef.current = audio;
    audio.onplay = () => setPlaying(true);
    audio.onended = () => setPlaying(false);
    audio.play().catch(() => {});
    startedAt.current = Date.now();
    setValue("");
    setAttempts(0);
    setShowFirstLetter(false);
    setSubmitted(null);
    setTimeout(() => inputRef.current?.focus(), 200);
    return () => { audio.pause(); };
  }, [card.itemId]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const autoSkip = setTimeout(() => advance(), 3000);
    // Delay before accepting Enter to advance — prevents key-repeat from
    // immediately skipping past the feedback screen.
    let canAdvance = false;
    const timer = setTimeout(() => { canAdvance = true; }, 600);
    function onKey(e: KeyboardEvent) {
      if (canAdvance && e.key === "Enter") advance();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(autoSkip);
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
          className={`flex h-24 w-24 cursor-pointer items-center justify-center rounded-full border-4 border-orange text-3xl shadow-hard-red transition active:scale-95 ${playing ? "bg-orange text-white" : "bg-ink/5 text-orange hover:bg-orange/10"}`}
        >
          {playing ? "◼" : "▶"}
        </button>
        <button
          type="button"
          onClick={toggleSpeed}
          className={`rounded-full border-2 px-3 py-1 font-mono text-xs transition ${isSlowSpeed ? "border-orange bg-orange/10 text-orange" : "border-ink/20 text-ink-3 hover:border-ink/40"}`}
        >
          0.75×
        </button>
      </div>

      {/* Hint chips */}
      <div className="flex gap-2">
        <span className="rounded-full border-2 border-ink/10 px-3 py-1 font-mono text-xs text-ink-2">
          {t(labels.letters, { count: card.backText.length })}
        </span>
        {showFirstLetter && (
          <span className="rounded-full border-2 border-orange/40 px-3 py-1 font-mono text-xs text-orange">
            {t(labels.startsWith, { letter: card.backText[0] ?? "" })}
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
          className={`w-full rounded-sm border-2 px-4 py-3 font-manrope text-base text-ink focus:outline-none disabled:opacity-70 ${
            submitted
              ? submitted.correct ? "border-acid-green bg-acid-green/20" : "border-electric-pink bg-electric-pink/20"
              : "border-ink/20 bg-ink/5 focus:border-orange"
          }`}
        />
        {submitted && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-lg">{submitted.correct ? "✓" : "✗"}</span>
            <span className="font-manrope text-sm text-ink-2">
              {submitted.correct ? labels.correct : t(labels.wrong, { answer: card.backText })}
            </span>
          </div>
        )}
        <div className="mt-3">
          {!submitted ? (
            <button
              type="button"
              onClick={submit}
              className="w-full cursor-pointer rounded-full bg-orange px-4 py-2.5 font-manrope text-sm font-[800] text-white shadow-hard-red transition hover:opacity-90 active:translate-y-[1px]"
            >
              {labels.submit}
            </button>
          ) : (
            <button
              type="button"
              onClick={advance}
              className="w-full cursor-pointer rounded-full bg-ink px-4 py-2.5 font-manrope text-sm font-[800] text-white transition hover:opacity-80 active:translate-y-[1px]"
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
