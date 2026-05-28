"use client";

interface ExitConfirmProps {
  onConfirm: () => void;
  onCancel: () => void;
  labels: { exitSession: string; exitConfirm: string; exit: string; keepStudying: string };
}

export default function ExitConfirm({ onConfirm, onCancel, labels }: ExitConfirmProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg bg-paper-2 p-6 shadow-hard">
        <h2 className="font-fredoka text-xl font-[600] text-ink">{labels.exitSession}</h2>
        <p className="mt-2 font-manrope text-sm text-ink-2">
          {labels.exitConfirm}
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 cursor-pointer rounded-full bg-orange px-4 py-2.5 font-manrope text-sm font-[800] text-white shadow-hard-red transition hover:opacity-90 active:translate-y-[1px]"
          >
            {labels.exit}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 cursor-pointer rounded-full border-2 border-ink/20 px-4 py-2.5 font-manrope text-sm font-[700] text-ink-2 transition hover:border-ink/40"
          >
            {labels.keepStudying}
          </button>
        </div>
      </div>
    </div>
  );
}
