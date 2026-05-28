"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type ProfileSettingsState = { error?: string; success?: string } | null;
export type AccountSettingsState = { error?: string; success?: string } | null;

const USERNAME_RE = /^[a-z0-9._]{3,24}$/;

function normalizeOptionalUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeTwitterHandle(value: string) {
  const handle = value
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?(twitter\.com|x\.com)\//, "")
    .split(/[/?#]/)[0]
    ?.trim();

  if (!handle) return null;
  if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) return undefined;
  return handle;
}

function isStrongPassword(password: string) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export async function saveProfileSettings(
  _prevState: ProfileSettingsState,
  formData: FormData,
): Promise<ProfileSettingsState> {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const displayName = String(formData.get("display_name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const bio = String(formData.get("bio") ?? "").trim();
  const avatarUrl = String(formData.get("avatar_url") ?? "").trim() || null;
  const websiteUrl = normalizeOptionalUrl(String(formData.get("website_url") ?? ""));
  const twitterHandle = normalizeTwitterHandle(String(formData.get("twitter_handle") ?? ""));
  const dailyGoal = Number(formData.get("daily_goal"));
  const showRomanization = formData.get("show_romanization") === "on";

  if (!displayName) return { error: "Display name is required." };
  if (!USERNAME_RE.test(username)) {
    return { error: "Username must be 3-24 characters using lowercase letters, numbers, dots, or underscores." };
  }
  if (bio.length > 160) return { error: "Bio must be 160 characters or less." };
  if (String(formData.get("website_url") ?? "").trim() && !websiteUrl) {
    return { error: "Enter a valid website URL." };
  }
  if (twitterHandle === undefined) {
    return { error: "Enter a valid Twitter/X handle." };
  }
  if (!Number.isInteger(dailyGoal) || dailyGoal < 5 || dailyGoal > 100) {
    return { error: "Daily goal must be between 5 and 100 cards." };
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", user.id)
    .maybeSingle();

  if (existing) return { error: "That username is already taken." };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      username,
      bio: bio || null,
      avatar_url: avatarUrl,
      website_url: websiteUrl,
      twitter_handle: twitterHandle,
      daily_goal: dailyGoal,
      show_romanization: showRomanization,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath(`/u/${username}`);
  revalidatePath("/", "layout");

  return { success: "Settings saved." };
}

export async function saveAccountSettings(
  _prevState: AccountSettingsState,
  formData: FormData,
): Promise<AccountSettingsState> {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const intent = String(formData.get("intent") ?? "");

  if (intent === "email") {
    const email = String(formData.get("email") ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { error: "Enter a valid email address." };
    }

    const { error } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/settings` },
    );
    if (error) return { error: error.message };
    return { success: "Check your new email address to confirm the change." };
  }

  if (intent === "password") {
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirm_password") ?? "");
    if (!isStrongPassword(password)) {
      return { error: "Password must be 8+ characters with uppercase, lowercase, number, and symbol." };
    }
    if (password !== confirmPassword) return { error: "Passwords do not match." };

    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: error.message };
    return { success: "Password updated." };
  }

  return { error: "Choose an account setting to update." };
}
