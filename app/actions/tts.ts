"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { rateLimitUser } from "@/utils/rate-limit";
import { TTS_VOICES } from "@/utils/tts";
import { deductQuota, getQuotaBalance, ttsCharCost } from "@/utils/quota";

export async function generateTTSAudio(
  text: string,
  language: string,
): Promise<{ audioBase64: string; remainingChars?: number; quotaExhausted?: true }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { audioBase64: "" };

  const normalized = text.trim();
  if (!normalized) return { audioBase64: "" };

  const voice = TTS_VOICES[language];
  if (!voice) return { audioBase64: "" };

  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) return { audioBase64: "" };

  const { allowed } = await rateLimitUser(user.id, "tts", { limit: 100, windowSeconds: 3600 });
  if (!allowed) return { audioBase64: "" };

  // Quota check — deduct chars
  const cost = ttsCharCost(normalized);
  const ok = await deductQuota(supabase, user.id, "chars", cost, { feature: "audio" });
  if (!ok) return { audioBase64: "", quotaExhausted: true };

  try {
    const res = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text: normalized },
          voice: { languageCode: voice.languageCode, name: voice.name },
          audioConfig: { audioEncoding: "MP3" },
        }),
      },
    );

    if (!res.ok) {
      console.error("[generateTTSAudio] API error:", await res.text());
      return { audioBase64: "" };
    }

    const data = await res.json();
    const balance = await getQuotaBalance(supabase, user.id);
    return { audioBase64: data.audioContent ?? "", remainingChars: balance?.chars_balance };
  } catch (err) {
    console.error("[generateTTSAudio] error:", err);
    return { audioBase64: "" };
  }
}
