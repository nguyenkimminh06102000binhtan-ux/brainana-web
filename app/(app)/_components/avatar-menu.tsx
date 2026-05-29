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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-yellow font-mono text-sm font-[800] text-on-bright transition hover:ring-2 hover:ring-orange"
      >
        {avatarUrl ? (
          <Image src={avatarUrl} alt={initial} width={40} height={40} className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 min-w-44 overflow-hidden rounded-xl bg-paper-2 shadow-hard">
          <Link
            href={`/u/${username}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-3 font-manrope text-sm font-[700] text-ink transition hover:bg-blue hover:text-ocean"
          >
            <span>👤</span> {labels.profile}
          </Link>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-3 font-manrope text-sm font-[700] text-ink transition hover:bg-blue hover:text-ocean"
          >
            <span>⚙️</span> {labels.settings}
          </Link>
          <div className="mx-4 border-t border-ink/10" />
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 px-4 py-3 font-manrope text-sm font-[700] text-orange-text transition hover:bg-red-soft"
            >
              <span>🚪</span> {labels.logout}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
