"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { PURPOSES, DAILY_GOALS, INTERESTS } from "./constants";

export type OnboardingState = { error: string } | null;

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

  if (!displayName) return { error: "Please enter your name." };
  if (!(PURPOSES as readonly string[]).includes(purpose))
    return { error: "Please select a valid reason." };
  if (!(DAILY_GOALS as readonly number[]).includes(dailyGoal))
    return { error: "Please select a daily goal." };

  const { data, error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      avatar_url: avatarUrl,
      purpose,
      daily_goal: dailyGoal,
      interests: selectedInterests.length > 0 ? selectedInterests : null,
      onboarding_completed: true,
    })
    .eq("id", user.id)
    .select("id");

  if (error) return { error: error.message };
  if (!data || data.length === 0)
    return { error: "Profile not found. Please sign out and try again." };

  redirect("/home");
}
