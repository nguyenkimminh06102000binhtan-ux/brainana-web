"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui-icons";

type NavItem = {
  label: string;
  href: string;
  icon: "home" | "compass" | "library" | "plus" | "users" | "sparkles";
  external?: boolean;
};

export default function MobileNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="grid grid-cols-5 rounded-[1.35rem] border-2 border-ink bg-paper p-1.5 shadow-hard-sm lg:hidden"
    >
      {items.map((item) => {
        const active = !item.external && (pathname === item.href || (item.href !== "/home" && pathname.startsWith(item.href)));
        const className = `flex min-h-14 flex-col items-center justify-center gap-1 rounded-[1.1rem] border-2 px-1 text-center font-manrope text-[0.68rem] font-[800] leading-none transition active:scale-95 ${
          active ? "border-ink bg-orange text-on-bright shadow-hard-red" : "border-transparent text-ink-2 hover:border-ink hover:bg-yellow-soft hover:text-ink"
        }`;
        const content = (
          <>
            <Icon name={item.icon} className="h-5 w-5" />
            <span className="max-w-full truncate">{item.label}</span>
          </>
        );
        return item.external ? (
          <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
            {content}
          </a>
        ) : (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={className}>
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
