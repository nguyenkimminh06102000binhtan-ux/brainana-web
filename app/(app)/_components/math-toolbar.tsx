"use client";

import { useState } from "react";

const SYMBOL_GROUPS = [
  {
    label: "Greek",
    symbols: ["α", "β", "γ", "δ", "Δ", "ε", "θ", "Θ", "λ", "μ", "π", "ρ", "σ", "Σ", "φ", "Φ", "ω", "Ω"],
  },
  {
    label: "Operators",
    symbols: ["×", "÷", "±", "≈", "≠", "≤", "≥", "∝", "∞", "√", "∛", "∂", "∫", "∬", "∑", "∏", "∇"],
  },
  {
    label: "Powers",
    symbols: ["²", "³", "⁴", "⁻¹", "⁻²", "½", "⅓", "¼"],
  },
  {
    label: "Arrows",
    symbols: ["→", "←", "↔", "⇒", "⇔", "↑", "↓"],
  },
];

interface Props {
  onInsert: (symbol: string) => void;
}

export default function MathToolbar({ onInsert }: Props) {
  const [open, setOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState(0);

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-ink/15 bg-paper px-3 py-1 font-mono text-xs text-ink-2 transition hover:border-ink/30 hover:text-ink"
      >
        <span className="text-sm">∑</span>
        <span>{open ? "Hide symbols" : "Insert symbol"}</span>
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-ink/10 bg-paper shadow-hard-sm">
          {/* Group tabs */}
          <div className="flex border-b border-ink/10">
            {SYMBOL_GROUPS.map((g, i) => (
              <button
                key={g.label}
                type="button"
                onClick={() => setActiveGroup(i)}
                className={`flex-1 px-2 py-2 font-manrope text-xs font-[700] transition ${
                  activeGroup === i
                    ? "border-b-2 border-orange text-orange-text"
                    : "text-ink-3 hover:text-ink"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* Symbols */}
          <div className="flex flex-wrap gap-1 p-2">
            {SYMBOL_GROUPS[activeGroup]?.symbols.map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => onInsert(sym)}
                className="flex h-8 min-w-[2rem] items-center justify-center rounded-md border border-ink/10 bg-paper-2 px-2 font-mono text-sm text-ink transition hover:border-orange hover:text-orange-text active:scale-95"
              >
                {sym}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
