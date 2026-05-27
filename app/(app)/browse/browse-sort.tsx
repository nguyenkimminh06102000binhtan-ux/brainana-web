"use client";

import { useRouter } from "next/navigation";

const OPTIONS = [
  { value: "learner_count", label: "Most loved" },
  { value: "rating",        label: "Top rated"  },
  { value: "newest",        label: "Newest"     },
];

export default function BrowseSort({ value }: { value: string }) {
  const router = useRouter();

  function setSort(sort: string) {
    const params = new URLSearchParams(window.location.search);
    params.set("sort", sort);
    router.replace(`/browse?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs uppercase tracking-widest text-ink-2">Sort:</span>
      <div className="flex gap-1.5">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setSort(opt.value)}
            className={`cursor-pointer rounded-full px-4 py-1.5 font-manrope text-sm font-[700] shadow-hard-sm transition active:translate-y-[1px] ${
              value === opt.value
                ? "bg-paper-2 text-ink"
                : "bg-paper text-ink-2 hover:text-ink"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
