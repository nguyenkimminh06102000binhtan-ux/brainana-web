"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { deleteCourseDraft, loadCourseDraft, saveCourseDraft } from "@/app/actions/course-drafts";
import type { DraftState } from "@/types/course-draft";

export type { DraftItem, DraftSection, DraftState } from "@/types/course-draft";

type StoredDraft = DraftState & { savedAt: number };

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
  const draftRef        = useRef<StoredDraft | null>(null);

  // When true, the debounce timeout skips writing. Set by clearDraft()
  // or suppressDraftSaves(), then reset when the user resumes editing.
  const suppressSaveRef = useRef(false);

  const [hasDraft, setHasDraft]         = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Keep the first client render identical to the server render. The cloud draft
  // is checked after hydration, then callers can apply it client-side.
  useEffect(() => {
    let cancelled = false;
    if (!key) {
      draftRef.current = null;
      setHasDraft(false);
      setDraftSavedAt(null);
      return;
    }

    loadCourseDraft(key)
      .then((draft) => {
        if (cancelled) return;
        draftRef.current = draft;
        setHasDraft(Boolean(draft));
        setDraftSavedAt(draft?.savedAt ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        draftRef.current = null;
        setHasDraft(false);
        setDraftSavedAt(null);
      });

    return () => { cancelled = true; };
  }, [key]);

  const writeDraft = useCallback(async () => {
    if (!key || suppressSaveRef.current || !dirtyRef.current) return;
    try {
      const { savedAt } = await saveCourseDraft(key, valueRef.current);
      draftRef.current = { ...valueRef.current, savedAt };
      setDraftSavedAt(savedAt);
    } catch { /* network/auth errors should not block editing */ }
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
    timerRef.current = setTimeout(() => { void writeDraft(); }, debounceMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [key, value, debounceMs, writeDraft]);

  // Best-effort flush when the app is backgrounded. Network requests may be
  // cancelled during unload, so the debounced cloud save remains primary.
  useEffect(() => {
    if (!key) return;
    function flush() {
      if (!hydratedRef.current) return;
      void writeDraft();
    }
    function flushWhenHidden() {
      if (document.visibilityState === "hidden") flush();
    }

    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flushWhenHidden);

    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flushWhenHidden);
    };
  }, [key, writeDraft]);

  const loadDraft = useCallback(async (): Promise<StoredDraft | null> => {
    if (!key) return null;
    if (draftRef.current) return draftRef.current;
    try {
      const draft = await loadCourseDraft(key);
      draftRef.current = draft;
      return draft;
    } catch { return null; }
  }, [key]);

  const suppressDraftSaves = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    suppressSaveRef.current = true;
    dirtyRef.current = false;
  }, []);

  // clearDraft: removes the draft AND suppresses future saves until the user
  // resumes editing. Use for Cancel.
  const clearDraft = useCallback(async () => {
    if (!key) return;
    suppressDraftSaves();
    draftRef.current = null;
    setHasDraft(false);
    setDraftSavedAt(null);
    try { await deleteCourseDraft(key); } catch { /* ignore */ }
  }, [key, suppressDraftSaves]);

  return { hasDraft, draftSavedAt, loadDraft, clearDraft, suppressDraftSaves };
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
