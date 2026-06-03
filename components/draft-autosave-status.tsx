"use client";

import { formatDraftAge } from "@/hooks/useDraftAutosave";

export default function DraftAutosaveStatus({ savedAt }: { savedAt: number | null }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-ink/10 bg-paper-2 px-3 py-2 font-manrope text-xs font-[700] text-ink-2 shadow-hard-sm">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue/10 text-blue" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.5 18H8a4 4 0 0 1-.6-8A5.5 5.5 0 0 1 18 8.5 4.75 4.75 0 0 1 17.5 18Z" />
          <path d="m9.5 13.5 2 2 4-4" />
        </svg>
      </span>
      <span>{savedAt ? `Autosaved ${formatDraftAge(savedAt)}` : "Cloud autosave on"}</span>
    </div>
  );
}
