"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui-icons";

type NavItem = { label: string; href: string; icon: "home" | "compass" | "library" | "plus" | "users" };

export default function MobileNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="grid grid-cols-5 rounded-[1.35rem] border border-ink/10 bg-paper p-1.5 shadow-hard-sm lg:hidden"
    >
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== "/home" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-[1.1rem] px-1 text-center font-manrope text-[0.68rem] font-[800] leading-none transition active:scale-95 ${
              active ? "bg-orange text-on-bright shadow-hard-red" : "text-ink-2 hover:bg-paper hover:text-ink"
            }`}
          >
            <Icon name={item.icon} className="h-5 w-5" />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
