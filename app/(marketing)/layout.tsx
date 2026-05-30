import { ThemeToggleFixed } from "../theme-toggle";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ThemeToggleFixed />
    </>
  );
}
