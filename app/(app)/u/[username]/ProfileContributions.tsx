"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { updateMem, deleteMem } from "@/utils/mems";

export type ProfileMem = {
  id: string;
  text: string;
  helpful_count: number;
  card_id: string;
  author_id: string;
  items: { front_text: string; courses: { title: string; slug: string } | null } | null;
};

type Labels = {
  contributions: string;
  contributionsEmpty: string;
  totalHelpful: string;
  forCard: string;
  inCourse: string;
  editLabel: string;
  delete: string;
  deleteConfirm: string;
  editYourMem: string;
  placeholder: string;
  submit: string;
  cancel: string;
  charsLeft: string;
  helpful: string;
};

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

export default function ProfileContributions({
  initialMems,
  currentUserId,
  isOwnProfile,
  labels,
}: {
  initialMems: ProfileMem[];
  currentUserId: string | null;
  isOwnProfile: boolean;
  labels: Labels;
}) {
  const [mems, setMems] = useState(initialMems);

  const totalHelpful = mems.reduce((s, m) => s + m.helpful_count, 0);

  function handleUpdate(id: string, newText: string) {
    setMems((prev) => prev.map((m) => (m.id === id ? { ...m, text: newText } : m)));
  }

  function handleDelete(id: string) {
    setMems((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <section className="rounded-lg bg-paper-2 p-5 shadow-hard">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">💡 {labels.contributions}</p>
        {mems.length > 0 && (
          <span className="font-mono text-xs text-ink-2">
            {interpolate(labels.totalHelpful, { count: totalHelpful })}
          </span>
        )}
      </div>
      {mems.length === 0 ? (
        <p className="font-manrope text-sm text-ink-2">{labels.contributionsEmpty}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {mems.map((mem) => (
            <MemContributionCard
              key={mem.id}
              mem={mem}
              currentUserId={currentUserId}
              isOwnProfile={isOwnProfile}
              labels={labels}
              onUpdate={(newText) => handleUpdate(mem.id, newText)}
              onDelete={() => handleDelete(mem.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function MemContributionCard({
  mem,
  currentUserId,
  isOwnProfile,
  labels,
  onUpdate,
  onDelete,
}: {
  mem: ProfileMem;
  currentUserId: string | null;
  isOwnProfile: boolean;
  labels: Labels;
  onUpdate: (newText: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(mem.text);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleSave() {
    if (!currentUserId || saving) return;
    setSaving(true);
    try {
      const supabase = createClient();
      await updateMem(supabase, mem.id, currentUserId, editText);
      onUpdate(editText);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!currentUserId) return;
    const supabase = createClient();
    await deleteMem(supabase, mem.id, currentUserId);
    onDelete();
  }

  const cardFront = mem.items?.front_text ?? "";
  const courseTitle = mem.items?.courses?.title ?? "";
  const courseSlug = mem.items?.courses?.slug;

  return (
    <div className="rounded-lg border border-ink/10 bg-paper p-3">
      {/* Context */}
      <p className="mb-1 font-mono text-xs uppercase tracking-wider text-ink-2">
        {interpolate(labels.forCard, { front: cardFront })}
        {courseSlug && (
          <>
            {" · "}
            <Link href={`/c/${courseSlug}`} className="hover:text-orange-text transition">
              {interpolate(labels.inCourse, { course: courseTitle })}
            </Link>
          </>
        )}
      </p>

      {editing ? (
        <>
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
              <button onClick={() => { setEditing(false); setEditText(mem.text); }} className="rounded-full px-3 py-1 font-mono text-xs text-ink-2 hover:bg-paper-2">
                {labels.cancel}
              </button>
              <button onClick={handleSave} disabled={saving || !editText.trim()} className="rounded-full bg-orange px-3 py-1 font-mono text-xs text-on-bright disabled:opacity-50">
                {labels.submit}
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="font-kalam text-sm leading-relaxed text-ink">{mem.text}</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-mono text-xs text-ink-2">▲ {interpolate(labels.helpful, { count: mem.helpful_count })}</span>
            {isOwnProfile && !confirmDelete && (
              <div className="flex gap-2">
                <button onClick={() => setEditing(true)} className="font-mono text-xs text-ink-2 hover:text-orange-text">
                  {labels.editLabel}
                </button>
                <button onClick={() => setConfirmDelete(true)} className="font-mono text-xs text-ink-2 hover:text-danger-text">
                  {labels.delete}
                </button>
              </div>
            )}
            {confirmDelete && (
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-ink-2">{labels.deleteConfirm}</span>
                <button onClick={handleDelete} className="font-mono text-xs text-danger-text">{labels.delete}</button>
                <button onClick={() => setConfirmDelete(false)} className="font-mono text-xs text-ink-2">{labels.cancel}</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
