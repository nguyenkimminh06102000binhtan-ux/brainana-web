"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { duplicateCourse } from "./actions";

interface Props {
  courseId: string;
  canDuplicate: boolean; // false = free plan
  labels: {
    duplicateCourse: string;
    duplicating: string;
    duplicateUpsell: string;
  };
}

export default function DuplicateButton({ courseId, canDuplicate, labels }: Props) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  if (!canDuplicate) {
    return (
      <a
        href="/billing/upgrade"
        title={labels.duplicateUpsell}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-ink/10 px-5 py-2.5 font-manrope text-sm font-[800] text-ink-3 shadow-hard-sm transition hover:bg-ink/20"
      >
        🔒 {labels.duplicateCourse}
      </a>
    );
  }

  async function handleClick() {
    if (state === "loading") return;
    setState("loading");
    setErrorMsg("");
    const result = await duplicateCourse(courseId);
    if ("error" in result) {
      setState("error");
      setErrorMsg(result.error);
      return;
    }
    router.push(`/c/${result.slug}/edit`);
  }

  return (
    <div className="flex flex-col items-start gap-1 self-start">
      <button
        type="button"
        disabled={state === "loading"}
        onClick={handleClick}
        className="inline-flex min-h-11 items-center rounded-full bg-paper px-5 py-2.5 font-manrope text-sm font-[800] text-ink shadow-hard-sm transition hover:bg-paper-2 active:translate-y-[1px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state === "loading" ? labels.duplicating : labels.duplicateCourse}
      </button>
      {state === "error" && (
        <p className="font-manrope text-xs text-orange-text">{errorMsg}</p>
      )}
    </div>
  );
}
