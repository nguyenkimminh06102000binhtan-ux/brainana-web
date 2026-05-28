"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LANGUAGES } from "@/app/(app)/start/constants";
import { switchOriginLanguage, addOriginLanguage } from "@/app/(app)/_actions/origin-language";

export default function OriginLanguageSwitcher({
  originLanguages,
  activeOriginLanguage,
}: {
  originLanguages: string[];
  activeOriginLanguage: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedNew, setSelectedNew] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const active = activeOriginLanguage ?? originLanguages[0] ?? null;
  const available = (LANGUAGES as readonly string[]).filter((l) => !originLanguages.includes(l));

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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-full bg-paper px-3 py-2 font-mono text-xs font-[700] text-ink shadow-hard-sm transition hover:bg-blue hover:text-ocean disabled:opacity-60"
      >
        <span className="max-w-[7rem] truncate">{active ?? "Set origin"}</span>
        <span className="text-ink-2">▾</span>
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-10" onClick={close} />

          <div className="absolute right-0 top-full z-20 mt-2 min-w-[13rem] overflow-hidden rounded-xl bg-paper-2 shadow-hard">
            {originLanguages.length > 0 && (
              <div className="border-b border-ink/10 py-1">
                {originLanguages.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => handleSwitch(lang)}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-manrope text-sm font-[700] text-ink transition hover:bg-blue hover:text-ocean"
                  >
                    <span className="w-4 shrink-0 text-center text-xs">
                      {lang === active ? "✓" : ""}
                    </span>
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
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-manrope text-sm font-[700] text-ink-2 transition hover:bg-blue hover:text-ocean"
                >
                  <span className="w-4 shrink-0 text-center text-xs">+</span>
                  Add a language
                </button>
              ) : (
                <div className="px-4 py-3 flex flex-col gap-2">
                  <select
                    value={selectedNew}
                    onChange={(e) => setSelectedNew(e.target.value)}
                    autoFocus
                    className="w-full rounded-md bg-paper px-3 py-2 font-manrope text-sm font-[700] text-ink outline-none focus:ring-2 focus:ring-yellow"
                  >
                    <option value="">Select language…</option>
                    {available.map((lang) => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAdd}
                      disabled={!selectedNew}
                      className="flex-1 rounded-full bg-orange px-3 py-1.5 font-manrope text-xs font-[800] text-white shadow-hard-sm transition disabled:opacity-50"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAdding(false); setSelectedNew(""); }}
                      className="rounded-full bg-paper px-3 py-1.5 font-manrope text-xs font-[800] text-ink shadow-hard-sm transition"
                    >
                      Cancel
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
