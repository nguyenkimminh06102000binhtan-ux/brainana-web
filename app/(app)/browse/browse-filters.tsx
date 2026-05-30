"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CATEGORY_TREE } from "@/app/constants/categories";

export default function BrowseFilters({
  initialQ,
  selectedSubcategories,
  level,
  minCards,
  hasAudio,
  hasMems,
  hasImages,
  labels,
}: {
  initialQ: string;
  selectedSubcategories: string[];
  level: string;
  minCards: number;
  hasAudio: boolean;
  hasMems: boolean;
  hasImages: boolean;
  labels: {
    searchPlaceholder: string;
    category: string;
    level: string;
    size: string;
    has: string;
    any: string;
    beginner: string;
    intermediate: string;
    advanced: string;
    audio: string;
    mems: string;
    images: string;
    clearAllFilters: string;
    categoryLabels: Record<string, string>;
  };
}) {
  const categoriesWithSubs = new Set(
    CATEGORY_TREE
      .filter((g) => g.items.some((i) => selectedSubcategories.includes(i)))
      .map((g) => g.label)
  );

  const [expanded, setExpanded] = useState<Set<string>>(categoriesWithSubs);

  const LEVELS = [
    { value: "", label: labels.any },
    { value: "beginner", label: labels.beginner },
    { value: "intermediate", label: labels.intermediate },
    { value: "advanced", label: labels.advanced },
  ];

  const router = useRouter();
  const [sliderValue, setSliderValue] = useState(minCards);

  function update(updates: Record<string, string | null>) {
    const params = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    router.replace(`/browse?${params.toString()}`);
  }

  function toggleExpanded(cat: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function toggleSubcategory(item: string) {
    const next = selectedSubcategories.includes(item)
      ? selectedSubcategories.filter((s) => s !== item)
      : [...selectedSubcategories, item];
    update({ subcategories: next.length > 0 ? next.join(",") : null });
  }

  const hasAnyFilter = selectedSubcategories.length > 0 || level || minCards > 0 || hasAudio || hasMems || hasImages;

  return (
    <aside className="flex flex-col gap-6 rounded-xl bg-paper-2 p-5 shadow-hard">
      {/* Search */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const q = (e.currentTarget.elements.namedItem("q") as HTMLInputElement).value.trim();
          update({ q: q || null });
        }}
      >
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-2">🔍</span>
          <input
            name="q"
            defaultValue={initialQ}
            placeholder={labels.searchPlaceholder}
            autoComplete="off"
            className="w-full rounded-full border-2 border-dashed border-ink/20 bg-paper py-2 pl-9 pr-4 font-manrope text-sm text-ink outline-none placeholder:text-ink-3 focus:border-orange"
          />
        </div>
      </form>

      {/* Category accordion */}
      <section>
        <p className="mb-2.5 font-mono text-xs uppercase tracking-widest text-ink-2">{labels.category}</p>
        <div className="flex flex-col gap-0.5">
          {CATEGORY_TREE.map((group) => {
            const isExpanded = expanded.has(group.label);
            const selectedInGroup = group.items.filter((i) => selectedSubcategories.includes(i));
            const translatedLabel = labels.categoryLabels[group.label] ?? group.label;

            return (
              <div key={group.label}>
                <button
                  type="button"
                  onClick={() => toggleExpanded(group.label)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 transition hover:bg-paper"
                >
                  <span className={`font-manrope text-sm ${selectedInGroup.length > 0 ? "font-[700] text-ink" : "text-ink-2"}`}>
                    {translatedLabel}
                    {selectedInGroup.length > 0 && (
                      <span className="ml-1.5 rounded-full bg-orange px-1.5 py-0.5 font-mono text-xs leading-none text-on-bright">
                        {selectedInGroup.length}
                      </span>
                    )}
                  </span>
                  <span className={`shrink-0 font-mono text-xs text-ink-3 transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}>
                    ▶
                  </span>
                </button>

                {isExpanded && (
                  <div className="mb-1.5 ml-2 mt-0.5 flex flex-col gap-1 border-l-2 border-ink/10 pl-3">
                    {group.items.map((item) => {
                      const checked = selectedSubcategories.includes(item);
                      const translatedItem = labels.categoryLabels[item] ?? item;
                      return (
                        <label key={item} className="flex cursor-pointer items-center gap-2">
                          <span
                            onClick={() => toggleSubcategory(item)}
                            className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border-2 transition ${
                              checked ? "border-orange bg-orange" : "border-ink/25 bg-paper"
                            }`}
                          />
                          <span
                            onClick={() => toggleSubcategory(item)}
                            className={`font-manrope text-xs transition ${checked ? "font-[700] text-ink" : "text-ink-2"}`}
                          >
                            {translatedItem}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Level */}
      <section>
        <p className="mb-2.5 font-mono text-xs uppercase tracking-widest text-ink-2">{labels.level}</p>
        <div className="flex flex-wrap gap-1.5">
          {LEVELS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => update({ level: value || null })}
              className={`cursor-pointer rounded-full px-3.5 py-1.5 font-manrope text-sm font-[700] shadow-hard-sm transition active:translate-y-[1px] ${
                level === value
                  ? "bg-orange text-on-bright"
                  : "bg-paper text-ink hover:bg-orange hover:text-on-bright"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Size */}
      <section>
        <p className="mb-2.5 font-mono text-xs uppercase tracking-widest text-ink-2">{labels.size}</p>
        <input
          type="range"
          min={0}
          max={2000}
          step={25}
          value={sliderValue}
          onChange={(e) => setSliderValue(Number(e.target.value))}
          onMouseUp={() => update({ min_cards: sliderValue > 0 ? String(sliderValue) : null })}
          onTouchEnd={() => update({ min_cards: sliderValue > 0 ? String(sliderValue) : null })}
          className="w-full accent-orange"
        />
        <div className="mt-1 flex justify-between font-mono text-xs text-ink-2">
          <span>0</span>
          <span className="font-[700] text-ink">
            {sliderValue >= 2000 ? "2k+" : sliderValue} min
          </span>
          <span>2k+</span>
        </div>
      </section>

      {/* Has */}
      <section>
        <p className="mb-2.5 font-mono text-xs uppercase tracking-widest text-ink-2">{labels.has}</p>
        <div className="flex flex-col gap-2.5">
          <Toggle label={labels.audio}  active={hasAudio}  onToggle={() => update({ has_audio:  hasAudio  ? null : "1" })} />
          <Toggle label={labels.mems}   active={hasMems}   onToggle={() => update({ has_mems:   hasMems   ? null : "1" })} />
          <Toggle label={labels.images} active={hasImages} onToggle={() => update({ has_images: hasImages ? null : "1" })} />
        </div>
      </section>

      {/* Clear */}
      {hasAnyFilter && (
        <button
          type="button"
          onClick={() => { setSliderValue(0); router.replace("/browse"); }}
          className="cursor-pointer rounded-full bg-paper px-4 py-2 font-manrope text-sm font-[700] text-ink-2 shadow-hard-sm transition hover:text-orange-text"
        >
          {labels.clearAllFilters}
        </button>
      )}
    </aside>
  );
}

function Toggle({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-manrope text-sm text-ink">{label}</span>
      <button
        type="button"
        onClick={onToggle}
        className={`cursor-pointer relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          active ? "bg-orange" : "bg-ink/20"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
            active ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
