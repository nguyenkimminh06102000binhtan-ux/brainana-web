"use client";

interface TopBarProps {
  courseTitle: string;
  current: number;
  total: number;
  onClose: () => void;
  labels: { allSections: string };
}

export default function TopBar({ courseTitle, current, total, onClose, labels }: TopBarProps) {
  const pct = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="sticky top-0 z-10 bg-paper-2/95 backdrop-blur-sm">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-manrope text-xs font-[600] text-ink-3 uppercase tracking-wider">
            {courseTitle}
          </p>
          <p className="font-mono text-xs text-ink-3">{labels.allSections}</p>
        </div>
        <p className="font-mono text-sm font-[600] text-ink shrink-0">
          {current} / {total}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close session"
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-ink/20 text-ink-2 transition hover:border-ink/40 hover:text-ink active:scale-95"
        >
          ✕
        </button>
      </div>
      <div className="h-1.5 w-full bg-ink/10">
        <div
          className="h-full bg-orange transition-all duration-300 motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
