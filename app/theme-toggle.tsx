"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "brainana-theme";
type Theme = "light" | "dark";

function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "light") setThemeState(saved);
    else if (document.documentElement.dataset.theme === "dark") setThemeState("dark");
    setReady(true);
  }, []);

  function setTheme(t: Theme) {
    setThemeState(t);
    document.documentElement.dataset.theme = t;
    window.localStorage.setItem(STORAGE_KEY, t);
  }

  return { theme, setTheme, ready };
}

export function ThemeToggleFixed() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="fixed bottom-5 right-5 z-50 inline-flex cursor-pointer items-center gap-3 rounded-full bg-paper-2 px-4 py-3 font-manrope text-sm font-[800] text-ink shadow-hard transition-all duration-200 hover:-translate-y-0.5 hover:shadow-hard active:translate-y-[2px] active:shadow-hard-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
    >
      <span className="relative h-6 w-11 rounded-full bg-ink/15 shadow-hard-sm transition-colors duration-200">
        <span className={`absolute left-0 top-1 h-4 w-4 rounded-full bg-orange shadow-hard-sm transition-transform duration-200 ${isDark ? "translate-x-6" : "translate-x-1"}`} />
      </span>
      <span>{isDark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}

export default function ThemeToggle() {
  const { theme, setTheme, ready } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`flex shrink-0 items-center gap-1.5 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange ${ready ? "opacity-100" : "opacity-0"}`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
    >
      <span className="text-base leading-none">{isDark ? "🌙" : "☀️"}</span>
      <span className="relative h-6 w-11 rounded-full bg-ink/15 shadow-hard-sm transition-colors duration-200">
        <span className={`absolute left-0 top-1 h-4 w-4 rounded-full bg-orange shadow-hard-sm transition-transform duration-200 ${isDark ? "translate-x-6" : "translate-x-1"}`} />
      </span>
    </button>
  );
}
