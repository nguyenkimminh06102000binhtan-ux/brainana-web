"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui-icons";

const STORAGE_KEY = "brainana_origin_language_guide_seen";

type AnchorRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export default function OriginLanguageGuide() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [rect, setRect] = useState<AnchorRect | null>(null);

  const shouldShow = searchParams.get("guide") === "origin-language";

  useEffect(() => {
    if (!shouldShow) return;
    if (window.localStorage.getItem(STORAGE_KEY) === "1") {
      clearGuideParam();
      return;
    }

    const target = document.querySelector<HTMLElement>("[data-origin-language-button]");
    if (!target) return;
    const guideTarget = target;

    function updateRect() {
      const next = guideTarget.getBoundingClientRect();
      setRect({
        left: next.left,
        top: next.top,
        width: next.width,
        height: next.height,
      });
    }

    const frame = window.requestAnimationFrame(() => {
      updateRect();
      setVisible(true);
    });
    guideTarget.focus({ preventScroll: true });
    guideTarget.classList.add("origin-language-guide-target");

    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      window.cancelAnimationFrame(frame);
      guideTarget.classList.remove("origin-language-guide-target");
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [shouldShow]); // eslint-disable-line react-hooks/exhaustive-deps

  const cardStyle = useMemo(() => {
    if (!rect) return undefined;
    const width = Math.min(340, window.innerWidth - 32);
    const left = Math.min(Math.max(16, rect.left + rect.width - width), window.innerWidth - width - 16);
    const preferTop = rect.top > 240;
    const top = preferTop
      ? Math.max(16, rect.top - 220)
      : Math.min(window.innerHeight - 240, rect.top + rect.height + 18);

    return { left, top, width };
  }, [rect]);

  function clearGuideParam() {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("guide");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function dismiss() {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
    document
      .querySelector<HTMLElement>("[data-origin-language-button]")
      ?.classList.remove("origin-language-guide-target");
    clearGuideParam();
  }

  function openSwitcher() {
    document.querySelector<HTMLButtonElement>("[data-origin-language-button]")?.click();
    dismiss();
  }

  if (!visible || !rect || !cardStyle) return null;

  return (
    <div className="fixed inset-0 z-[110] pointer-events-none">
      <div className="absolute inset-0 bg-ink/20 backdrop-blur-[1px]" />
      <div
        className="pointer-events-auto fixed rounded-[1.25rem] border-2 border-ink bg-paper-2 p-5 text-ink shadow-hard"
        style={cardStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="origin-language-guide-title"
      >
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink bg-yellow-soft shadow-hard-sm">
          <Icon name="sparkles" className="h-5 w-5 text-orange-text" />
        </div>
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Origin languages</p>
        <h2 id="origin-language-guide-title" className="mt-1 font-fredoka text-2xl font-[700] leading-tight">
          Switch your learning context here
        </h2>
        <p className="mt-3 font-manrope text-sm leading-6 text-ink-2">
          You can add multiple origin languages, then switch to the one you need. Brainana uses this to localize labels and show courses from that language context.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={openSwitcher}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border-2 border-ink bg-orange px-4 py-2 font-manrope text-sm font-[800] text-on-bright shadow-hard-red transition active:translate-y-[1px]"
          >
            Try it <Icon name="arrowRight" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border-2 border-ink bg-paper px-4 py-2 font-manrope text-sm font-[800] text-ink shadow-hard-sm transition active:translate-y-[1px]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
