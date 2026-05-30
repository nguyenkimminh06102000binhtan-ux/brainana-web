"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { logout } from "../actions";

interface AvatarMenuProps {
  avatarUrl: string | null;
  initial: string;
  username: string;
  labels: { profile: string; settings: string; logout: string };
}

export default function AvatarMenu({ avatarUrl, initial, username, labels }: AvatarMenuProps) {
  const [open, setOpen] = useState(false);
  const ref        = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Escape closes, arrow keys move focus
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const menu = ref.current?.querySelector<HTMLElement>('[role="menu"]');
        if (!menu) return;
        const items = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]'));
        const idx = items.indexOf(document.activeElement as HTMLElement);
        const next = e.key === "ArrowDown"
          ? items[(idx + 1) % items.length]
          : items[(idx - 1 + items.length) % items.length];
        next?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Move focus into menu when it opens
  useEffect(() => {
    if (!open) return;
    const first = ref.current?.querySelector<HTMLElement>('[role="menuitem"]');
    first?.focus();
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-yellow font-mono text-sm font-[800] text-on-bright transition hover:ring-2 hover:ring-orange"
      >
        {avatarUrl ? (
          <Image src={avatarUrl} alt="Your avatar" width={40} height={40} className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden="true">{initial}</span>
        )}
      </button>

      {open && (
        <div role="menu" aria-label="Account menu" className="absolute right-0 top-12 z-50 min-w-44 overflow-hidden rounded-xl bg-paper-2 shadow-hard">
          <Link
            href={`/u/${username}`}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-3 font-manrope text-sm font-[700] text-ink transition hover:bg-blue hover:text-ocean"
          >
            <span aria-hidden="true">👤</span> {labels.profile}
          </Link>
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-3 font-manrope text-sm font-[700] text-ink transition hover:bg-blue hover:text-ocean"
          >
            <span aria-hidden="true">⚙️</span> {labels.settings}
          </Link>
          <div className="mx-4 border-t border-ink/10" role="separator" />
          <form action={logout}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-4 py-3 font-manrope text-sm font-[700] text-orange-text transition hover:bg-red-soft"
            >
              <span aria-hidden="true">🚪</span> {labels.logout}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
