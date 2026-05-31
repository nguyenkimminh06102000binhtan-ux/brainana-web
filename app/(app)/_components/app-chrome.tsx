"use client";

import { usePathname } from "next/navigation";

export default function AppChrome({ header, children }: { header: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav = pathname.startsWith("/study/") || pathname.startsWith("/learn/");

  return (
    <>
      {!hideNav && header}
      <main id="main-content" className={`flex-1 ${hideNav ? "" : "pb-40 lg:pb-0"}`}>
        {children}
      </main>
    </>
  );
}
