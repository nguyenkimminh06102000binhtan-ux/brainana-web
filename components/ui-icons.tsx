import type { ReactNode, SVGProps } from "react";

type IconName =
  | "creditCard"
  | "arrowRight"
  | "bookOpen"
  | "check"
  | "chevronRight"
  | "compass"
  | "filter"
  | "flame"
  | "grid"
  | "home"
  | "library"
  | "logOut"
  | "menu"
  | "moon"
  | "plus"
  | "search"
  | "settings"
  | "sparkles"
  | "sun"
  | "user"
  | "users"
  | "x";

const paths: Record<IconName, ReactNode> = {
  creditCard: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  bookOpen: <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H7a3 3 0 0 0-3 3V5.5Zm0 0V21M20 3v15" />,
  check: <path d="m5 12 4 4L19 6" />,
  chevronRight: <path d="m9 18 6-6-6-6" />,
  compass: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm3.5-12.5-2 5-5 2 2-5 5-2Z" />,
  filter: <path d="M4 5h16M7 12h10M10 19h4" />,
  flame: <path d="M12 22c4 0 7-2.7 7-6.7 0-2.2-1.1-4.4-3.1-6.1.1 2-1 3.1-2.1 3.8.3-3-1.2-5.4-4.3-7.8.2 3.2-1.1 5-2.7 6.8A6 6 0 0 0 5 15.3C5 19.3 8 22 12 22Z" />,
  grid: <path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z" />,
  home: <path d="M3 11.5 12 4l9 7.5M5 10v10h14V10M9 20v-6h6v6" />,
  library: <path d="M5 4h4v16H5V4Zm5.5 0h4v16h-4V4Zm5.5 1 3 14-3 .7-3-14L16 5Z" />,
  logOut: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  moon: <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  search: <path d="m21 21-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />,
  settings: <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Zm7.4-3.5c0-.5-.1-1-.2-1.5l2-1.5-2-3.5-2.4 1a8 8 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.6A8 8 0 0 0 7 6.6l-2.4-1-2 3.5 2 1.5a7 7 0 0 0 0 3l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 2.6 1.5L10 21.5h4l.4-2.6a8 8 0 0 0 2.6-1.5l2.4 1 2-3.5-2-1.5c.1-.4.2-.9.2-1.4Z" />,
  sparkles: <path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Zm6 10 1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5ZM5 13l.9 2.1L8 16l-2.1.9L5 19l-.9-2.1L2 16l2.1-.9L5 13Z" />,
  sun: <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />,
  user: <path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />,
  users: <path d="M16 21a6 6 0 0 0-12 0M10 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21a5.5 5.5 0 0 0-4-5.3M16 3.3a4 4 0 0 1 0 7.4" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
};

export function Icon({ name, className = "h-5 w-5", ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
