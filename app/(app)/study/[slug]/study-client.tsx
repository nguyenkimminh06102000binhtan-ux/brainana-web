"use client";

import { useState } from "react";
import Link from "next/link";
import { fetchStudyCards } from "./actions";
import SessionView from "./session-view";
import ResultsScreen from "./results-screen";
import type { QType, StudyCard, SessionConfig, SessionStats } from "./types";

type Stage = "setup" | "loading" | "session" | "results";

interface StudyClientProps {
  userId: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  reviewDue: number;
  newCards: number;
  totalCount: number;
  preferredTypes: QType[];
  hasAudio: boolean;
}

const QUESTION_OPTIONS: { value: QType; label: string; icon: string }[] = [
  { value: "flashcard",       label: "Flashcard",       icon: "🃏" },
  { value: "multiple_choice", label: "Multiple choice", icon: "☑️" },
  { value: "audio_type",      label: "Audio type",      icon: "🎧" },
  { value: "speed_match",     label: "Speed match",     icon: "⚡" },
  { value: "type_answer",     label: "Type answer",     icon: "⌨️" },
];

export default function StudyClient({
  userId,
  courseId,
  courseTitle,
  courseSlug,
  reviewDue,
  newCards,
  totalCount,
  preferredTypes,
  hasAudio,
}: StudyClientProps) {
  const available = reviewDue + newCards;
  const [stage, setStage] = useState<Stage>("setup");
  const [sessionCards, setSessionCards] = useState<StudyCard[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [config, setConfig] = useState<SessionConfig>({
    count: available > 0 ? Math.min(10, available) : 0,
    types: preferredTypes,
  });

  async function handleStart() {
    setStage("loading");
    try {
      const cards = await fetchStudyCards(courseId, config.count, config.types);
      setSessionCards(cards);
      setStage("session");
    } catch {
      setStage("setup");
    }
  }

  function handleSessionComplete(stats: SessionStats) {
    setSessionStats(stats);
    setStage("results");
  }

  function handleExit() {
    setStage("setup");
  }

  function handleStudyMore() {
    setSessionCards([]);
    setSessionStats(null);
    setStage("setup");
  }

  if (stage === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="font-manrope text-sm text-ink-2">Preparing your cards…</p>
      </div>
    );
  }

  if (stage === "session") {
    return (
      <SessionView
        userId={userId}
        courseId={courseId}
        courseTitle={courseTitle}
        courseSlug={courseSlug}
        cards={sessionCards}
        onComplete={handleSessionComplete}
        onExit={handleExit}
      />
    );
  }

  if (stage === "results" && sessionStats) {
    return (
      <ResultsScreen
        courseSlug={courseSlug}
        stats={sessionStats}
        totalCards={sessionCards.length}
        onStudyMore={handleStudyMore}
      />
    );
  }

  // ─── Setup screen ─────────────────────────────────────────────────────────

  function adjustCount(delta: number) {
    setConfig((prev) => ({
      ...prev,
      count: Math.min(available, Math.max(1, prev.count + delta)),
    }));
  }

  function handleCountInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = Number(e.target.value);
    if (!Number.isNaN(val)) {
      setConfig((prev) => ({ ...prev, count: Math.min(available, Math.max(1, val)) }));
    }
  }

  function toggleType(type: QType) {
    setConfig((prev) => {
      const next = prev.types.includes(type)
        ? prev.types.filter((t) => t !== type)
        : [...prev.types, type];
      return { ...prev, types: next.length === 0 ? prev.types : next };
    });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      {/* Header */}
      <div className="mb-8 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-3">All sections</p>
        <h1 className="mt-1 font-fredoka text-3xl font-[600] text-ink">{courseTitle}</h1>
      </div>

      <div className="rounded-lg bg-paper-2 p-6 shadow-hard">
        {/* Speech bubble */}
        <div className="relative mb-8">
          <div className="rounded-md bg-paper px-5 py-4 shadow-hard-sm">
            <p className="font-kalam text-xl leading-snug text-ink">
              How many words do you want to eat today?
            </p>
          </div>
          <div className="absolute -bottom-[11px] left-8 h-0 w-0 border-l-[11px] border-r-[11px] border-t-[11px] border-l-transparent border-r-transparent border-t-paper" />
        </div>

        {/* Count input */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-sm border-2 border-ink/20 bg-ink/5">
              <button
                type="button"
                onClick={() => adjustCount(-1)}
                disabled={config.count <= 1 || available === 0}
                className="px-3 py-2 font-fredoka text-2xl text-ink-2 transition hover:text-ink disabled:opacity-30"
                aria-label="Decrease"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                max={available}
                value={config.count}
                onChange={handleCountInput}
                disabled={available === 0}
                className="w-16 bg-transparent py-2 text-center font-fredoka text-3xl font-[600] text-ink focus:outline-none disabled:opacity-40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={() => adjustCount(1)}
                disabled={config.count >= available || available === 0}
                className="px-3 py-2 font-fredoka text-2xl text-ink-2 transition hover:text-ink disabled:opacity-30"
                aria-label="Increase"
              >
                +
              </button>
            </div>
            <p className="font-manrope text-sm text-ink-2">
              <span className="font-[700] text-ink">{reviewDue}</span> due for review
              {newCards > 0 && (
                <>
                  <span className="mx-1.5 text-ink-3">·</span>
                  <span className="font-[700] text-ink">{newCards}</span> new
                </>
              )}
              <span className="mx-1.5 text-ink-3">·</span>
              <span className="font-[700] text-ink">{totalCount}</span> total
            </p>
          </div>
          {available === 0 && (
            <p className="mt-2 font-manrope text-xs text-ink-3">
              All caught up! No cards are due for review.
            </p>
          )}
        </div>

        {/* Question types */}
        <div className="mb-6">
          <p className="mb-2 font-manrope text-xs font-[700] uppercase tracking-wider text-ink-3">
            Question types
          </p>
          <div className="grid grid-cols-2 gap-2">
            {QUESTION_OPTIONS.filter((o) => o.value !== "audio_type" || hasAudio).map(({ value, label, icon }) => {
              const active = config.types.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleType(value)}
                  className={`flex cursor-pointer items-center gap-2 rounded-sm border-2 px-3 py-2.5 font-manrope text-sm font-[700] transition active:translate-y-[1px] ${
                    active
                      ? "border-orange bg-orange text-white"
                      : "border-ink/20 bg-ink/5 text-ink-2 hover:border-ink/30 hover:bg-ink/10"
                  }`}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleStart}
            disabled={available === 0}
            className="w-full cursor-pointer rounded-full bg-orange px-4 py-3 font-manrope text-sm font-[800] text-white shadow-hard-red transition hover:opacity-90 active:translate-y-[1px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-40"
          >
            Start studying →
          </button>
          <Link
            href={`/c/${courseSlug}`}
            className="w-full rounded-full border-2 border-ink/20 px-4 py-3 text-center font-manrope text-sm font-[700] text-ink-2 transition hover:border-ink/30 hover:text-ink"
          >
            ← Back to course
          </Link>
        </div>
      </div>
    </div>
  );
}
