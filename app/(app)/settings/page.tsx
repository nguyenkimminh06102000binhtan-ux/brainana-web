import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import SettingsForm from "./settings-form";

export default async function SettingsPage() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, username, bio, avatar_url, website_url, twitter_handle, daily_goal, show_romanization, native_language")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/start");

  const googleIdentity = user.identities?.find((identity) => identity.provider === "google") ?? null;

  return (
    <SettingsForm
      profile={{
        id: profile.id,
        display_name: profile.display_name,
        username: profile.username,
        bio: profile.bio,
        avatar_url: profile.avatar_url,
        website_url: profile.website_url,
        twitter_handle: profile.twitter_handle,
        daily_goal: profile.daily_goal ?? 10,
        show_romanization: profile.show_romanization ?? true,
        native_language: profile.native_language ?? null,
      }}
      email={user.email ?? ""}
      googleIdentity={googleIdentity}
    />
  );
}
