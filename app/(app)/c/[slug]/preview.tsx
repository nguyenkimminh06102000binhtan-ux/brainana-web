"use client";

import { useState } from "react";

type PreviewItem = { id: string; front_text: string; back_text: string };

export default function PreviewSection({
  items,
  totalCount,
  labels,
}: {
  items: PreviewItem[];
  totalCount: number;
  labels: { preview: string; previewOf: string; flipUp: string; flipDown: string; more: string };
}) {
  const [flipped, setFlipped] = useState(false);
  const remaining = totalCount - items.length;

  return (
    <div className="rounded-lg bg-paper-2 p-6 shadow-hard">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-manrope text-sm font-[800] text-ink">
          {labels.preview}{" "}
          <span className="text-ink-2">
            · {labels.previewOf.replace("{shown}", String(items.length)).replace("{total}", String(totalCount))}
          </span>
        </p>
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          className="cursor-pointer flex items-center gap-1.5 rounded-full bg-paper px-4 py-1.5 font-mono text-xs font-[700] text-ink-2 shadow-hard-sm transition hover:text-ink active:translate-y-[1px] active:shadow-none"
        >
          {flipped ? labels.flipUp : labels.flipDown}
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex min-h-[120px] w-36 shrink-0 flex-col items-center justify-center rounded-lg bg-paper p-4 shadow-hard-sm"
          >
            <p className="text-center font-fredoka text-lg font-[600] leading-tight tracking-tight">
              {flipped ? item.back_text : item.front_text}
            </p>
            <p className="mt-2 text-center font-manrope text-xs text-ink-2 line-clamp-2">
              {flipped ? item.front_text : item.back_text}
            </p>
          </div>
        ))}

        {remaining > 0 && (
          <div className="flex min-h-[120px] w-36 shrink-0 flex-col items-center justify-center rounded-lg border-2 border-dashed border-ink/20 p-4">
            <p className="font-fredoka text-2xl font-[700] text-ink-2">+{remaining}</p>
            <p className="mt-1 font-mono text-xs uppercase tracking-widest text-ink-3">{labels.more}</p>
          </div>
        )}
      </div>
    </div>
  );
}
