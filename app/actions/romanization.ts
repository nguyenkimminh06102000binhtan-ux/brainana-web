"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { ROMANIZATION_SYSTEMS } from "@/utils/romanization";

const anthropic = new Anthropic();

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function suggestRomanization(
  text: string,
  language: string,
): Promise<{ romanization: string; system: string }> {
  const system = ROMANIZATION_SYSTEMS[language]?.system ?? "Romanization";
  const normalized = text.trim();
  if (!normalized) return { romanization: "", system };

  const supabase = getSupabase();

  // Cache hit
  const { data: cached } = await supabase
    .from("romanization_cache")
    .select("romanization")
    .eq("text", normalized)
    .eq("language", language)
    .maybeSingle();

  if (cached?.romanization) return { romanization: cached.romanization, system };

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
