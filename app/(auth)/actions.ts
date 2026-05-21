"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

type AuthState = { error: string } | null;

export async function login(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = createClient(await cookies());

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) return { error: error.message };

  redirect("/dashboard");
}

export async function signup(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = createClient(await cookies());

  const { data, error } = await supabase.auth.signUp({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) return { error: error.message };

  // No session means Supabase sent a confirmation email
  if (!data.session) redirect("/check-email");

  redirect("/dashboard");
}
