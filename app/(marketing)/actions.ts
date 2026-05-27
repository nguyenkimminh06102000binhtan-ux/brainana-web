"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

type AuthState = { error: string } | null;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

export async function loginWithEmail(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = createClient(await cookies());

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) return { error: "Login details are wrong." };

  redirect("/dashboard");
}

export async function signupWithEmail(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!isValidEmail(email)) {
    return { error: "Enter a valid email address." };
  }

  if (!isStrongPassword(password)) {
    return { error: "Password must meet all strength requirements." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = createClient(await cookies());

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) return { error: error.message };

  if (!data.session) {
    redirect(`/verify-email?email=${encodeURIComponent(email)}`);
  }

  redirect("/dashboard");
}

export async function signInWithGoogle() {
  const supabase = createClient(await cookies());

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) throw new Error(error.message);
  if (data.url) redirect(data.url);
}

export async function resendVerificationEmail(formData: FormData) {
  const email = formData.get("email") as string;
  if (!email) redirect("/signup");

  const supabase = createClient(await cookies());

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    redirect(
      `/verify-email?email=${encodeURIComponent(email)}&error=${encodeURIComponent(error.message)}`
    );
  }

  redirect(`/verify-email?email=${encodeURIComponent(email)}&resent=1`);
}
