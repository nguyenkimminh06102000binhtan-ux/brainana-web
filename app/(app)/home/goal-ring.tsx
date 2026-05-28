"use client";

interface GoalRingProps {
  studied: number;
  goal: number;
  courseSlug: string | null;
}

export default function GoalRing({ studied, goal, courseSlug }: GoalRingProps) {
  const pct = goal > 0 ? Math.min(studied / goal, 1) : 0;
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dash = pct * circumference;
  const done = studied >= goal;

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-2">
        Today · Goal {goal}
      </p>

      <div className="relative h-28 w-28">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          {/* Track */}
          <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-ink/10" />
          {/* Progress */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={done ? "#4ade80" : "#f97316"}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-fredoka text-2xl font-[700] leading-none text-ink">{studied}</span>
          <span className="font-mono text-[10px] text-ink-3">/ {goal}</span>
        </div>
      </div>

      {done ? (
        <p className="font-manrope text-sm font-[700] text-green-600">Goal reached! 🎉</p>
      ) : courseSlug ? (
        <a
          href={`/study/${courseSlug}`}
          className="rounded-full bg-orange px-5 py-2 font-manrope text-sm font-[800] text-white shadow-hard-sm transition hover:opacity-90 active:translate-y-[1px]"
        >
          Continue →
        </a>
      ) : (
        <a
          href="/browse"
          className="rounded-full bg-paper px-5 py-2 font-manrope text-sm font-[800] text-ink shadow-hard-sm transition hover:bg-orange hover:text-white active:translate-y-[1px]"
        >
          Browse →
        </a>
      )}
    </div>
  );
}
