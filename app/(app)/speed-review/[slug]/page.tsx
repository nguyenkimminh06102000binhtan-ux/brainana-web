import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getLocale } from "@/utils/i18n";
import SpeedReviewClient from "./speed-review-client";

export type SpeedCard = {
  id: string;
  front: string;
  back: string;
  options: string[];       // 4 shuffled choices
  correctIndex: number;   // index of the correct answer in options[]
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default async function SpeedReviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createClient(await cookies());

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, slug")
    .eq("slug", slug)
    .single();
  if (!course) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_origin_language")
    .eq("id", user.id)
    .single();

  const loc = getLocale((profile?.active_origin_language as string | null) ?? null);

  // Fetch all reviewed (non-ignored) item_progress rows with their items
  const { data: progressRows } = await supabase
    .from("item_progress")
    .select(
      "item_id, items!item_progress_item_id_fkey(id, front_text, back_text)",
    )
    .eq("user_id", user.id)
    .eq("course_id", course.id)
    .eq("ignored", false);

  type ProgressRow = {
    item_id: string;
    items: { id: string; front_text: string; back_text: string } | null;
  };

  const reviewed = (progressRows ?? []) as unknown as ProgressRow[];
  const validCards = reviewed
    .filter((r) => r.items)
    .map((r) => ({ id: r.items!.id, front: r.items!.front_text, back: r.items!.back_text }));

  if (validCards.length < 3) {
    // Not enough cards — redirect back with a flag handled client-side
    redirect(`/c/${slug}?speed_review_blocked=1`);
  }

  // Build distractor pool from all back texts
  const allBacks = validCards.map((c) => c.back);

  // Build speed cards with shuffled MC options
  const cards: SpeedCard[] = shuffle(validCards).map((card) => {
    const distractors = shuffle(allBacks.filter((b) => b !== card.back)).slice(0, 3);
    const pool = shuffle([card.back, ...distractors]);
    return {
      id: card.id,
      front: card.front,
      back: card.back,
      options: pool,
      correctIndex: pool.indexOf(card.back),
    };
  });

  return (
    <SpeedReviewClient
      courseSlug={course.slug}
      courseTitle={course.title}
      courseId={course.id}
      cards={cards}
      labels={loc.speedReview}
    />
  );
}
