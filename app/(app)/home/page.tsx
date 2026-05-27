import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function HomePage() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarding_completed) redirect("/start");

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <section className="rounded-lg bg-paper-2 p-8 shadow-hard">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">
          Home
        </p>
        <h1 className="mt-3 font-fredoka text-4xl font-[600] leading-tight tracking-tight">
          Home
        </h1>
        <p className="mt-3 font-manrope text-sm leading-6 text-ink-2">
          Your authenticated home page is ready.
        </p>
      </section>
    </div>
  );
}
