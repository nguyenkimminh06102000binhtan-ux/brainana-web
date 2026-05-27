"use client";

import Link from "next/link";
import type { SessionStats } from "./types";

interface ResultsScreenProps {
  courseSlug: string;
  stats: SessionStats;
  totalCards: number;
  onStudyMore: () => void;
}

export default function ResultsScreen({
  courseSlug,
  stats,
  totalCards,
  onStudyMore,
}: ResultsScreenProps) {
  const correctRate =
    totalCards > 0 ? Math.round((stats.correct / totalCards) * 100) : 0;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-10">
      {/* Mascot */}
      <div className="relative">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange text-4xl shadow-hard-red">
          🧠
        </div>
        <div className="absolute -right-2 -top-2 rounded-full bg-yellow-soft px-2 py-0.5 font-manrope text-xs font-[700] text-ink">
          +{stats.xpEarned} XP
        </div>
      </div>

      <div className="text-center">
        <p className="font-kalam text-2xl text-ink">Brain fed!</p>
        <p className="mt-1 font-manrope text-sm text-ink-2">
          Great session — keep it up!
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid w-full grid-cols-2 gap-3">
        <StatCard label="Cards studied" value={String(totalCards)} />
        <StatCard label="Correct rate" value={`${correctRate}%`} />
        <StatCard label="XP earned" value={`+${stats.xpEarned}`} />
        <StatCard label="Streak" value={`${stats.updatedStreak} 🔥`} />
      </div>

      {/* Mastered callout */}
      {stats.masteredCount > 0 && (
        <div className="w-full rounded-sm border-2 border-green bg-green-soft px-4 py-3 text-center">
          <p className="font-manrope text-sm font-[700] text-ink">
            🎓 You mastered {stats.masteredCount} new{" "}
            {stats.masteredCount === 1 ? "card" : "cards"}!
          </p>
        </div>
      )}

      {/* Buttons */}
      <div className="flex w-full flex-col gap-2">
        <button
          type="button"
          onClick={onStudyMore}
          className="w-full cursor-pointer rounded-full bg-orange px-4 py-3 font-manrope text-sm font-[800] text-white shadow-hard-red transition hover:opacity-90 active:translate-y-[1px]"
        >
          Study more →
        </button>
        <Link
          href={`/c/${courseSlug}`}
          className="w-full rounded-full border-2 border-ink/20 px-4 py-3 text-center font-manrope text-sm font-[700] text-ink-2 transition hover:border-ink/40"
        >
          ← Back to course
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm bg-paper-2 p-4 shadow-hard-sm text-center">
      <p className="font-fredoka text-2xl font-[600] text-ink">{value}</p>
      <p className="mt-0.5 font-manrope text-xs text-ink-3">{label}</p>
    </div>
  );
}
