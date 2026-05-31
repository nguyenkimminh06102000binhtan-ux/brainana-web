"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LANGUAGES } from "@/app/(app)/start/constants";
import { switchOriginLanguage, addOriginLanguage } from "@/app/(app)/_actions/origin-language";

export default function OriginLanguageSwitcher({
  originLanguages,
  activeOriginLanguage,
  labels,
}: {
  originLanguages: string[];
  activeOriginLanguage: string | null;
  labels: { setOrigin: string; addLanguage: string; selectLanguage: string; add: string; cancel: string; loading?: string };
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedNew, setSelectedNew] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const active = activeOriginLanguage ?? originLanguages[0] ?? null;
  const available = (LANGUAGES as readonly string[]).filter((l) => !originLanguages.includes(l));
  const loadingLabel = labels.loading ?? "Updating language...";

  function close() {
    setOpen(false);
    setAdding(false);
    setSelectedNew("");
  }

  function handleSwitch(lang: string) {
    startTransition(async () => {
      await switchOriginLanguage(lang);
      router.refresh();
    });
    close();
  }

  function handleAdd() {
    if (!selectedNew) return;
    startTransition(async () => {
      await addOriginLanguage(selectedNew);
      router.refresh();
    });
    close();
  }

  return (
    <div ref={containerRef} className="relative">
      {isPending && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-paper/80 px-4 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3 rounded-full bg-paper-2 px-5 py-3 shadow-hard">
            <span className="relative inline-flex h-8 w-8 items-center justify-center" aria-hidden="true">
              <span className="absolute h-8 w-8 rounded-full border-4 border-orange/20" />
              <span className="absolute h-8 w-8 animate-spin rounded-full border-4 border-transparent border-t-orange" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow" />
            </span>
            <span className="font-manrope text-sm font-[800] text-ink-2">{loadingLabel}</span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-full bg-paper px-3 py-2 font-mono text-xs font-[700] text-ink shadow-hard-sm transition hover:bg-blue hover:text-ocean disabled:opacity-60"
      >
        <span className="max-w-[7rem] truncate">{active ?? labels.setOrigin}</span>
        <span className="text-ink-2">▾</span>
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-10" onClick={close} />

          <div className="absolute bottom-full right-0 z-20 mb-2 max-h-[min(18rem,calc(100vh-12rem))] min-w-[13rem] overflow-y-auto rounded-xl bg-paper-2 shadow-hard lg:bottom-auto lg:top-full lg:mb-0 lg:mt-2">
            {originLanguages.length > 0 && (
              <div className="border-b border-ink/10 py-1">
                {originLanguages.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => handleSwitch(lang)}
                    disabled={isPending}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-manrope text-sm font-[700] text-ink transition hover:bg-blue hover:text-ocean"
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}

            <div className="py-1">
              {!adding ? (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  disabled={isPending}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-manrope text-sm font-[700] text-ink-2 transition hover:bg-blue hover:text-ocean"
                >
                  <span className="w-4 shrink-0 text-center text-xs">+</span>
                  {labels.addLanguage}
                </button>
              ) : (
                <div className="px-4 py-3 flex flex-col gap-2">
                  <select
                    value={selectedNew}
                    onChange={(e) => setSelectedNew(e.target.value)}
                    autoFocus
                    className="w-full rounded-md bg-paper px-3 py-2 font-manrope text-sm font-[700] text-ink outline-none focus:ring-2 focus:ring-yellow"
                  >
                    <option value="">{labels.selectLanguage}</option>
                    {available.map((lang) => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAdd}
                      disabled={!selectedNew || isPending}
                      className="flex-1 rounded-full bg-orange px-3 py-1.5 font-manrope text-xs font-[800] text-on-bright shadow-hard-sm transition disabled:opacity-50"
                    >
                      {labels.add}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAdding(false); setSelectedNew(""); }}
                      disabled={isPending}
                      className="rounded-full bg-paper px-3 py-1.5 font-manrope text-xs font-[800] text-ink shadow-hard-sm transition"
                    >
                      {labels.cancel}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
