"use client";

import { useState, useTransition, useRef } from "react";
import { createPost } from "./discussion-actions";

interface PostComposerProps {
  courseId: string;
  courseSlug: string;
  labels: { composerPlaceholder: string; post: string; posting: string };
}

export default function PostComposer({ courseId, courseSlug, labels }: PostComposerProps) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit() {
    const trimmed = body.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await createPost(courseId, courseSlug, trimmed);
      setBody("");
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
        }}
        placeholder={labels.composerPlaceholder}
        rows={3}
        maxLength={2000}
        className="w-full resize-none rounded-sm border-2 border-ink/15 bg-ink/5 px-4 py-3 font-manrope text-sm text-ink placeholder:text-ink-3 focus:border-orange focus:outline-none"
      />
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-ink-3">
          {body.length > 0 && `${body.length}/2000`}
        </span>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!body.trim() || pending}
          className="cursor-pointer rounded-full bg-orange px-4 py-1.5 font-manrope text-sm font-[800] text-on-bright shadow-hard-sm transition hover:opacity-90 active:translate-y-[1px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? labels.posting : labels.post}
        </button>
      </div>
    </div>
  );
}
