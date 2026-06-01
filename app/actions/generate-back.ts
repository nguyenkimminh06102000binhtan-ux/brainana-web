"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { rateLimitUser } from "@/utils/rate-limit";
import { aiComplete } from "@/utils/ai-client";
import { deductQuota, getQuotaBalance, aiCharCost } from "@/utils/quota";

type GenerateBackResult = {
  back: string;
  distractors: string[];
  remainingChars?: number;
  quotaExhausted?: true;
};

const EMPTY: GenerateBackResult = { back: "", distractors: [] };

export async function generateBack(
  front: string,
  sourceLanguage: string,
  targetLanguage: string,
): Promise<GenerateBackResult> {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return EMPTY;

  const normalized = front.trim();
  if (!normalized) return EMPTY;

  const { allowed } = await rateLimitUser(user.id, "generate-back", { limit: 60, windowSeconds: 3600 });
  if (!allowed) return EMPTY;

  const cost = aiCharCost(normalized);
  const ok = await deductQuota(supabase, user.id, "chars", cost, { feature: "generate_back" });
  if (!ok) return { ...EMPTY, quotaExhausted: true };

  try {
    const result = await aiComplete({
      system: "You are a flashcard answer generator. Return ONLY valid JSON — no markdown, no explanation, no code fences.",
      messages: [{
        role: "user",
        content: `Generate the correct answer for this flashcard in ${targetLanguage}, plus 3 wrong answers for multiple-choice.

Question (${sourceLanguage}): ${normalized}

Return this exact JSON:
{"back": "correct answer in ${targetLanguage}", "distractors": ["wrong1", "wrong2", "wrong3"]}

Rules:
- back: the correct ${targetLanguage} answer
- distractors: 3 plausible but clearly wrong alternatives in ${targetLanguage}, same format/length as the correct answer
- For mathematical content: use Unicode (², ³, π, etc.) — never LaTeX`,
      }],
      maxTokens: 500,
    });

    const raw = result.text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return EMPTY;

    const { jsonrepair } = await import("jsonrepair");
    const parsed = JSON.parse(jsonrepair(match[0])) as { back?: string; distractors?: unknown };
    const back = (parsed.back as string | undefined)?.trim() ?? "";
    const distractors = Array.isArray(parsed.distractors)
      ? (parsed.distractors as string[]).filter((d) => typeof d === "string" && d.trim()).slice(0, 3)
      : [];

    const balance = await getQuotaBalance(supabase, user.id);
    return { back, distractors, remainingChars: balance?.chars_balance };
  } catch (err) {
    console.error("[generateBack] error:", err);
    return EMPTY;
  }
}
