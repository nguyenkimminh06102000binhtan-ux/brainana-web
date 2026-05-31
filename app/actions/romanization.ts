"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { rateLimitUser } from "@/utils/rate-limit";
import { ROMANIZATION_SYSTEMS } from "@/utils/romanization";
import { aiComplete } from "@/utils/ai-client";
import { deductQuota, getQuotaBalance, aiCharCost } from "@/utils/quota";

export async function suggestRomanization(
  text: string,
  language: string,
): Promise<{ romanization: string; system: string; remainingChars?: number; quotaExhausted?: true }> {
  const system = ROMANIZATION_SYSTEMS[language]?.system ?? "Romanization";

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { romanization: "", system };

  const normalized = text.trim();
  if (!normalized) return { romanization: "", system };

  // Cache hit — no AI call, no rate limit needed
  const { data: cached } = await supabase
    .from("romanization_cache")
    .select("romanization")
    .eq("text", normalized)
    .eq("language", language)
    .maybeSingle();

  if (cached?.romanization) return { romanization: cached.romanization, system };

  // Rate limit before calling AI (30 AI calls/hour per user)
  const { allowed } = await rateLimitUser(user.id, "romanization", { limit: 30, windowSeconds: 3600 });
  if (!allowed) return { romanization: "", system };

  // Quota check — deduct chars
  const cost = aiCharCost(normalized);
  const ok = await deductQuota(supabase, user.id, "chars", cost, { feature: "romanization" });
  if (!ok) return { romanization: "", system, quotaExhausted: true };

  // Cache miss — call AI
  try {
    const result = await aiComplete({
      system: "You are a romanization assistant. Return only the romanized text — no explanation, no punctuation changes, no quotes.",
      messages: [
        {
          role: "user",
          content: `Provide the ${system} romanization for the following ${language} text.\n\nText: ${normalized}`,
        },
      ],
      maxTokens: 200,
    });

    const romanization = result.text.trim();

    if (romanization) {
      await supabase
        .from("romanization_cache")
        .insert({ text: normalized, language, romanization })
        .throwOnError();
    }

    const balance = await getQuotaBalance(supabase, user.id);
    return { romanization, system, remainingChars: balance?.chars_balance };
  } catch (err) {
    console.error("[suggestRomanization] error:", err);
    return { romanization: "", system };
  }
}
