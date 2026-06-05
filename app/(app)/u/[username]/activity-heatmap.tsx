"use client";

import { useState } from "react";
import type { CSSProperties } from "react";

interface ActivityHeatmapProps {
  data: Record<string, number>;
  totalReviewed: number;
}

function cellStyle(count: number): { className: string; style?: CSSProperties } {
  if (count === 0) return { className: "bg-ink/10" };
  if (count < 10) return { className: "bg-yellow" };
  if (count < 25) return { className: "bg-orange" };
  return { className: "", style: { backgroundColor: "#b45309" } };
}

export default function ActivityHeatmap({ data, totalReviewed }: ActivityHeatmapProps) {
  const [hovered, setHovered] = useState<{ date: string; count: number } | null>(null);

  // Build 84 consecutive days ending today, grouped into 12 columns of 7
  const today = new Date();
  const cells: { date: string; count: number }[] = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    const dateStr = d.toISOString().slice(0, 10);
    cells.push({ date: dateStr, count: data[dateStr] ?? 0 });
  }

  const weeks: { date: string; count: number }[][] = [];
  for (let i = 0; i < 84; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className="overflow-hidden rounded-lg bg-paper-2 p-4 shadow-hard sm:p-5">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">
          Activity · Last 12 weeks
        </p>
        <p className="font-mono text-xs text-ink-2">
          {totalReviewed.toLocaleString()} cards reviewed
        </p>
      </div>

      <div className="grid w-full grid-cols-12 gap-1">
        {weeks.map((week, wIdx) => (
          <div key={wIdx} className="grid min-w-0 grid-rows-7 gap-1">
            {week.map((cell) => {
              const { className, style } = cellStyle(cell.count);
              return (
                <div
                  key={cell.date}
                  className={`aspect-square min-w-0 rounded-[0.35rem] ${className} cursor-default transition-opacity hover:opacity-70`}
                  style={style}
                  onMouseEnter={() => setHovered(cell)}
                  onMouseLeave={() => setHovered(null)}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      <div className="mt-2 h-4">
        {hovered && (
          <p className="font-mono text-xs text-ink-3">
            {hovered.date} · {hovered.count} card{hovered.count !== 1 ? "s" : ""} reviewed
          </p>
        )}
      </div>
    </div>
  );
}
