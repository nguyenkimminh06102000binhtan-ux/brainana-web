"use client";

type StudyWordControlsLabels = {
  dontKnow: string;
  markHard: string;
  unmarkHard: string;
  ignoreWord: string;
};

export default function StudyWordControls({
  hard,
  disabled,
  showDontKnow = true,
  labels,
  onDontKnow,
  onToggleHard,
  onIgnore,
}: {
  hard: boolean;
  disabled?: boolean;
  showDontKnow?: boolean;
  labels: StudyWordControlsLabels;
  onDontKnow: () => void;
  onToggleHard: () => void;
  onIgnore: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-3 px-4 pb-6">
      {showDontKnow && (
        <button
          type="button"
          onClick={onDontKnow}
          disabled={disabled}
          className="flex min-h-12 items-center gap-2 rounded-md bg-paper-2 px-4 py-2 font-manrope text-sm font-[800] text-ink shadow-hard-sm transition hover:bg-paper active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="font-fredoka text-xl leading-none" aria-hidden="true">?</span>
          {labels.dontKnow}
        </button>
      )}
      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleHard}
          disabled={disabled}
          aria-pressed={hard}
          aria-label={hard ? labels.unmarkHard : labels.markHard}
          title={hard ? labels.unmarkHard : labels.markHard}
          className={`relative flex h-12 w-12 items-center justify-center rounded-md font-mono text-xl shadow-hard-sm transition active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50 ${
            hard ? "bg-orange text-on-bright" : "bg-paper-2 text-ink-3 hover:bg-paper hover:text-orange-text"
          }`}
        >
          <span aria-hidden="true">⚡</span>
          {hard && (
            <span
              className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-paper font-manrope text-[10px] font-[900] leading-none text-orange-text"
              aria-hidden="true"
            >
              ✓
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={onIgnore}
          disabled={disabled}
          aria-label={labels.ignoreWord}
          title={labels.ignoreWord}
          className="flex h-12 w-12 items-center justify-center rounded-md bg-paper-2 font-mono text-xl text-ink-3 shadow-hard-sm transition hover:bg-paper hover:text-electric-pink active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span aria-hidden="true">⊘</span>
        </button>
      </div>
    </div>
  );
}
