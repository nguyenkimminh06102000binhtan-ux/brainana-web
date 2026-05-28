"use client";

import { useState } from "react";

interface ActivityHeatmapProps {
  data: Record<string, number>;
  totalReviewed: number;
}

function cellColor(count: number): string {
  if (count === 0) return "bg-paper border border-ink/10";
  if (count < 10) return "bg-yellow-soft";
  if (count < 25) return "bg-red-soft";
  return "bg-green-soft";
}

export default function ActivityHeatmap({ data, totalReviewed }: ActivityHeatmapProps) {
  const [hovered, setHovered] = useState<{ date: string; count: number } | null>(null);

  // Build 84 consecutive days ending today, grouped into 12 columns of 7
  const today = new Date();
  const cells: { date: string; count: number }[] = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    cells.push({ date: dateStr, count: data[dateStr] ?? 0 });
  }

  const weeks: { date: string; count: number }[][] = [];
  for (let i = 0; i < 84; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className="rounded-lg bg-paper-2 p-5 shadow-hard">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">
          Activity · Last 12 weeks
        </p>
        <p className="font-mono text-xs text-ink-2">
          {totalReviewed.toLocaleString()} cards reviewed
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {weeks.map((week, wIdx) => (
          <div key={wIdx} className="flex flex-col gap-1">
            {week.map((cell) => (
              <div
                key={cell.date}
                className={`h-7 w-7 shrink-0 rounded-sm ${cellColor(cell.count)} cursor-default transition-opacity hover:opacity-70`}
                onMouseEnter={() => setHovered(cell)}
                onMouseLeave={() => setHovered(null)}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      <div className="mt-2 h-4">
        {hovered && (
          <p className="font-mono text-[10px] text-ink-3">
            {hovered.date} · {hovered.count} card{hovered.count !== 1 ? "s" : ""} reviewed
          </p>
        )}
      </div>
    </div>
  );
}
