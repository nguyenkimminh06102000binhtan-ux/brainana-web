"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { isValidNativeLanguage } from "@/app/constants/languages";

export async function switchOriginLanguage(language: string) {
  if (!isValidNativeLanguage(language)) return;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({ active_origin_language: language })
    .eq("id", user.id);

  cookieStore.set("brainana_active_origin_language", language, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");
}

export async function addOriginLanguage(language: string) {
  if (!isValidNativeLanguage(language)) return;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("origin_languages")
    .eq("id", user.id)
    .single();

  const existing: string[] = profile?.origin_languages ?? [];
  if (existing.includes(language)) {
    await supabase
      .from("profiles")
      .update({ active_origin_language: language })
      .eq("id", user.id);
  } else {
    await supabase
      .from("profiles")
      .update({
        origin_languages: [...existing, language],
        active_origin_language: language,
      })
      .eq("id", user.id);
  }

  cookieStore.set("brainana_active_origin_language", language, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");
}
