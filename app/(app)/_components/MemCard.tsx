"use client";

import { useState } from "react";
import { voteMem, unvoteMem, updateMem, deleteMem } from "@/utils/mems";
import { createClient } from "@/utils/supabase/client";
import type { Mem } from "@/utils/mems";

type Labels = {
  helpful: string;
  editLabel: string;
  delete: string;
  deleteConfirm: string;
  editYourMem: string;
  placeholder: string;
  submit: string;
  cancel: string;
  charsLeft: string;
};

type Props = {
  mem: Mem;
  currentUserId: string | null;
  hasVoted: boolean;
  labels: Labels;
  onUpdate: (updated: Mem) => void;
  onDelete: (memId: string) => void;
};

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

export default function MemCard({ mem, currentUserId, hasVoted: initialVoted, labels, onUpdate, onDelete }: Props) {
  const [voted, setVoted] = useState(initialVoted);
  const [count, setCount] = useState(mem.helpful_count);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(mem.text);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isOwner = currentUserId === mem.author_id;
  const authorName = mem.profiles?.display_name ?? mem.profiles?.username ?? "anonymous";

  async function handleVote() {
    if (!currentUserId) return;
    const supabase = createClient();
    if (voted) {
      setVoted(false);
      setCount((c) => Math.max(0, c - 1));
      await unvoteMem(supabase, mem.id, currentUserId);
    } else {
      setVoted(true);
      setCount((c) => c + 1);
      await voteMem(supabase, mem.id, currentUserId);
    }
  }

  async function handleSave() {
    if (!currentUserId || saving) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const updated = await updateMem(supabase, mem.id, currentUserId, editText);
      onUpdate(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!currentUserId) return;
    const supabase = createClient();
    await deleteMem(supabase, mem.id, currentUserId);
    onDelete(mem.id);
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-ink/10 bg-paper p-3">
        <p className="mb-1 font-mono text-xs uppercase tracking-widest text-ink-2">{labels.editYourMem}</p>
        <textarea
          className="w-full resize-none rounded border border-ink/20 bg-paper-2 px-3 py-2 font-kalam text-sm text-ink focus:outline-none focus:ring-1 focus:ring-orange"
          rows={3}
          maxLength={200}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          placeholder={labels.placeholder}
        />
        <div className="mt-1 flex items-center justify-between">
          <span className="font-mono text-xs text-ink-2">{interpolate(labels.charsLeft, { count: 200 - editText.length })}</span>
          <div className="flex gap-2">
            <button
              onClick={() => { setEditing(false); setEditText(mem.text); }}
              className="rounded-full px-3 py-1 font-mono text-xs text-ink-2 hover:bg-paper-2"
            >
              {labels.cancel}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !editText.trim()}
              className="rounded-full bg-orange px-3 py-1 font-mono text-xs text-white disabled:opacity-50"
            >
              {labels.submit}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-ink/10 bg-paper p-3">
      <p className="font-kalam text-sm leading-relaxed text-ink">{mem.text}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="font-mono text-xs text-ink-2">@{mem.profiles?.username ?? authorName}</span>
        <div className="flex items-center gap-2">
          {isOwner && !confirmDelete && (
            <>
              <button
                onClick={() => setEditing(true)}
                className="font-mono text-xs text-ink-2 hover:text-orange"
              >
                {labels.editLabel}
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="font-mono text-xs text-ink-2 hover:text-electric-pink"
              >
                {labels.delete}
              </button>
            </>
          )}
          {confirmDelete && (
            <>
              <span className="font-mono text-xs text-ink-2">{labels.deleteConfirm}</span>
              <button onClick={handleDelete} className="font-mono text-xs text-electric-pink">
                {labels.delete}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="font-mono text-xs text-ink-2">
                {labels.cancel}
              </button>
            </>
          )}
          <button
            onClick={handleVote}
            disabled={!currentUserId}
            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs transition ${
              voted
                ? "border-orange bg-orange/10 text-orange"
                : "border-ink/20 text-ink-2 hover:border-orange hover:text-orange"
            } disabled:cursor-default disabled:opacity-50`}
          >
            <span>▲</span>
            <span>{interpolate(labels.helpful, { count })}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
