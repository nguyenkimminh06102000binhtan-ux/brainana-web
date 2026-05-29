"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  getTopMems,
  countMems,
  getUserMem,
  createMem,
  getVotedMemIds,
} from "@/utils/mems";
import type { Mem } from "@/utils/mems";
import MemCard from "./MemCard";

type Labels = {
  memoryHints: string;
  writeYourOwn: string;
  editYourMem: string;
  placeholder: string;
  submit: string;
  cancel: string;
  delete: string;
  deleteConfirm: string;
  seeAll: string;
  helpful: string;
  editLabel: string;
  charsLeft: string;
  noHints: string;
};

type Props = {
  cardId: string;
  currentUserId: string | null;
  labels: Labels;
};

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

export default function MemSection({ cardId, currentUserId, labels }: Props) {
  const [mems, setMems] = useState<Mem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [userMem, setUserMem] = useState<Mem | null>(null);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const cardLabels = {
    helpful: labels.helpful,
    editLabel: labels.editLabel,
    delete: labels.delete,
    deleteConfirm: labels.deleteConfirm,
    editYourMem: labels.editYourMem,
    placeholder: labels.placeholder,
    submit: labels.submit,
    cancel: labels.cancel,
    charsLeft: labels.charsLeft,
  };

  const load = useCallback(async () => {
    const supabase = createClient();
    const [topMems, count] = await Promise.all([
      getTopMems(supabase, cardId, 2),
      countMems(supabase, cardId),
    ]);

    let ownMem: Mem | null = null;
    let voted = new Set<string>();
    if (currentUserId) {
      [ownMem, voted] = await Promise.all([
        getUserMem(supabase, cardId, currentUserId),
        getVotedMemIds(supabase, topMems.map((m) => m.id), currentUserId),
      ]);
    }

    setMems(topMems);
    setTotalCount(count);
    setUserMem(ownMem);
    setVotedIds(voted);
    setLoaded(true);
  }, [cardId, currentUserId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit() {
    if (!currentUserId || !draft.trim() || submitting) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      const created = await createMem(supabase, cardId, currentUserId, draft);
      setUserMem(created);
      setMems((prev) => {
        const updated = [created, ...prev].sort((a, b) => b.helpful_count - a.helpful_count).slice(0, 2);
        return updated;
      });
      setTotalCount((c) => c + 1);
      setDraft("");
    } finally {
      setSubmitting(false);
    }
  }

  function handleMemUpdate(updated: Mem) {
    setUserMem(updated);
    setMems((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  }

  function handleMemDelete(memId: string) {
    if (userMem?.id === memId) setUserMem(null);
    setMems((prev) => prev.filter((m) => m.id !== memId));
    setTotalCount((c) => Math.max(0, c - 1));
  }

  if (!loaded) return null;

  const shownMems = mems.filter((m) => !userMem || m.id !== userMem.id).slice(0, 2);
  const hasMore = totalCount > shownMems.length + (userMem ? 1 : 0);

  return (
    <div className="mt-4 flex flex-col gap-3">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-2">💡 {labels.memoryHints}</p>

      {/* User's own mem (always shown, above community mems) */}
      {userMem && (
        <MemCard
          mem={userMem}
          currentUserId={currentUserId}
          hasVoted={votedIds.has(userMem.id)}
          labels={cardLabels}
          onUpdate={handleMemUpdate}
          onDelete={handleMemDelete}
        />
      )}

      {/* Top community mems */}
      {shownMems.map((mem) => (
        <MemCard
          key={mem.id}
          mem={mem}
          currentUserId={currentUserId}
          hasVoted={votedIds.has(mem.id)}
          labels={cardLabels}
          onUpdate={handleMemUpdate}
          onDelete={handleMemDelete}
        />
      ))}

      {/* No hints yet */}
      {!userMem && shownMems.length === 0 && (
        <p className="font-mono text-xs text-ink-2">{labels.noHints}</p>
      )}

      {/* See all link */}
      {hasMore && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="self-start font-mono text-xs text-orange-text hover:underline"
        >
          {interpolate(labels.seeAll, { count: totalCount })}
        </button>
      )}

      {/* Write form — only if user hasn't written one yet */}
      {currentUserId && !userMem && (
        <div className="rounded-lg border border-ink/10 bg-paper p-3">
          <p className="mb-1 font-mono text-xs uppercase tracking-widest text-ink-2">{labels.writeYourOwn}</p>
          <textarea
            className="w-full resize-none rounded border border-ink/20 bg-paper-2 px-3 py-2 font-kalam text-sm text-ink placeholder:text-ink-2 focus:outline-none focus:ring-1 focus:ring-orange"
            rows={3}
            maxLength={200}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={labels.placeholder}
          />
          <div className="mt-1 flex items-center justify-between">
            <span className="font-mono text-xs text-ink-2">{interpolate(labels.charsLeft, { count: 200 - draft.length })}</span>
            <button
              onClick={handleSubmit}
              disabled={submitting || !draft.trim()}
              className="rounded-full bg-orange px-3 py-1 font-mono text-xs text-on-bright disabled:opacity-50"
            >
              {labels.submit}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
