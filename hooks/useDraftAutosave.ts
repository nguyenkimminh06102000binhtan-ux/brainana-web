"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STALE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ── Serialised types (no runtime fields) ─────────────────────────────────────

export type DraftItem = {
  id: number;
  dbId?: string | null;
  front: string;
  back: string;
  romanization: string;
  // Storage paths (not signed display URLs — those expire). Display URLs are
  // regenerated asynchronously from these paths on restore.
  imagePath?: string;
  frontAudioPath?: string;
  backAudioPath?: string;
  distractors: string[];
  acceptedAnswers: string[];
  customAttributeValues: Record<string, string>;
};

export type DraftSection = {
  id: number;
  dbId?: string | null;
  title: string;
  description: string;
  customAttributes: string[];
  items: DraftItem[];
};

export type DraftState = {
  formTitle?: string;
  selectedCategory: string;
  selectedSubcategory?: string;
  selectedLevel?: string;
  selectedVisibility: string;
  selectedSourceLanguage: string;
  selectedTargetLanguage: string;
  sections: DraftSection[];
};

type StoredDraft = DraftState & { savedAt: number };

function readStoredDraft(key: string | null): StoredDraft | null {
  if (!key || typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft;
    if (!parsed.savedAt || Date.now() - parsed.savedAt > STALE_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useDraftAutosave(
  key: string | null,
  value: DraftState,
  { debounceMs = 2000 }: { debounceMs?: number } = {},
) {
  const hydratedRef     = useRef(false);
  const dirtyRef        = useRef(false);
  const timerRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef        = useRef(value);

  // When true, both the debounce timeout and beforeunload skip writing.
  // Set by clearDraft() (Discard or confirmed submit).
  // Reset when the timeout actually fires, meaning the user resumed editing.
  const suppressSaveRef = useRef(false);

  const [hasDraft, setHasDraft]         = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Keep the first client render identical to the server render. localStorage
  // is checked after hydration, otherwise the draft banner can cause a mismatch.
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const draft = readStoredDraft(key);
      setHasDraft(Boolean(draft));
      setDraftSavedAt(draft?.savedAt ?? null);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [key]);

  const writeDraft = useCallback(() => {
    if (!key || suppressSaveRef.current || !dirtyRef.current) return;
    try {
      localStorage.setItem(key, JSON.stringify({ ...valueRef.current, savedAt: Date.now() }));
    } catch { /* quota exceeded — ignore */ }
  }, [key]);

  // Debounced save — skips the initial render so we never clobber an existing
  // draft before the user has had a chance to restore it.
  useEffect(() => {
    if (!key) return;
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
    dirtyRef.current = true;
    suppressSaveRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(writeDraft, debounceMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [key, value, debounceMs, writeDraft]);

  // Synchronous flush on page close/backgrounding — captures partial AI
  // results and edits that hadn't yet been debounced. beforeunload is not
  // fired consistently across browsers and tab restore flows, so pagehide and
  // visibilitychange cover the common "close tab / app backgrounded" paths.
  // Skipped when suppressSaveRef is true (after Discard or confirmed submit)
  // so clearDraft() stays cleared even if the page closes immediately after.
  useEffect(() => {
    if (!key) return;
    function flush() {
      if (!hydratedRef.current) return;
      writeDraft();
    }
    function flushWhenHidden() {
      if (document.visibilityState === "hidden") flush();
    }

    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flushWhenHidden);

    return () => {
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flushWhenHidden);
    };
  }, [key, writeDraft]);

  const loadDraft = useCallback((): StoredDraft | null => {
    if (!key) return null;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredDraft;
      if (!parsed.savedAt || Date.now() - parsed.savedAt > STALE_MS) {
        localStorage.removeItem(key);
        return null;
      }
      return parsed;
    } catch { return null; }
  }, [key]);

  // clearDraft: removes the draft AND suppresses future saves until the user
  // resumes editing. Use for Discard and confirmed submit.
  const clearDraft = useCallback(() => {
    if (!key) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    suppressSaveRef.current = true;
    dirtyRef.current = false;
    try { localStorage.removeItem(key); } catch { /* ignore */ }
    setHasDraft(false);
    setDraftSavedAt(null);
  }, [key]);

  // dismissDraft: hides the banner only — does NOT touch localStorage and does
  // NOT suppress saves. Use after Restore so the existing draft stays in
  // storage (as the recovery baseline) and the debounce continues writing
  // updated state as the user edits. Avoids the gap where the draft is cleared
  // but the debounce hasn't yet written the restored state back.
  const dismissDraft = useCallback(() => {
    setHasDraft(false);
    setDraftSavedAt(null);
  }, []);

  return { hasDraft, draftSavedAt, loadDraft, clearDraft, dismissDraft };
}

// ── Helper ────────────────────────────────────────────────────────────────────

export function formatDraftAge(savedAt: number): string {
  const diff  = Date.now() - savedAt;
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  <  1) return "just now";
  if (mins  < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
