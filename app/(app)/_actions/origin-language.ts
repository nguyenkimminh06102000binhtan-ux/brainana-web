"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { LANGUAGES } from "@/app/(app)/start/constants";

export async function switchOriginLanguage(language: string) {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({ active_origin_language: language })
    .eq("id", user.id);

  revalidatePath("/", "layout");
}

export async function addOriginLanguage(language: string) {
  if (!(LANGUAGES as readonly string[]).includes(language)) return;

  const supabase = createClient(await cookies());
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

  revalidatePath("/", "layout");
}
