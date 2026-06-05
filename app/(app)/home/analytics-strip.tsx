"use client";

import { useState } from "react";
import Link from "next/link";

export type ReviewForecastDay = {
  day: string;
  dayLabel: string;
  count: number;
  isToday: boolean;
};
export type AccuracyTrendDay = {
  day: string;
  dayLabel: string;
  pct: number | null;
};
export type MasteryWeek = { weekLabel: string; count: number };
export type EaseCourse = {
  courseId: string;
  title: string;
  slug: string;
  avgEase: number;
};

interface Props {
  reviewForecast: ReviewForecastDay[];
  accuracyTrend: AccuracyTrendDay[];
  masteryVelocity: MasteryWeek[];
  easeByCourse: EaseCourse[];
}

const CHART_H = 40;
const BAR_W = 10;
const BAR_GAP = 3;

function MiniBarChart({
  bars,
}: {
  bars: { value: number | null; label: string; tooltip: string; color: string }[];
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const maxVal = Math.max(...bars.map((b) => b.value ?? 0), 1);
  const n = bars.length;
  const svgW = n * BAR_W + (n - 1) * BAR_GAP;

  return (
    <div className="w-full select-none">
      {/* Tooltip rendered in a zero-height div so it pops above the chart without affecting layout */}
      <div className="relative h-0">
        {hovered !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-y-full whitespace-nowrap rounded bg-ink px-1.5 py-0.5 font-mono text-[10px] text-paper"
            style={{
              left: `clamp(0px, calc(${((hovered + 0.5) / n) * 100}% - 30px), calc(100% - 60px))`,
            }}
          >
            {bars[hovered].tooltip}
          </div>
        )}
      </div>
      {/* Block SVG — its viewBox clips bars to exactly CHART_H, no overflow possible */}
      <svg
        viewBox={`0 0 ${svgW} ${CHART_H}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: CHART_H, display: "block" }}
      >
        {bars.map((bar, i) => {
          const empty = bar.value == null || bar.value === 0;
          const barH = empty
            ? CHART_H * 0.06
            : Math.max((bar.value! / maxVal) * CHART_H, CHART_H * 0.1);
          const x = i * (BAR_W + BAR_GAP);
          return (
            <rect
              key={i}
              x={x}
              y={CHART_H - barH}
              width={BAR_W}
              height={barH}
              rx={2}
              fill={bar.color}
              opacity={empty ? 0.18 : 1}
              style={{ cursor: "default" }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
      </svg>
      <div className="mt-1 flex">
        {bars.map((bar, i) => (
          <span
            key={i}
            className={`flex-1 text-center font-mono text-[9px] leading-none transition-colors ${
              hovered === i ? "text-ink" : "text-ink-3"
            }`}
          >
            {bar.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function easeDifficulty(ease: number): { label: string; color: string } {
  if (ease < 2.0) return { label: "Very hard", color: "#ef4444" };
  if (ease < 2.3) return { label: "Hard", color: "#f97316" };
  if (ease < 2.6) return { label: "Medium", color: "#eab308" };
  if (ease < 3.0) return { label: "Good", color: "#22c55e" };
  return { label: "Easy", color: "#3b82f6" };
}

export default function AnalyticsStrip({
  reviewForecast,
  accuracyTrend,
  masteryVelocity,
  easeByCourse,
}: Props) {
  const forecastBars = reviewForecast.map((d) => ({
    value: d.count,
    label: d.dayLabel,
    tooltip: d.isToday ? `Today · ${d.count} due` : `${d.day} · ${d.count} due`,
    color: d.isToday ? "#f97316" : "#3b82f6",
  }));

  const accuracyBars = accuracyTrend.map((d) => ({
    value: d.pct,
    label: d.dayLabel,
    tooltip: d.pct == null ? "No session" : `${d.pct}% correct`,
    color:
      d.pct == null ? "#6b7280"
      : d.pct >= 85 ? "#22c55e"
      : d.pct >= 70 ? "#eab308"
      : d.pct >= 50 ? "#f97316"
      : "#ef4444",
  }));

  const velocityBars = masteryVelocity.map((w) => ({
    value: w.count,
    label: w.weekLabel,
    tooltip: `${w.count} mastered`,
    color: "#22c55e",
  }));

  return (
    <section className="rounded-[1.4rem] border-2 border-ink bg-paper-2 p-5 shadow-hard-sm">
      <p className="mb-4 font-mono text-xs uppercase tracking-widest text-ink-2">
        Your Progress
      </p>

      <div className="grid grid-cols-3 gap-4">
        {/* Review Load */}
        <div>
          <p className="mb-2 font-manrope text-[11px] font-[800] text-ink leading-none">
            Review Load
          </p>
          <MiniBarChart bars={forecastBars} />
          <p className="mt-1.5 font-mono text-[9px] text-ink-3">Next 7 days</p>
        </div>

        {/* Accuracy */}
        <div>
          <p className="mb-2 font-manrope text-[11px] font-[800] text-ink leading-none">
            Accuracy
          </p>
          <MiniBarChart bars={accuracyBars} />
          <p className="mt-1.5 font-mono text-[9px] text-ink-3">Last 7 days</p>
        </div>

        {/* Mastered */}
        <div>
          <p className="mb-2 font-manrope text-[11px] font-[800] text-ink leading-none">
            Mastered
          </p>
          <MiniBarChart bars={velocityBars} />
          <p className="mt-1.5 font-mono text-[9px] text-ink-3">Last 4 weeks</p>
        </div>
      </div>

      {/* Deck Difficulty — capped at 5 hardest courses */}
      {easeByCourse.length > 0 && (
        <div className="mt-4 border-t-2 border-ink/10 pt-4">
          <p className="mb-2.5 font-mono text-[10px] uppercase tracking-widest text-ink-2">
            Deck Difficulty
          </p>
          <div className="flex flex-col gap-2">
            {easeByCourse.slice(0, 5).map((c) => {
              const { label, color } = easeDifficulty(c.avgEase);
              const barPct = Math.min(
                ((c.avgEase - 1.3) / (3.5 - 1.3)) * 100,
                100,
              );
              return (
                <Link
                  key={c.courseId}
                  href={`/c/${c.slug}`}
                  className="group flex items-center gap-3"
                >
                  <p className="w-28 shrink-0 truncate font-manrope text-xs font-[700] text-ink transition-colors group-hover:text-orange-text">
                    {c.title}
                  </p>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
                    <div
                      className="h-full rounded-full transition-[width]"
                      style={{ width: `${barPct}%`, backgroundColor: color }}
                    />
                  </div>
                  <span
                    className="w-14 shrink-0 text-right font-mono text-[10px]"
                    style={{ color }}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
          {easeByCourse.length > 5 && (
            <Link
              href="/library"
              className="mt-2 block font-mono text-[10px] text-ink-3 transition-colors hover:text-orange-text"
            >
              and {easeByCourse.length - 5} more →
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
