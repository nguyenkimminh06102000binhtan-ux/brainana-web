export default function PageLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div
      className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 rounded-full bg-paper-2 px-5 py-3 shadow-hard-sm">
        <span className="relative inline-flex h-8 w-8 items-center justify-center" aria-hidden="true">
          <span className="absolute h-8 w-8 rounded-full border-4 border-orange/20" />
          <span className="absolute h-8 w-8 animate-spin rounded-full border-4 border-transparent border-t-orange" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow" />
        </span>
        <span className="font-manrope text-sm font-[800] text-ink-2">{label}</span>
      </div>
    </div>
  );
}
