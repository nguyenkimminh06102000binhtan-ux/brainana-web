"use client";

import { useState, useTransition } from "react";
import { updateQuestionTypes } from "./actions";

type QType = "flashcard" | "multiple_choice" | "audio_type" | "speed_match" | "type_answer";

const OPTIONS: { value: QType; label: string; icon: string }[] = [
  { value: "flashcard",       label: "Flashcard",       icon: "🃏" },
  { value: "multiple_choice", label: "Multiple choice", icon: "☑️" },
  { value: "audio_type",      label: "Audio type",      icon: "🎧" },
  { value: "speed_match",     label: "Speed match",     icon: "⚡" },
  { value: "type_answer",     label: "Type answer",     icon: "⌨️" },
];

export default function QuestionTypeSelector({
  courseId,
  initial,
  hasAudio,
}: {
  courseId: string;
  initial: QType[];
  hasAudio: boolean;
}) {
  const [selected, setSelected] = useState<QType[]>(initial);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggle(type: QType) {
    setSelected((prev) => {
      const next = prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type];
      return next.length === 0 ? prev : next;
    });
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("course_id", courseId);
      selected.forEach((t) => fd.append("question_types", t));
      await updateQuestionTypes(fd);
      setSaved(true);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.filter((o) => o.value !== "audio_type" || hasAudio).map(({ value, label, icon }) => {
          const active = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => toggle(value)}
              className={`cursor-pointer flex items-center gap-2 rounded-lg border-2 px-3 py-2.5 font-manrope text-sm font-[700] transition active:translate-y-[1px] ${
                active
                  ? "border-orange bg-orange/10 text-ink"
                  : "border-ink/10 bg-paper text-ink-2 hover:border-ink/30"
              }`}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={pending}
        className="cursor-pointer w-full rounded-full bg-orange px-4 py-2 font-manrope text-sm font-[800] text-white shadow-hard-sm transition hover:opacity-90 active:translate-y-[1px] active:shadow-none disabled:opacity-50"
      >
        {saved ? "Saved ✓" : pending ? "Saving…" : "Save preferences"}
      </button>
    </div>
  );
}
