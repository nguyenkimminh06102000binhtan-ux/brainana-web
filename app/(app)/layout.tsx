import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import AvatarMenu from "./_components/avatar-menu";
import MobileNav from "./_components/mobile-nav";
import OriginLanguageSwitcher from "@/components/origin-language-switcher";
import ThemeToggle from "@/app/theme-toggle";
import { getLocale } from "@/utils/i18n";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, avatar_url, native_language, origin_languages, active_origin_language")
    .eq("id", user.id)
    .single();

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
    { label: loc.app.nav.home,      href: "/home" },
    { label: loc.app.nav.browse,    href: "/browse" },
    { label: loc.app.nav.library,   href: "/library" },
    { label: loc.app.nav.create,    href: "/create" },
    { label: loc.app.nav.community, href: "/community" },
  ];

  return (
    <div className="flex min-h-screen bg-paper text-ink">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-full focus:bg-blue focus:px-4 focus:py-2 focus:font-manrope focus:text-sm focus:font-[800] focus:text-ocean focus:shadow-hard">
        Skip to main content
      </a>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="m-3 rounded-[2rem] bg-paper-2 px-4 py-4 shadow-hard sm:m-4 sm:px-5 lg:rounded-full lg:px-6">
          <div className="flex items-center gap-3 lg:gap-4">

            {/* Logo */}
            <Link href="/home" className="flex shrink-0 items-center gap-3 font-fredoka text-xl font-[700] tracking-tight">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-yellow text-2xl text-on-bright">
                B
              </span>
              <span className="hidden sm:inline">{loc.app.brand}</span>
            </Link>

            {/* Desktop nav — hidden on mobile */}
            <nav className="hidden min-w-0 flex-1 flex-wrap items-center gap-2 lg:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="shrink-0 rounded-full px-4 py-2 font-manrope text-sm font-[800] text-ink-2 hover:bg-blue hover:text-ocean"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Spacer on mobile */}
            <div className="flex-1 lg:hidden" />

            {/* Desktop search */}
            <form action="/browse" className="hidden lg:block lg:min-w-48">
              <input
                name="q"
                aria-label="Search courses"
                placeholder={loc.app.searchPlaceholder}
                className="w-full rounded-full bg-paper px-4 py-2 font-manrope text-sm text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-ink"
              />
            </form>

            {/* Right: theme toggle, language, hamburger, avatar */}
            <div className="flex shrink-0 items-center gap-2">
              <ThemeToggle />

              <OriginLanguageSwitcher
                originLanguages={originLanguages}
                activeOriginLanguage={activeOriginLanguage}
                labels={loc.app.originLanguage}
              />

              {/* Hamburger — mobile only */}
              <MobileNav items={navItems} />

              <AvatarMenu
                avatarUrl={profile?.avatar_url ?? null}
                initial={initial}
                username={profile?.username ?? ""}
                labels={loc.app.avatar}
              />
            </div>
          </div>

          {/* Mobile search — below the nav row, hidden on desktop */}
          <form action="/browse" className="mt-3 lg:hidden">
            <input
              name="q"
              aria-label="Search courses"
              placeholder={loc.app.searchPlaceholder}
              className="w-full rounded-full bg-paper px-4 py-2 font-manrope text-sm text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-ink"
            />
          </form>
        </header>

        <main id="main-content" className="flex-1">{children}</main>
      </div>
    </div>
  );
}
