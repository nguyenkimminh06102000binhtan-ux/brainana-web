"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui-icons";

const STORAGE_KEY = "brainana-theme";
type Theme = "light" | "dark";

function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "dark" || saved === "light") setThemeState(saved);
      else if (document.documentElement.dataset.theme === "dark") setThemeState("dark");
      setReady(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  function setTheme(t: Theme) {
    setThemeState(t);
    document.documentElement.dataset.theme = t;
    window.localStorage.setItem(STORAGE_KEY, t);
  }

  return { theme, setTheme, ready };
}

export function ThemeToggleFixed() {
  const { theme, setTheme, ready } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`fixed right-4 top-4 z-50 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-paper text-ink shadow-hard-sm transition active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange sm:right-6 sm:top-6 ${ready ? "opacity-100" : "opacity-0"}`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
    >
      <Icon name={isDark ? "moon" : "sun"} className="h-5 w-5" />
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
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-paper text-ink shadow-hard-sm transition active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange ${ready ? "opacity-100" : "opacity-0"}`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
    >
      <Icon name={isDark ? "moon" : "sun"} className="h-5 w-5" />
    </button>
  );
}
