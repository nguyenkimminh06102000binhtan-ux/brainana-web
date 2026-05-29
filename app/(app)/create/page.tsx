import { cookies } from "next/headers";
import CreateCourseForm from "./form";
import { createClient } from "@/utils/supabase/server";
import { getLocale } from "@/utils/i18n";

export default async function CreatePage() {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("active_origin_language")
        .eq("id", user.id)
        .single()
    : { data: null };
  const loc = getLocale((profile?.active_origin_language as string | null) ?? null);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">{loc.createEdit.createEyebrow}</p>
        <h1 className="mt-1 font-fredoka text-4xl font-[700] tracking-tight">
          {loc.createEdit.createTitlePrefix} <span className="text-orange-text">{loc.createEdit.createTitleAccent}</span>
        </h1>
        <p className="mt-2 font-manrope text-sm text-ink-2">
          {loc.createEdit.createIntro}
        </p>
      </div>

      <CreateCourseForm
        labels={loc.createEdit}
        categories={loc.categories}
        levels={{
          beginner: loc.course.beginner,
          intermediate: loc.course.intermediate,
          advanced: loc.course.advanced,
        }}
      />
    </div>
  );
}
