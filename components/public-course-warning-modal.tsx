"use client";

interface Labels {
  publicWarningTitle: string;
  publicWarningSubtitle: string;
  publicWarningLock: string;
  publicWarningNoDelete: string;
  publicWarningVisible: string;
  publicWarningConfirm: string;
  publicWarningBack: string;
  publicWarningIrreversible?: string;
}

interface Props {
  labels: Labels;
  showIrreversible?: boolean;
  onConfirm: () => void;
  onBack: () => void;
}

export default function PublicCourseWarningModal({ labels, showIrreversible, onConfirm, onBack }: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-paper/80 px-4 backdrop-blur-sm">
      <div className="fixed inset-0 z-0" onClick={onBack} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-paper-2 p-6 shadow-hard">
        <h2 className="font-fredoka text-2xl font-[700] text-ink">{labels.publicWarningTitle}</h2>
        <p className="mt-1 font-manrope text-sm text-ink-2">{labels.publicWarningSubtitle}</p>

        <ul className="mt-4 flex flex-col gap-2">
          {[
            { icon: "🔒", text: labels.publicWarningLock },
            { icon: "🚫", text: labels.publicWarningNoDelete },
            { icon: "🌍", text: labels.publicWarningVisible },
            ...(showIrreversible && labels.publicWarningIrreversible
              ? [{ icon: "⚠️", text: labels.publicWarningIrreversible }]
              : []),
          ].map(({ icon, text }) => (
            <li key={text} className="flex items-start gap-3 rounded-lg bg-paper px-4 py-3">
              <span className="mt-0.5 shrink-0 text-base">{icon}</span>
              <span className="font-manrope text-sm text-ink">{text}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-full bg-orange py-3 font-manrope text-sm font-[800] text-on-bright shadow-hard-red transition hover:opacity-90 active:translate-y-[1px] active:shadow-hard-sm"
          >
            {labels.publicWarningConfirm}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="flex-1 rounded-full bg-paper py-3 font-manrope text-sm font-[800] text-ink shadow-hard-sm transition hover:bg-paper-2 active:translate-y-[1px] active:shadow-none"
          >
            {labels.publicWarningBack}
          </button>
        </div>
      </div>
    </div>
  );
}
