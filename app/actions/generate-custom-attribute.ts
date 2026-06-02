"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { rateLimitUser } from "@/utils/rate-limit";
import { aiComplete } from "@/utils/ai-client";
import { deductQuota, getQuotaBalance, aiCharCost } from "@/utils/quota";

type Result = {
  value: string;
  remainingChars?: number;
  quotaExhausted?: true;
};

const EMPTY: Result = { value: "" };
const MAX_ATTRIBUTE_NAME_LENGTH = 40;
const MAX_CARD_TEXT_LENGTH = 2_000;
const MAX_LANGUAGE_LENGTH = 80;
const MAX_ATTRIBUTE_VALUE_LENGTH = 500;

function clean(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength);
}

export async function generateCustomAttribute(
  attributeName: string,
  frontText: string,
  backText: string,
  sourceLanguage: string,
  targetLanguage: string,
): Promise<Result> {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return EMPTY;

  const normalizedAttributeName = clean(attributeName, MAX_ATTRIBUTE_NAME_LENGTH);
  const normalizedFront = clean(frontText, MAX_CARD_TEXT_LENGTH);
  const normalizedBack = clean(backText, MAX_CARD_TEXT_LENGTH);
  const normalizedSourceLanguage = clean(sourceLanguage, MAX_LANGUAGE_LENGTH);
  const normalizedTargetLanguage = clean(targetLanguage, MAX_LANGUAGE_LENGTH);
  if (!normalizedAttributeName) return EMPTY;
  if (!normalizedFront && !normalizedBack) return EMPTY;

  const { allowed } = await rateLimitUser(user.id, "generate-custom-attribute", { limit: 120, windowSeconds: 3600 });
  if (!allowed) return EMPTY;

  const cost = aiCharCost(`${normalizedAttributeName} ${normalizedFront} ${normalizedBack}`);
  const ok = await deductQuota(supabase, user.id, "chars", cost, { feature: "generate_custom_attribute" });
  if (!ok) return { ...EMPTY, quotaExhausted: true };

  try {
    const result = await aiComplete({
      system: "You are a flashcard content generator. Return ONLY the requested field content — no labels, no explanations, no punctuation beyond what is natural for the content itself.",
      messages: [{
        role: "user",
        content: `Generate content for the "${normalizedAttributeName}" field of this flashcard.

Card front (${normalizedSourceLanguage}): ${normalizedFront}
Card back (${normalizedTargetLanguage}): ${normalizedBack}

Field: "${normalizedAttributeName}"

Return only the ${normalizedAttributeName} content, nothing else.`,
      }],
      maxTokens: 300,
    });

    const value = clean(result.text, MAX_ATTRIBUTE_VALUE_LENGTH);
    const balance = await getQuotaBalance(supabase, user.id);
    return { value, remainingChars: balance?.chars_balance };
  } catch (err) {
    console.error("[generateCustomAttribute] error:", err);
    return EMPTY;
  }
}
