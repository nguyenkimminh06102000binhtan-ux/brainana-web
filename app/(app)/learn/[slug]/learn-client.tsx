"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { saveLearnProgress } from "./actions";
import ChatMessage from "./chat-message";
import MathToolbar from "./math-toolbar";
import { t } from "@/utils/t";
import type { Locale } from "@/utils/i18n";

export type LearnCard = {
  id: string;
  front: string;
  back: string;
  romanization: string | null;
  acceptedAnswers: string[];
};

export type LearnSection = {
  id: string;
  title: string;
  cards: LearnCard[];
};

type Message = {
  role: "user" | "assistant";
  content: string;
  display: string;
};

type EvalResult = { itemId: string; correct: boolean };

const EVAL_RE = /%%EVAL:[^%]+%%\n?/g;
const EVAL_PARSE_RE = /%%EVAL:([^:]+):(correct|incorrect)%%/g;

function stripEvals(text: string): string {
  return text.replace(EVAL_RE, "").trim();
}

function parseEvals(text: string): EvalResult[] {
  const results: EvalResult[] = [];
  const re = new RegExp(EVAL_PARSE_RE.source, "g");
  let m;
  while ((m = re.exec(text)) !== null) {
    results.push({ itemId: m[1], correct: m[2] === "correct" });
  }
  return results;
}

interface Props {
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  sourceLanguage: string | null;
  targetLanguage: string | null;
  category: string | null;
  level: string | null;
  sections: LearnSection[];
  labels: Locale["learn"];
}

export default function LearnClient({
  courseId,
  courseSlug,
  courseTitle,
  sourceLanguage,
  targetLanguage,
  category,
  level,
  sections,
  labels,
}: Props) {
  const [stage, setStage] = useState<"setup" | "chat" | "done">("setup");
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<string>>(new Set());
  const [difficulty, setDifficulty] = useState<string>(level ?? "any");
  const [trackProgress, setTrackProgress] = useState(false);
  const [sessionCards, setSessionCards] = useState<LearnCard[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [evals, setEvals] = useState<EvalResult[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const allCards = sections.flatMap((s) =>
    selectedSectionIds.size === 0 || selectedSectionIds.has(s.id) ? s.cards : [],
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamResponse = useCallback(
    async (history: Message[], cards: LearnCard[]) => {
      setIsStreaming(true);

      const apiMessages =
        history.length > 0
          ? history.map((m) => ({ role: m.role, content: m.content }))
          : [];

      const res = await fetch("/api/learn-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          cards,
          courseLanguages: { source: sourceLanguage, target: targetLanguage },
          category,
          level: difficulty,
        }),
      });

      if (!res.ok || !res.body) {
        setIsStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", display: "" },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        const display = stripEvals(fullText);
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") {
            next[next.length - 1] = { ...last, content: fullText, display };
          }
          return next;
        });
      }

      const newEvals = parseEvals(fullText);
      if (newEvals.length > 0) {
        setEvals((prev) => [...prev, ...newEvals]);
      }

      setIsStreaming(false);
      inputRef.current?.focus();
    },
    [sourceLanguage, targetLanguage],
  );

  async function handleStart() {
    const cards = sections.flatMap((s) =>
      selectedSectionIds.size === 0 || selectedSectionIds.has(s.id) ? s.cards : [],
    );
    setSessionCards(cards);
    setMessages([]);
    setEvals([]);
    setStage("chat");
    await streamResponse([], cards);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    const userMsg: Message = { role: "user", content: text, display: text };
    const history = [...messages, userMsg];
    setMessages(history);
    await streamResponse(history, sessionCards);
  }

  async function handleEnd() {
    if (trackProgress && evals.length > 0) {
      setIsSaving(true);
      try {
        await saveLearnProgress(courseId, evals);
      } finally {
        setIsSaving(false);
      }
    }
    setStage("done");
  }

  function insertSymbol(sym: string) {
    const el = inputRef.current;
    if (!el) return;
    const start = el.selectionStart ?? input.length;
    const end = el.selectionEnd ?? input.length;
    const next = input.slice(0, start) + sym + input.slice(end);
    setInput(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + sym.length, start + sym.length);
    });
  }

  function toggleSection(id: string) {
    setSelectedSectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Setup ────────────────────────────────────────────────────────────────
  if (stage === "setup") {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="mb-8 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-3">{labels.aiTutor}</p>
          <h1 className="mt-1 font-fredoka text-3xl font-[600] text-ink">{courseTitle}</h1>
        </div>

        <div className="flex flex-col gap-6 rounded-lg bg-paper-2 p-6 shadow-hard">
          {/* Section picker */}
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-3">
              {labels.whichSections}
            </p>
            <button
              type="button"
              onClick={() => setSelectedSectionIds(new Set())}
              className={`mb-2 w-full rounded-lg border-2 px-4 py-3 text-left font-manrope text-sm font-[700] transition ${
                selectedSectionIds.size === 0
                  ? "border-orange bg-orange text-on-bright"
                  : "border-ink/10 bg-paper text-ink-2 hover:border-ink/30"
              }`}
            >
              {t(labels.allSections, { count: allCards.length })}
            </button>
            {sections.map((s) => {
              const active = selectedSectionIds.has(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSection(s.id)}
                  className={`mb-2 w-full rounded-lg border-2 px-4 py-3 text-left font-manrope text-sm font-[700] transition ${
                    active
                      ? "border-orange bg-orange text-on-bright"
                      : "border-ink/10 bg-paper text-ink-2 hover:border-ink/30"
                  }`}
                >
                  {s.title || labels.untitledSection} — {s.cards.length} cards
                </button>
              );
            })}
          </div>

          {/* Difficulty selector */}
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-3">{labels.difficulty}</p>
            <div className="flex flex-col gap-2">
              {(
                [
                  { value: "beginner",     label: labels.beginnerLabel,     note: labels.beginnerNote },
                  { value: "intermediate", label: labels.intermediateLabel,  note: labels.intermediateNote },
                  { value: "advanced",     label: labels.advancedLabel,      note: labels.advancedNote },
                  { value: "any",          label: labels.anyLabel,           note: labels.anyNote },
                ] as { value: string; label: string; note: string }[]
              ).map(({ value, label, note }) => {
                const active = difficulty === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDifficulty(value)}
                    className={`flex items-start gap-3 rounded-lg border-2 px-4 py-3 text-left transition ${
                      active
                        ? "border-orange bg-orange text-on-bright"
                        : "border-ink/10 bg-paper text-ink-2 hover:border-ink/30"
                    }`}
                  >
                    <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${active ? "border-on-bright" : "border-ink/30"}`}>
                      {active && <span className="h-2 w-2 rounded-full bg-on-bright" />}
                    </span>
                    <span>
                      <span className="block font-manrope text-sm font-[700]">{label}</span>
                      <span className={`block font-manrope text-xs ${active ? "text-on-bright/80" : "text-ink-3"}`}>{note}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Track progress toggle */}
          <div className="flex items-center justify-between">
            <span className="font-manrope text-sm text-ink-2">{labels.trackProgress}</span>
            <button
              type="button"
              role="switch"
              aria-checked={trackProgress}
              onClick={() => setTrackProgress((v) => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                trackProgress ? "bg-orange" : "bg-ink/20"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-hard-sm transition-transform ${
                  trackProgress ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleStart}
              disabled={allCards.length === 0}
              className="w-full cursor-pointer rounded-full bg-orange px-4 py-3 font-manrope text-sm font-[800] text-on-bright shadow-hard-red transition hover:opacity-90 active:translate-y-[1px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-40"
            >
              {labels.startSession}
            </button>
            <Link
              href={`/c/${courseSlug}`}
              className="w-full rounded-full border-2 border-ink/20 px-4 py-3 text-center font-manrope text-sm font-[700] text-ink-2 transition hover:border-ink/30 hover:text-ink"
            >
              {labels.backToCourse}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Done ─────────────────────────────────────────────────────────────────
  if (stage === "done") {
    const correct = evals.filter((e) => e.correct).length;
    const total = evals.length;

    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="mb-4 text-5xl">🎉</p>
        <h2 className="font-fredoka text-3xl font-[600] text-ink">{labels.sessionComplete}</h2>
        {total > 0 && (
          <p className="mt-2 font-manrope text-sm text-ink-2">
            {t(labels.score, { correct, total })}
          </p>
        )}
        <div className="mx-auto mt-8 flex max-w-xs flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              setStage("setup");
              setMessages([]);
              setEvals([]);
            }}
            className="w-full rounded-full bg-orange px-4 py-3 font-manrope text-sm font-[800] text-on-bright shadow-hard-red transition hover:opacity-90 active:translate-y-[1px] active:shadow-none"
          >
            {labels.studyAgain}
          </button>
          <Link
            href={`/c/${courseSlug}`}
            className="w-full rounded-full border-2 border-ink/20 px-4 py-3 text-center font-manrope text-sm font-[700] text-ink-2 transition hover:border-ink/30 hover:text-ink"
          >
            {labels.backToCourse}
          </Link>
        </div>
      </div>
    );
  }

  // ── Chat ─────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-2xl flex-col px-4 py-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-3">{labels.aiTutor}</p>
          <h2 className="font-fredoka text-xl font-[600] text-ink">{courseTitle}</h2>
        </div>
        <button
          type="button"
          onClick={handleEnd}
          disabled={isSaving}
          className="rounded-full border-2 border-ink/20 px-4 py-2 font-manrope text-sm font-[700] text-ink-2 transition hover:border-ink/30 hover:text-ink disabled:opacity-50"
        >
          {isSaving ? labels.saving : labels.endSession}
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto pb-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 font-manrope text-sm leading-relaxed ${
                m.role === "user"
                  ? "rounded-br-sm bg-orange text-on-bright"
                  : "rounded-bl-sm bg-paper-2 text-ink shadow-hard-sm"
              }`}
            >
              {m.display
                ? <ChatMessage role={m.role} content={m.display} />
                : <span className="animate-pulse text-ink-3">●●●</span>
              }
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="pt-2">
      <MathToolbar onInsert={insertSymbol} />
      <div className="flex gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={isStreaming}
          placeholder={labels.inputPlaceholder}
          rows={1}
          className="flex-1 resize-none rounded-2xl bg-paper-2 px-4 py-3 font-manrope text-sm text-ink shadow-hard-sm outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-ink disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isStreaming || !input.trim()}
          className="rounded-full bg-orange px-5 py-3 font-manrope text-sm font-[800] text-on-bright shadow-hard-red transition hover:opacity-90 active:translate-y-[1px] active:shadow-none disabled:opacity-40"
        >
          {labels.send}
        </button>
      </div>
      </div>
    </div>
  );
}
