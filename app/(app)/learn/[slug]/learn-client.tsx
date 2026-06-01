"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { saveLearnProgress } from "./actions";
import ChatMessage from "./chat-message";
import MathToolbar from "./math-toolbar";
import { t } from "@/utils/t";
import type { Locale } from "@/utils/i18n";
import { showQuotaToast } from "@/components/quota-toast";

export type LearnCard = {
  id: string;
  front: string;
  back: string;
  romanization: string | null;
  acceptedAnswers: string[];
  backAudioUrl?: string | null;
  ignored: boolean;
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
type CardSelectionMode = "quick" | "manual";

const EVAL_RE = /%%EVAL:[^%]+%%\n?/g;
const EVAL_PARSE_RE = /%%EVAL:([^:]+):(correct|incorrect)%%/g;
const AUDIO_MARKER_RE = /%%AUDIO:([^%]+)%%/g;

type MessagePart = { type: "text"; content: string } | { type: "audio"; cardId: string };

function parseMessageParts(text: string): MessagePart[] {
  const parts: MessagePart[] = [];
  let last = 0;
  const re = new RegExp(AUDIO_MARKER_RE.source, "g");
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: "text", content: text.slice(last, m.index) });
    parts.push({ type: "audio", cardId: m[1]! });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", content: text.slice(last) });
  return parts.length > 0 ? parts : [{ type: "text", content: text }];
}

function InlineAudioPlayer({ url, playLabel, playingLabel }: { url: string; playLabel: string; playingLabel: string }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function play() {
    if (!audioRef.current) {
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onplay = () => setPlaying(true);
      audio.onended = () => setPlaying(false);
    }
    audioRef.current.currentTime = 0;
    audioRef.current.play();
  }

  return (
    <button
      type="button"
      onClick={play}
      className={`my-2 flex items-center gap-2 rounded-full border-2 px-4 py-2 font-manrope text-sm font-[700] transition ${
        playing
          ? "border-orange bg-orange text-on-bright"
          : "border-orange/40 bg-orange/10 text-orange-text hover:bg-orange/20"
      }`}
    >
      <span>{playing ? "◼" : "▶"}</span>
      <span>{playing ? playingLabel : playLabel}</span>
    </button>
  );
}
const MAX_CARDS = 50;
const MAX_MESSAGES = 50;
const QUICK_PICK_OPTIONS = [10, 25, 50];

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

function shuffleSample<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
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
  initialSessionsBalance: number;
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
  initialSessionsBalance,
}: Props) {
  const [stage, setStage] = useState<"setup" | "chat" | "done">("setup");
  const [sessionsBalance, setSessionsBalance] = useState(initialSessionsBalance);
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<string>>(new Set());
  const [difficulty, setDifficulty] = useState<string>(level ?? "any");
  const [trackProgress, setTrackProgress] = useState(false);
  const [sessionCards, setSessionCards] = useState<LearnCard[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [evals, setEvals] = useState<EvalResult[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Card selection
  const [cardSelectionMode, setCardSelectionMode] = useState<CardSelectionMode>("quick");
  const [quickPickCount, setQuickPickCount] = useState<number>(25);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [cardSearch, setCardSearch] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Map cardId → resolved audio URL for all cards that have audio
  const audioMap = useMemo(
    () => new Map(
      sections.flatMap((s) => s.cards)
        .filter((c) => c.backAudioUrl)
        .map((c) => [c.id, c.backAudioUrl!]),
    ),
    [sections],
  );

  // Cards from selected sections, excluding ignored (used for quick pick)
  const poolCards = useMemo(
    () =>
      sections.flatMap((s) =>
        selectedSectionIds.size === 0 || selectedSectionIds.has(s.id)
          ? s.cards.filter((c) => !c.ignored)
          : [],
      ),
    [sections, selectedSectionIds],
  );

  // Filtered cards for manual search
  const filteredSections = useMemo(() => {
    const q = cardSearch.trim().toLowerCase();
    if (!q) {
      return sections.filter(
        (s) => selectedSectionIds.size === 0 || selectedSectionIds.has(s.id),
      );
    }
    return sections
      .filter((s) => selectedSectionIds.size === 0 || selectedSectionIds.has(s.id))
      .map((s) => ({
        ...s,
        cards: s.cards.filter(
          (c) =>
            c.front.toLowerCase().includes(q) ||
            c.back.toLowerCase().includes(q),
        ),
      }))
      .filter((s) => s.cards.length > 0);
  }, [sections, selectedSectionIds, cardSearch]);

  // How many are currently manually selected (intersect with pool)
  const poolCardIds = useMemo(() => new Set(poolCards.map((c) => c.id)), [poolCards]);
  const validSelectedIds = useMemo(
    () => new Set([...selectedCardIds].filter((id) => poolCardIds.has(id))),
    [selectedCardIds, poolCardIds],
  );
  const manualCount = validSelectedIds.size;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function buildSessionCards(): LearnCard[] {
    if (cardSelectionMode === "quick") {
      const count = Math.min(quickPickCount, poolCards.length);
      return shuffleSample(poolCards, count);
    }
    // manual: preserve section order
    return poolCards.filter((c) => validSelectedIds.has(c.id)).slice(0, MAX_CARDS);
  }

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
          audioCardIds: cards.filter((c) => c.backAudioUrl).map((c) => c.id),
        }),
      });

      if (!res.ok || !res.body) {
        if (res.status === 402) {
          setSessionsBalance(0);
          setStage("setup");
        }
        setIsStreaming(false);
        return;
      }

      if (apiMessages.length === 0) {
        const remaining = res.headers.get("X-Remaining-Sessions");
        if (remaining !== null) {
          const n = Number(remaining);
          setSessionsBalance(n);
          showQuotaToast("sessions", n);
        }
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      // Add placeholder — shows typing animation until stream completes
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", display: "" },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        // Accumulate silently — no per-chunk re-renders
      }

      // Flush the complete message once
      const display = stripEvals(fullText);
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant") {
          next[next.length - 1] = { ...last, content: fullText, display };
        }
        return next;
      });

      const newEvals = parseEvals(fullText);
      if (newEvals.length > 0) {
        setEvals((prev) => [...prev, ...newEvals]);
      }

      setIsStreaming(false);
      inputRef.current?.focus();
    },
    [sourceLanguage, targetLanguage, difficulty, category],
  );

  async function handleStart() {
    const cards = buildSessionCards();
    if (cards.length === 0) return;
    setSessionCards(cards);
    setMessages([]);
    setEvals([]);
    setStage("chat");
    await streamResponse([], cards);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || isStreaming || messages.length >= MAX_MESSAGES) return;
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

  function toggleCard(id: string) {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (manualCount < MAX_CARDS) {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSectionCards(sectionCards: LearnCard[]) {
    const ids = sectionCards.map((c) => c.id);
    const allSelected = ids.every((id) => validSelectedIds.has(id));
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        ids.forEach((id) => next.delete(id));
      } else {
        for (const id of ids) {
          if (next.size >= MAX_CARDS) break;
          next.add(id);
        }
      }
      return next;
    });
  }

  // Determine if start is disabled
  const canStart =
    cardSelectionMode === "quick"
      ? poolCards.length > 0
      : manualCount > 0;

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
              {t(labels.allSections, { count: poolCards.length })}
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

          {/* Card selection */}
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-3">
              {labels.cardSelectionMode}
            </p>

            {/* Mode toggle */}
            <div className="mb-4 flex rounded-lg border-2 border-ink/10 bg-paper p-1">
              <button
                type="button"
                onClick={() => setCardSelectionMode("quick")}
                className={`flex-1 rounded-md py-2 font-manrope text-sm font-[700] transition ${
                  cardSelectionMode === "quick"
                    ? "bg-orange text-on-bright shadow-hard-sm"
                    : "text-ink-2 hover:text-ink"
                }`}
              >
                {labels.quickPick}
              </button>
              <button
                type="button"
                onClick={() => setCardSelectionMode("manual")}
                className={`flex-1 rounded-md py-2 font-manrope text-sm font-[700] transition ${
                  cardSelectionMode === "manual"
                    ? "bg-orange text-on-bright shadow-hard-sm"
                    : "text-ink-2 hover:text-ink"
                }`}
              >
                {labels.chooseCards}
              </button>
            </div>

            {/* Quick pick */}
            {cardSelectionMode === "quick" && (
              <div className="flex gap-2">
                {QUICK_PICK_OPTIONS.map((n) => {
                  const available = Math.min(n, poolCards.length);
                  const disabled = poolCards.length === 0;
                  const active = quickPickCount === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      disabled={disabled}
                      onClick={() => setQuickPickCount(n)}
                      className={`flex-1 rounded-lg border-2 py-2 font-manrope text-sm font-[700] transition ${
                        active
                          ? "border-orange bg-orange text-on-bright"
                          : "border-ink/10 bg-paper text-ink-2 hover:border-ink/30"
                      } disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      {available < n ? available : n}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Manual pick */}
            {cardSelectionMode === "manual" && (
              <div>
                {/* Counter + search */}
                <div className="mb-3 flex items-center gap-2">
                  <input
                    type="text"
                    value={cardSearch}
                    onChange={(e) => setCardSearch(e.target.value)}
                    placeholder={labels.searchCards}
                    className="flex-1 rounded-lg border-2 border-ink/10 bg-paper px-3 py-2 font-manrope text-sm text-ink outline-none placeholder:text-ink-3 focus:border-ink/30"
                  />
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 font-manrope text-xs font-[700] ${
                      manualCount >= MAX_CARDS
                        ? "bg-orange/20 text-orange"
                        : "bg-ink/10 text-ink-2"
                    }`}
                  >
                    {t(labels.cardsSelected, { count: manualCount })}
                  </span>
                </div>

                {/* Card list */}
                <div className="max-h-64 overflow-y-auto rounded-lg border-2 border-ink/10 bg-paper">
                  {filteredSections.length === 0 ? (
                    <p className="px-4 py-6 text-center font-manrope text-sm text-ink-3">
                      {labels.searchCards}
                    </p>
                  ) : (
                    filteredSections.map((s) => {
                      const sectionSelected = s.cards.every((c) => validSelectedIds.has(c.id));
                      return (
                        <div key={s.id}>
                          {/* Section header */}
                          <button
                            type="button"
                            onClick={() => toggleSectionCards(s.cards)}
                            className="flex w-full items-center justify-between border-b border-ink/5 bg-paper-2 px-4 py-2 text-left hover:bg-paper-2/80"
                          >
                            <span className="font-manrope text-xs font-[700] uppercase tracking-widest text-ink-3">
                              {s.title || labels.untitledSection}
                            </span>
                            <span
                              className={`h-4 w-4 rounded border-2 transition ${
                                sectionSelected
                                  ? "border-orange bg-orange"
                                  : "border-ink/30 bg-paper"
                              }`}
                            >
                              {sectionSelected && (
                                <svg viewBox="0 0 12 12" fill="none" className="h-full w-full p-[2px]">
                                  <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </span>
                          </button>
                          {/* Cards */}
                          {s.cards.map((c) => {
                            const checked = validSelectedIds.has(c.id);
                            const atMax = manualCount >= MAX_CARDS && !checked;
                            return (
                              <button
                                key={c.id}
                                type="button"
                                disabled={atMax}
                                onClick={() => toggleCard(c.id)}
                                className={`flex w-full items-center gap-3 border-b border-ink/5 px-4 py-2.5 text-left last:border-b-0 transition ${
                                  checked ? "bg-orange/5" : "hover:bg-paper-2"
                                } disabled:opacity-40`}
                              >
                                <span
                                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition ${
                                    checked
                                      ? "border-orange bg-orange"
                                      : "border-ink/30 bg-paper"
                                  }`}
                                >
                                  {checked && (
                                    <svg viewBox="0 0 12 12" fill="none" className="h-full w-full p-[2px]">
                                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  )}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-center gap-2">
                                    <span className="truncate font-manrope text-sm font-[600] text-ink">
                                      {c.front}
                                    </span>
                                    {c.ignored && (
                                      <span className="shrink-0 rounded-full bg-ink/10 px-2 py-0.5 font-manrope text-[10px] font-[700] uppercase tracking-wide text-ink-3">
                                        {labels.ignoredLabel}
                                      </span>
                                    )}
                                  </span>
                                  <span className="block truncate font-manrope text-xs text-ink-3">
                                    {c.back}
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </div>

                {manualCount >= MAX_CARDS && (
                  <p className="mt-2 font-manrope text-xs text-orange">
                    {labels.maxCardsNote}
                  </p>
                )}
              </div>
            )}
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
            {sessionsBalance === 0 ? (
              <div className="rounded-lg border-2 border-ink/10 bg-ink/5 px-4 py-3 text-center">
                <p className="font-manrope text-sm font-[700] text-ink">{labels.noSessionsRemaining}</p>
                <p className="mt-0.5 font-manrope text-xs text-ink-3">{labels.upgradeToStart}</p>
                <Link
                  href="/billing/upgrade"
                  className="mt-3 inline-block rounded-full bg-orange px-5 py-2 font-manrope text-sm font-[800] text-on-bright shadow-hard-red transition hover:opacity-90"
                >
                  {labels.viewPlans}
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleStart}
                disabled={!canStart}
                className="w-full cursor-pointer rounded-full bg-orange px-4 py-3 font-manrope text-sm font-[800] text-on-bright shadow-hard-red transition hover:opacity-90 active:translate-y-[1px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-40"
              >
                {labels.startSession}
              </button>
            )}
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
          {sessionsBalance === 0 ? (
            <>
              <p className="font-manrope text-sm text-ink-3">{labels.noSessionsLeft}</p>
              <Link
                href="/billing/upgrade"
                className="w-full rounded-full bg-orange px-4 py-3 text-center font-manrope text-sm font-[800] text-on-bright shadow-hard-red transition hover:opacity-90"
              >
                {labels.viewPlans}
              </Link>
            </>
          ) : (
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
          )}
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
    <div className="mx-auto flex h-[calc(100dvh-4rem)] max-w-2xl flex-col px-4 py-4">
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
              {m.display ? (
                m.role === "assistant"
                  ? parseMessageParts(m.display).map((part, i) =>
                      part.type === "audio"
                        ? audioMap.has(part.cardId)
                          ? <InlineAudioPlayer key={i} url={audioMap.get(part.cardId)!} playLabel={labels.audioPlay} playingLabel={labels.audioPlaying} />
                          : null
                        : <ChatMessage key={i} role="assistant" content={part.content} />
                    )
                  : <ChatMessage role="user" content={m.display} />
              ) : (
                <span className="flex items-center gap-1 py-0.5">
                  <span className="h-2 w-2 rounded-full bg-ink-3 animate-bounce [animation-delay:0ms]" />
                  <span className="h-2 w-2 rounded-full bg-ink-3 animate-bounce [animation-delay:150ms]" />
                  <span className="h-2 w-2 rounded-full bg-ink-3 animate-bounce [animation-delay:300ms]" />
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="pt-2">
        {!isStreaming && sessionCards.length > 0 && evals.length >= sessionCards.length ? (
          <div className="flex items-center justify-between rounded-2xl bg-paper-2 px-4 py-3 shadow-hard-sm">
            <span className="font-manrope text-sm text-ink-3">{t(labels.allCardsCovered, { count: sessionCards.length })}</span>
            <button
              type="button"
              onClick={handleEnd}
              disabled={isSaving}
              className="ml-3 shrink-0 rounded-full bg-orange px-4 py-1.5 font-manrope text-sm font-[800] text-on-bright shadow-hard-red transition hover:opacity-90 disabled:opacity-50"
            >
              {isSaving ? labels.saving : labels.seeResults}
            </button>
          </div>
        ) : messages.length >= MAX_MESSAGES ? (
          <div className="flex items-center justify-between rounded-2xl bg-paper-2 px-4 py-3 shadow-hard-sm">
            <span className="font-manrope text-sm text-ink-3">{labels.messageLimitReached}</span>
            <button
              type="button"
              onClick={handleEnd}
              disabled={isSaving}
              className="ml-3 shrink-0 rounded-full bg-orange px-4 py-1.5 font-manrope text-sm font-[800] text-on-bright shadow-hard-red transition hover:opacity-90 disabled:opacity-50"
            >
              {isSaving ? labels.saving : labels.endSession}
            </button>
          </div>
        ) : (
          <>
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
                className="flex-1 resize-none rounded-2xl bg-paper-2 px-4 py-3 font-manrope text-[16px] text-ink shadow-hard-sm outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-ink disabled:opacity-50"
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
          </>
        )}
      </div>
    </div>
  );
}
