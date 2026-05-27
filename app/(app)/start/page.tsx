import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

async function completeOnboarding() {
  "use server";

  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", user.id);

  redirect("/home");
}

export default function StartPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <section className="rounded-lg bg-paper-2 p-8 shadow-hard">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">
          Start
        </p>
        <h1 className="mt-3 font-fredoka text-4xl font-[600] leading-tight tracking-tight">
          Set up your learning path
        </h1>
        <p className="mt-3 font-manrope text-sm leading-6 text-ink-2">
          Finish onboarding with your name, topics, and daily goal before going home.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {["1. Name", "2. Topics", "3. Daily goal"].map((step) => (
            <div key={step} className="rounded-md bg-paper p-4 shadow-hard-sm">
              <p className="font-mono text-xs uppercase tracking-widest text-ink-2">
                {step}
              </p>
            </div>
          ))}
        </div>
        <form action={completeOnboarding} className="mt-6">
          <button
            type="submit"
            className="rounded-full bg-orange px-6 py-3 font-manrope text-base font-[800] text-ink shadow-hard-red transition active:translate-y-[2px] active:shadow-hard-sm"
          >
            Complete onboarding
          </button>
        </form>
      </section>
    </div>
  );
}
