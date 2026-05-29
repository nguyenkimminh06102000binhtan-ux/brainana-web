"use client";

import { useState, useTransition } from "react";
import { updateQuestionTypes } from "./actions";

type QType = "flashcard" | "multiple_choice" | "audio_type" | "speed_match" | "type_answer";

export default function QuestionTypeSelector({
  courseId,
  initial,
  hasAudio,
  labels,
}: {
  courseId: string;
  initial: QType[];
  hasAudio: boolean;
  labels: {
    flashcard: string;
    multipleChoice: string;
    audioType: string;
    speedMatch: string;
    typeAnswer: string;
    savePreferences: string;
    savedPreferences: string;
    savingPreferences: string;
  };
}) {
  const options: { value: QType; label: string; icon: string }[] = [
    { value: "flashcard",       label: labels.flashcard,       icon: "🃏" },
    { value: "multiple_choice", label: labels.multipleChoice,  icon: "☑️" },
    { value: "audio_type",      label: labels.audioType,       icon: "🎧" },
    { value: "speed_match",     label: labels.speedMatch,      icon: "⚡" },
    { value: "type_answer",     label: labels.typeAnswer,      icon: "⌨️" },
  ];

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
        {options.filter((o) => o.value !== "audio_type" || hasAudio).map(({ value, label, icon }) => {
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
        className="cursor-pointer w-full rounded-full bg-orange px-4 py-2 font-manrope text-sm font-[800] text-on-bright shadow-hard-sm transition hover:opacity-90 active:translate-y-[1px] active:shadow-none disabled:opacity-50"
      >
        {saved ? labels.savedPreferences : pending ? labels.savingPreferences : labels.savePreferences}
      </button>
    </div>
  );
}
