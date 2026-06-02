import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type OnboardingProfile = {
  display_name: string | null;
  purpose: string | null;
  interests: string[] | null;
  native_language: string | null;
  onboarding_completed: boolean | null;
};

function hasCompletedOnboarding(profile: OnboardingProfile | null) {
  return Boolean(
    profile?.onboarding_completed &&
      profile.display_name?.trim() &&
      profile.purpose?.trim() &&
      profile.native_language?.trim() &&
      profile.interests &&
      profile.interests.length > 0
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const nextPath = next?.startsWith("/") && !next.startsWith("//") ? next : "/home";

  if (code) {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, purpose, interests, native_language, onboarding_completed")
        .eq("id", data.user.id)
        .single();

      const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;

      if (!hasCompletedOnboarding(profile as OnboardingProfile | null)) {
        return NextResponse.redirect(new URL("/start", base));
      }

      return NextResponse.redirect(new URL(nextPath, base));
    }
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  return NextResponse.redirect(new URL("/login", base));
}
