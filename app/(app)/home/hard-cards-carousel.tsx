"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui-icons";

export type CarouselCard = {
  itemId: string;
  courseSlug: string;
  courseTitle: string;
  frontText: string;
  backText: string;
  reason: string;
  incorrectCount: number;
  isDue: boolean;
};

const CARD_W = 208; // w-52
const GAP = 12;     // gap-3
const SCROLL_BY = (CARD_W + GAP) * 2;

export default function HardCardsCarousel({ cards }: { cards: CarouselCard[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 2);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    sync();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sync]);

  function scroll(dir: "left" | "right") {
    ref.current?.scrollBy({ left: dir === "right" ? SCROLL_BY : -SCROLL_BY, behavior: "smooth" });
  }

  return (
    // overflow-hidden on the root element is the critical containment boundary —
    // without it the flex children push the grid column (and the whole page) wider.
    <div className="overflow-hidden">
      {/* Header with arrow buttons */}
      <div className="mb-3 flex items-center gap-2">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Hard cards</p>
        <span className="font-mono text-xs text-ink-3">·</span>
        <h2 className="flex-1 font-fredoka text-2xl font-[700] tracking-tight">Words to tame</h2>
        <div className="flex gap-1.5">
          <button
            onClick={() => scroll("left")}
            disabled={!canLeft}
            aria-label="Scroll left"
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-paper shadow-hard-sm transition hover:bg-paper-2 disabled:opacity-30 disabled:shadow-none active:translate-y-[1px]"
          >
            <Icon name="chevronLeft" className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canRight}
            aria-label="Scroll right"
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-paper shadow-hard-sm transition hover:bg-paper-2 disabled:opacity-30 disabled:shadow-none active:translate-y-[1px]"
          >
            <Icon name="chevronRight" className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Scrollable row */}
      <div
        ref={ref}
        onScroll={sync}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {cards.map((card) => (
          <Link
            key={card.itemId}
            href={`/c/${card.courseSlug}`}
            className="w-52 shrink-0 snap-start rounded-[1rem] border-2 border-ink bg-paper px-4 py-3 shadow-hard-sm transition hover:-translate-y-0.5 hover:bg-red-soft"
          >
            <span className="inline-block rounded-full border-2 border-ink bg-red-soft px-2 py-0.5 font-mono text-[10px] font-[800] uppercase text-orange-text">
              {card.reason}
            </span>
            <p className="mt-2 line-clamp-3 font-fredoka text-base font-[700] leading-tight text-ink">
              {card.frontText}
            </p>
            <p className="mt-1 line-clamp-2 font-manrope text-xs leading-5 text-ink-2">
              {card.backText}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-3">
              <span className="truncate">{card.courseTitle}</span>
              {card.isDue && <span>due</span>}
              {card.incorrectCount > 0 && <span>{card.incorrectCount} misses</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
