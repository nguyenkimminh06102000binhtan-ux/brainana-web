"use client";

import { useRouter } from "next/navigation";

export default function BrowseSort({
  value,
  labels,
}: {
  value: string;
  labels: { sort: string; mostLoved: string; topRated: string; newest: string };
}) {
  const router = useRouter();

  const OPTIONS = [
    { value: "learner_count", label: labels.mostLoved },
    { value: "rating",        label: labels.topRated  },
    { value: "newest",        label: labels.newest    },
  ];

  function setSort(sort: string) {
    const params = new URLSearchParams(window.location.search);
    params.set("sort", sort);
    router.replace(`/browse?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs uppercase tracking-widest text-ink-2">{labels.sort}</span>
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
