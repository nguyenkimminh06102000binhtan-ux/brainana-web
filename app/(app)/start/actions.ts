"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getLocale } from "@/utils/i18n";
import { PURPOSES, DAILY_GOALS, INTERESTS } from "./constants";
import { isValidNativeLanguage } from "@/app/constants/languages";

export type OnboardingState = { error: string } | null;
export type NativeLanguageState = {
  error: string | null;
  language: string | null;
  labels: ReturnType<typeof getLocale>["start"];
  categories: ReturnType<typeof getLocale>["categories"];
};

function languageLabels(language: string | null) {
  const locale = getLocale(language);
  return { labels: locale.start, categories: locale.categories };
}

export async function saveNativeLanguage(language: string): Promise<NativeLanguageState> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nativeLanguage = language.trim();
  if (!isValidNativeLanguage(nativeLanguage)) {
    const { labels, categories } = languageLabels(null);
    return {
      error: labels.validationMotherTongue,
      language: null,
      labels,
      categories,
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      native_language: nativeLanguage,
      origin_languages: [nativeLanguage],
      active_origin_language: nativeLanguage,
    })
    .eq("id", user.id);

  const { labels, categories } = languageLabels(nativeLanguage);

  if (error) {
    return {
      error: error.message,
      language: null,
      labels,
      categories,
    };
  }

  cookieStore.set("brainana_active_origin_language", nativeLanguage, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");

  return {
    error: null,
    language: nativeLanguage,
    labels,
    categories,
  };
}

export async function saveOnboarding(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const displayName = String(formData.get("display_name") ?? "").trim();
  const avatarUrl = String(formData.get("avatar_url") ?? "").trim() || null;
  const purpose = String(formData.get("purpose") ?? "");
  const dailyGoalRaw = formData.get("daily_goal");
  const dailyGoal = dailyGoalRaw !== null ? Number(dailyGoalRaw) : NaN;
  const selectedInterests = formData
    .getAll("interests")
    .map(String)
    .filter((i): boolean => (INTERESTS as readonly string[]).includes(i));
  const nativeLanguage = String(formData.get("native_language") ?? "").trim();

  const locale = getLocale(nativeLanguage || null);

  if (!displayName) return { error: locale.start.validationName };
  if (!(PURPOSES as readonly string[]).includes(purpose))
    return { error: locale.start.validationReason };
  if (!(DAILY_GOALS as readonly number[]).includes(dailyGoal))
    return { error: locale.start.validationDailyGoal };
  if (!isValidNativeLanguage(nativeLanguage))
    return { error: locale.start.validationMotherTongue };

  const { data, error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      avatar_url: avatarUrl,
      purpose,
      daily_goal: dailyGoal,
      interests: selectedInterests.length > 0 ? selectedInterests : null,
      native_language: nativeLanguage,
      onboarding_completed: true,
      origin_languages: [nativeLanguage],
      active_origin_language: nativeLanguage,
    })
    .eq("id", user.id)
    .select("id");

  if (error) return { error: error.message };
  if (!data || data.length === 0)
    return { error: locale.start.validationProfileNotFound };

  redirect("/home?guide=origin-language");
}
