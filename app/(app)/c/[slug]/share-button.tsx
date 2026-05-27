"use client";

import { useState } from "react";

export default function ShareButton({ title, slug }: { title: string; slug: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = `${window.location.origin}/c/${slug}`;
    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="cursor-pointer rounded-full bg-paper px-5 py-2.5 font-manrope text-sm font-[800] text-ink shadow-hard-sm transition hover:bg-paper active:translate-y-[1px] active:shadow-none"
    >
      {copied ? "Copied!" : "Share"}
    </button>
  );
}
