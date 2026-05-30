"use server";

import Anthropic from "@anthropic-ai/sdk";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { rateLimitUser } from "@/utils/rate-limit";
import { ROMANIZATION_SYSTEMS } from "@/utils/romanization";

const anthropic = new Anthropic();

export async function suggestRomanization(
  text: string,
  language: string,
): Promise<{ romanization: string; system: string }> {
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

  // Rate limit before calling Claude (30 AI calls/hour per user)
  const { allowed } = await rateLimitUser(user.id, "romanization", { limit: 30, windowSeconds: 3600 });
  if (!allowed) return { romanization: "", system };

  // Cache miss — call Claude
  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `Provide the ${system} romanization for the following ${language} text. Return only the romanized text, no explanation, no punctuation changes, no quotes.\n\nText: ${normalized}`,
        },
      ],
    });

    const block = msg.content[0];
    const romanization = block?.type === "text" ? block.text.trim() : "";

    if (romanization) {
      await supabase
        .from("romanization_cache")
        .insert({ text: normalized, language, romanization })
        .throwOnError();
    }

    return { romanization, system };
  } catch (err) {
    console.error("[suggestRomanization] error:", err);
    return { romanization: "", system };
  }
}
