import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import AvatarMenu from "./_components/avatar-menu";
import MobileNav from "./_components/mobile-nav";
import AppChrome from "./_components/app-chrome";
import OriginLanguageSwitcher from "@/components/origin-language-switcher";
import ThemeToggle from "@/app/theme-toggle";
import { getLocale } from "@/utils/i18n";
import { Icon } from "@/components/ui-icons";
import { BrandLogo } from "@/components/brand-logo";
import OriginLanguageGuide from "./_components/origin-language-guide";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: sub }] = await Promise.all([
    supabase.from("profiles").select("display_name, username, avatar_url, native_language, origin_languages, active_origin_language").eq("id", user.id).single(),
    supabase.from("user_subscriptions").select("plan").eq("user_id", user.id).single(),
  ]);
  const plan = (sub?.plan as string | null) ?? "free";

  const displayName = profile?.display_name ?? profile?.username ?? user.email?.split("@")[0] ?? "Learner";
  const initial = displayName[0].toUpperCase();
let originLanguages = (profile?.origin_languages as string[] | null) ?? [];
  let activeOriginLanguage = (profile?.active_origin_language as string | null) ?? null;
  const nativeLanguage = (profile?.native_language as string | null) ?? null;

  if (originLanguages.length === 0 && nativeLanguage) {
    await supabase
      .from("profiles")
      .update({ origin_languages: [nativeLanguage], active_origin_language: nativeLanguage })
      .eq("id", user.id);
    originLanguages = [nativeLanguage];
    activeOriginLanguage = nativeLanguage;
  }

  const loc = getLocale(activeOriginLanguage);

  const navItems = [
    { label: loc.app.nav.home,      href: "/home",      icon: "home" as const },
    { label: loc.app.nav.browse,    href: "/browse",    icon: "compass" as const },
    { label: loc.app.nav.library,   href: "/library",   icon: "library" as const },
    { label: loc.app.nav.create,    href: "/create",    icon: "plus" as const },
    { label: "Feature Request", href: "https://brainana.userjot.com/", icon: "sparkles" as const, external: true },
  ];

  return (
    <div className="flex min-h-screen bg-paper text-ink">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-full focus:bg-blue focus:px-4 focus:py-2 focus:font-manrope focus:text-sm focus:font-[800] focus:text-ocean focus:shadow-hard">
        Skip to main content
      </a>
      <div className="flex min-w-0 flex-1 flex-col">
        <AppChrome
          header={(
        <header className="fixed inset-x-3 bottom-3 top-auto z-40 rounded-[1.6rem] border-2 border-ink bg-paper-2/95 px-3 py-3 shadow-hard backdrop-blur sm:inset-x-4 sm:bottom-4 sm:px-5 lg:sticky lg:inset-x-auto lg:bottom-auto lg:top-4 lg:m-4 lg:rounded-full lg:px-6">
          <div className="flex items-center gap-3 lg:gap-4">

            {/* Logo */}
            <Link href="/home" className="flex shrink-0 items-center gap-3 font-fredoka text-xl font-[700] tracking-tight">
              <BrandLogo label={loc.app.brand} labelClassName="hidden sm:inline" priority />
            </Link>

            {/* Desktop nav — hidden on mobile */}
            <nav className="hidden min-w-0 flex-1 flex-wrap items-center gap-2 lg:flex">
              {navItems.map((item) => {
                const className = "inline-flex shrink-0 items-center gap-2 rounded-full border-2 border-transparent px-4 py-2 font-manrope text-sm font-[800] text-ink-2 transition hover:border-ink hover:bg-yellow-soft hover:text-ink hover:shadow-hard-sm";
                const content = (
                  <>
                    <Icon name={item.icon} className="h-4 w-4" />
                    {item.label}
                  </>
                );
                return item.external ? (
                  <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
                    {content}
                  </a>
                ) : (
                  <Link key={item.href} href={item.href} className={className}>
                    {content}
                  </Link>
                );
              })}
            </nav>

            {/* Spacer on mobile */}
            <div className="flex-1 lg:hidden" />

            {/* Desktop search */}
            <form action="/browse" className="hidden lg:block lg:min-w-48">
              <div className="relative">
                <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
                <input
                  name="q"
                  aria-label="Search courses"
                  placeholder={loc.app.searchPlaceholder}
                  className="w-full rounded-full border-2 border-ink bg-paper py-2 pl-9 pr-4 font-manrope text-sm text-ink shadow-hard-sm outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-yellow"
                />
              </div>
            </form>

            {/* Right: theme toggle, language, plan badge, avatar */}
            <div className="flex shrink-0 items-center gap-2">
              <ThemeToggle />

              <OriginLanguageSwitcher
                originLanguages={originLanguages}
                activeOriginLanguage={activeOriginLanguage}
                labels={loc.app.originLanguage}
              />

              {plan === "free" ? (
                <Link
                  href="/billing/upgrade"
                  className="inline-flex rounded-full bg-orange px-4 py-2 font-manrope text-xs font-[800] text-on-bright shadow-hard-red transition hover:opacity-90 active:translate-y-[1px]"
                >
                  ⚡ {loc.app.avatar.upgrade}
                </Link>
              ) : (
                <Link
                  href="/billing"
                  className="inline-flex rounded-full border-2 border-ink/20 px-3 py-1.5 font-mono text-xs font-[700] uppercase tracking-widest text-ink-2 transition hover:border-ink hover:text-ink"
                >
                  {plan}
                </Link>
              )}

              <AvatarMenu
                avatarUrl={profile?.avatar_url ?? null}
                initial={initial}
                username={profile?.username ?? ""}
                plan={plan}
                labels={loc.app.avatar}
              />
            </div>
          </div>

          <div className="mt-3 lg:hidden">
            <MobileNav items={navItems} />
          </div>

          {/* Mobile search — below the nav row, hidden on desktop */}
          <form action="/browse" className="mt-3 hidden lg:hidden">
            <div className="relative">
              <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
              <input
                name="q"
                aria-label="Search courses"
                placeholder={loc.app.searchPlaceholder}
                className="w-full rounded-full bg-paper py-3 pl-10 pr-4 font-manrope text-base text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-ink"
              />
            </div>
          </form>
        </header>
          )}
        >
          {children}
        </AppChrome>
        <OriginLanguageGuide />
      </div>
    </div>
  );
}
