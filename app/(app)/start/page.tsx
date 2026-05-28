import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getLocale } from "@/utils/i18n";
import OnboardingForm from "./form";

export default async function StartPage() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("native_language, active_origin_language")
    .eq("id", user.id)
    .single();

  const initialLanguage =
    (profile?.native_language as string | null) ??
    (profile?.active_origin_language as string | null) ??
    null;
  const loc = getLocale(initialLanguage);

  return (
    <OnboardingForm
      userId={user.id}
      initialNativeLanguage={initialLanguage}
      initialLabels={loc.start}
      initialCategories={loc.categories}
    />
  );
}
