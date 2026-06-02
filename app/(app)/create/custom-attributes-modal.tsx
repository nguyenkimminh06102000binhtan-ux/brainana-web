"use client";

import { useState, useRef, useEffect } from "react";

export default function CustomAttributesModal({
  attributes,
  onSave,
  onClose,
  labels,
}: {
  attributes: string[];
  onSave: (attrs: string[]) => void;
  onClose: () => void;
  labels: Record<string, string>;
}) {
  const [draft, setDraft] = useState<string[]>(attributes);
  const [inputVal, setInputVal] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const els = Array.from(dialog.querySelectorAll<HTMLElement>(focusable));
    els[0]?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onSave(draft); onClose(); return; }
      if (e.key !== "Tab" || els.length === 0) return;
      const first = els[0]!;
      const last = els[els.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps

  function addAttribute() {
    const val = inputVal.trim();
    if (!val || draft.includes(val)) return;
    setDraft((prev) => [...prev, val]);
    setInputVal("");
  }

  function handleDone() {
    onSave(draft);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) { onSave(draft); onClose(); } }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-lg bg-paper shadow-hard"
      >
        <div className="flex items-center justify-between border-b border-ink/10 px-6 py-4">
          <h2 className="font-fredoka text-xl font-[700] tracking-tight">{labels.customAttributesTitle}</h2>
          <button type="button" onClick={() => { onSave(draft); onClose(); }} aria-label="Close" className="font-manrope text-sm text-ink-3 hover:text-ink">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-2">
            {draft.length === 0 && (
              <p className="font-manrope text-sm text-ink-3">No custom attributes yet. Add one below.</p>
            )}
            {draft.map((attr) => (
              <div key={attr} className="overflow-hidden rounded-md bg-paper-2">
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="font-manrope text-sm text-ink">{attr}</span>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(attr)}
                    className="shrink-0 font-manrope text-xs font-[800] text-ink-3 hover:text-orange-text"
                  >
                    ✕
                  </button>
                </div>
                {pendingDelete === attr && (
                  <div className="border-t border-ink/10 bg-electric-pink/10 px-3 py-3">
                    <p className="mb-2.5 font-manrope text-xs font-[600] text-ink">
                      Remove <span className="font-[800]">{attr}</span>? This will permanently delete the attribute and all its values from every card. This cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setDraft((prev) => prev.filter((a) => a !== attr)); setPendingDelete(null); }}
                        className="rounded-full bg-electric-pink px-3 py-1 font-manrope text-xs font-[800] text-on-bright transition hover:opacity-90 active:translate-y-[1px]"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(null)}
                        className="rounded-full bg-ink/10 px-3 py-1 font-manrope text-xs font-[800] text-ink transition hover:bg-ink/20 active:translate-y-[1px]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-ink/10 px-6 py-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAttribute(); } }}
              placeholder={labels.customAttributeNamePlaceholder}
              className="min-w-0 flex-1 rounded-md bg-paper-2 px-3 py-2 font-manrope text-sm text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-ink"
            />
            <button
              type="button"
              onClick={addAttribute}
              className="shrink-0 rounded-md bg-paper-2 px-3 py-2 font-manrope text-xs font-[800] text-ink-2 shadow-hard-sm transition hover:text-ink active:translate-y-[1px] active:shadow-none"
            >
              {labels.addCustomAttribute}
            </button>
          </div>
          <button
            type="button"
            onClick={handleDone}
            className="w-full rounded-full bg-orange px-5 py-2.5 font-manrope text-sm font-[800] text-on-bright shadow-hard-red transition hover:opacity-90 active:translate-y-[1px]"
          >
            {labels.customAttributesDone}
          </button>
        </div>
      </div>
    </div>
  );
}
