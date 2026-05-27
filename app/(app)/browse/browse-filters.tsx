"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const ALL_CATEGORIES = [
  "Language", "Science", "History", "Math",
  "Geography", "Literature", "Music", "Art", "Technology",
];

const LEVELS = [
  { value: "", label: "Any" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Inter" },
  { value: "advanced", label: "Adv" },
];

export default function BrowseFilters({
  initialQ,
  selectedCategories,
  level,
  minCards,
  hasAudio,
  hasMems,
  hasImages,
}: {
  initialQ: string;
  selectedCategories: string[];
  level: string;
  minCards: number;
  hasAudio: boolean;
  hasMems: boolean;
  hasImages: boolean;
}) {
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

  function toggleCategory(cat: string) {
    const next = selectedCategories.includes(cat)
      ? selectedCategories.filter((c) => c !== cat)
      : [...selectedCategories, cat];
    update({ categories: next.length > 0 ? next.join(",") : null });
  }

  const hasAnyFilter =
    selectedCategories.length > 0 || level || minCards > 0 || hasAudio || hasMems || hasImages;

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
            placeholder="Search courses..."
            autoComplete="off"
            className="w-full rounded-full border-2 border-dashed border-ink/20 bg-paper py-2 pl-9 pr-4 font-manrope text-sm text-ink outline-none placeholder:text-ink-3 focus:border-orange"
          />
        </div>
      </form>

      {/* Category */}
      <section>
        <p className="mb-2.5 font-mono text-xs uppercase tracking-widest text-ink-2">Category</p>
        <div className="flex flex-col gap-2">
          {ALL_CATEGORIES.map((cat) => {
            const checked = selectedCategories.includes(cat);
            return (
              <label key={cat} className="flex cursor-pointer items-center gap-2.5">
                <span
                  onClick={() => toggleCategory(cat)}
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition ${
                    checked ? "border-orange bg-orange" : "border-ink/25 bg-paper"
                  }`}
                >
                  {checked && <span className="font-mono text-[9px] font-[900] text-white">✓</span>}
                </span>
                <span
                  onClick={() => toggleCategory(cat)}
                  className={`font-manrope text-sm transition ${checked ? "font-[700] text-ink" : "text-ink-2"}`}
                >
                  {cat}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      {/* Level */}
      <section>
        <p className="mb-2.5 font-mono text-xs uppercase tracking-widest text-ink-2">Level</p>
        <div className="flex flex-wrap gap-1.5">
          {LEVELS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => update({ level: value || null })}
              className={`cursor-pointer rounded-full px-3.5 py-1.5 font-manrope text-sm font-[700] shadow-hard-sm transition active:translate-y-[1px] ${
                level === value
                  ? "bg-orange text-white"
                  : "bg-paper text-ink hover:bg-orange hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Size */}
      <section>
        <p className="mb-2.5 font-mono text-xs uppercase tracking-widest text-ink-2">Size</p>
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
        <p className="mb-2.5 font-mono text-xs uppercase tracking-widest text-ink-2">Has</p>
        <div className="flex flex-col gap-2.5">
          <Toggle label="Audio"  active={hasAudio}  onToggle={() => update({ has_audio:  hasAudio  ? null : "1" })} />
          <Toggle label="Mems"   active={hasMems}   onToggle={() => update({ has_mems:   hasMems   ? null : "1" })} />
          <Toggle label="Images" active={hasImages} onToggle={() => update({ has_images: hasImages ? null : "1" })} />
        </div>
      </section>

      {/* Clear */}
      {hasAnyFilter && (
        <button
          type="button"
          onClick={() => { setSliderValue(0); router.replace("/browse"); }}
          className="cursor-pointer rounded-full bg-paper px-4 py-2 font-manrope text-sm font-[700] text-ink-2 shadow-hard-sm transition hover:text-orange"
        >
          Clear all filters
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
