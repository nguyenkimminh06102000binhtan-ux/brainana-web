"use client";

import { useState, useTransition } from "react";
import { saveWordConfig } from "./actions";

export type ConfigCard = { id: string; front: string; back: string; ignored: boolean };
export type ConfigSection = { id: string; title: string; cards: ConfigCard[] };

interface Props {
  courseId: string;
  slug: string;
  sections: ConfigSection[];
  labels: {
    configureWords: string;
    configureWordsTitle: string;
    configureWordsDesc: string;
    configureWordsSave: string;
    configureWordsSaving: string;
    configureWordsSaved: string;
    configureWordsSelectAll: string;
    configureWordsUntitled: string;
    ignoredLabel: string;
  };
}

export default function WordConfigModal({ courseId, slug, sections, labels }: Props) {
  const [open, setOpen] = useState(false);
  // ignoredIds: set of item IDs the user wants to skip
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(
    () => new Set(sections.flatMap((s) => s.cards.filter((c) => c.ignored).map((c) => c.id))),
  );
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function toggleCard(id: string) {
    setIgnoredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSaved(false);
  }

  function toggleSection(cards: ConfigCard[]) {
    const allIgnored = cards.every((c) => ignoredIds.has(c.id));
    setIgnoredIds((prev) => {
      const next = new Set(prev);
      if (allIgnored) {
        cards.forEach((c) => next.delete(c.id));
      } else {
        cards.forEach((c) => next.add(c.id));
      }
      return next;
    });
    setSaved(false);
  }

  function selectAll() {
    setIgnoredIds(new Set());
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      await saveWordConfig(courseId, slug, Array.from(ignoredIds));
      setSaved(true);
    });
  }

  const totalIgnored = ignoredIds.size;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer flex items-center gap-1.5 rounded-full bg-paper px-4 py-1.5 font-mono text-xs font-[700] text-ink-2 shadow-hard-sm transition hover:text-ink active:translate-y-[1px] active:shadow-none"
      >
        {labels.configureWords}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-paper/80 px-4 pb-0 backdrop-blur-sm sm:items-center sm:pb-4">
          {/* Backdrop */}
          <div className="fixed inset-0 z-0" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="relative z-10 flex w-full max-w-lg flex-col rounded-t-2xl bg-paper-2 shadow-hard sm:rounded-2xl" style={{ maxHeight: "90dvh" }}>
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between border-b border-ink/10 px-6 py-4">
              <div>
                <h2 className="font-fredoka text-xl font-[700]">{labels.configureWordsTitle}</h2>
                <p className="mt-0.5 font-manrope text-xs text-ink-2">{labels.configureWordsDesc}</p>
              </div>
              <div className="flex items-center gap-2">
                {totalIgnored === 0 ? null : (
                  <button
                    type="button"
                    onClick={selectAll}
                    className="rounded-full bg-ink/10 px-3 py-1 font-mono text-[10px] font-[700] uppercase tracking-wide text-ink-2 hover:bg-ink/20"
                  >
                    {labels.configureWordsSelectAll}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/10 font-manrope text-sm font-[700] text-ink-2 hover:bg-ink/20"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Word list */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {sections.map((s) => {
                const allIgnored = s.cards.every((c) => ignoredIds.has(c.id));
                const someIgnored = s.cards.some((c) => ignoredIds.has(c.id));
                return (
                  <div key={s.id}>
                    {/* Section header */}
                    <button
                      type="button"
                      onClick={() => toggleSection(s.cards)}
                      className="flex w-full items-center justify-between border-b border-ink/5 bg-paper px-6 py-2 text-left hover:bg-paper-2/50"
                    >
                      <span className="font-manrope text-xs font-[700] uppercase tracking-widest text-ink-3">
                        {s.title || labels.configureWordsUntitled}
                      </span>
                      {/* Section checkbox: checked = all learning, mixed = some ignored */}
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition ${
                          !allIgnored && !someIgnored
                            ? "border-orange bg-orange"
                            : someIgnored && !allIgnored
                              ? "border-orange bg-paper"
                              : "border-ink/30 bg-paper"
                        }`}
                      >
                        {!allIgnored && !someIgnored && (
                          <svg viewBox="0 0 12 12" fill="none" className="h-full w-full p-[2px]">
                            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                        {someIgnored && !allIgnored && (
                          <span className="h-1.5 w-1.5 rounded-sm bg-orange" />
                        )}
                      </span>
                    </button>

                    {/* Cards */}
                    {s.cards.map((c) => {
                      const isIgnored = ignoredIds.has(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleCard(c.id)}
                          className={`flex w-full items-center gap-3 border-b border-ink/5 px-6 py-2.5 text-left last:border-b-0 transition ${
                            isIgnored ? "opacity-50 hover:bg-paper-2/50" : "hover:bg-paper-2/50"
                          }`}
                        >
                          {/* Checkbox: checked = to learn */}
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition ${
                              !isIgnored ? "border-orange bg-orange" : "border-ink/30 bg-paper"
                            }`}
                          >
                            {!isIgnored && (
                              <svg viewBox="0 0 12 12" fill="none" className="h-full w-full p-[2px]">
                                <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate font-manrope text-sm font-[600] text-ink">{c.front}</span>
                              {isIgnored && (
                                <span className="shrink-0 rounded-full bg-ink/10 px-2 py-0.5 font-manrope text-[10px] font-[700] uppercase tracking-wide text-ink-3">
                                  {labels.ignoredLabel}
                                </span>
                              )}
                            </span>
                            <span className="block truncate font-manrope text-xs text-ink-3">{c.back}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center justify-between border-t border-ink/10 px-6 py-4">
              <span className="font-manrope text-xs text-ink-2">
                {totalIgnored > 0 && (
                  <span className="rounded-full bg-ink/10 px-2 py-0.5 font-[700]">
                    {totalIgnored} {labels.ignoredLabel.toLowerCase()}
                  </span>
                )}
              </span>
              <button
                type="button"
                disabled={isPending}
                onClick={handleSave}
                className={`rounded-full px-6 py-2.5 font-manrope text-sm font-[800] shadow-hard-sm transition active:translate-y-[1px] active:shadow-none disabled:opacity-60 ${
                  saved
                    ? "bg-green-soft text-ink"
                    : "bg-orange text-on-bright hover:opacity-90 shadow-hard-red"
                }`}
              >
                {isPending ? labels.configureWordsSaving : saved ? labels.configureWordsSaved : labels.configureWordsSave}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
