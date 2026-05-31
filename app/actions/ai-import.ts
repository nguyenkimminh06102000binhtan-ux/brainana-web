"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { rateLimitUser } from "@/utils/rate-limit";
import { aiComplete, aiExtractTextFromImage } from "@/utils/ai-client";
import { deductQuota, getQuotaBalance, aiCharCost } from "@/utils/quota";
import type Anthropic from "@anthropic-ai/sdk";

const BLOCKED_EXTENSIONS = new Set([
  "exe", "dmg", "pkg", "zip", "rar", "tar",
  "mp3", "mp4", "mov", "psd", "ai", "fig",
  "db", "sql", "py", "js", "ts",
]);

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

const CARD_STYLE_DESCRIPTIONS: Record<string, string> = {
  vocabulary:  "Single word pairs (e.g. Apple → 사과)",
  phrases:     "Full sentence pairs (e.g. How are you? → 잘 지내세요?)",
  definitions: "Term + explanation (e.g. Photosynthesis → The process by which plants convert sunlight to energy)",
  qa:          "Concept questions (e.g. What is the capital of France? → Paris)",
  translation: "Full sentence translation (e.g. I love learning → 나는 배우는 것을 좋아해)",
};

export type AiImportCard = {
  front: string;
  back: string;
  distractors: string[];
};

export type AiImportResult =
  | { cards: AiImportCard[]; charCount: number; remainingChars?: number }
  | { error: string };

export async function generateCardsWithAI(formData: FormData): Promise<AiImportResult> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // 10 AI card-generation requests per hour per user
  const { allowed } = await rateLimitUser(user.id, "ai-import", { limit: 10, windowSeconds: 3600 });
  if (!allowed) return { error: "Rate limit exceeded. Please try again later." };

  const get = (k: string) => (formData.get(k) as string | null) ?? "";

  const courseTitle        = get("courseTitle");
  const sourceLanguage     = get("sourceLanguage");
  const targetLanguage     = get("targetLanguage");
  const category           = get("category");
  const level              = get("level");
  const sectionTitle       = get("sectionTitle");
  const sectionDescription = get("sectionDescription");
  const cardStyle          = get("cardStyle") || "vocabulary";
  const count              = Math.min(Math.max(parseInt(get("count") || "10", 10), 1), 50);
  const focusInstruction   = get("focusInstruction");
  const pastedText         = get("pastedText").trim();
  // Pre-extracted text from client-side analyze-file calls (avoids re-running OCR/parsing)
  const preExtractedText   = get("preExtractedText").trim();

  const files = formData.getAll("files") as File[];

  // Validate blocked types server-side
  for (const file of files) {
    const ext = file.name.toLowerCase().split(".").pop() ?? "";
    if (BLOCKED_EXTENSIONS.has(ext)) return { error: `Blocked file type: .${ext}` };
  }

  // Build Claude message content
  // contentBlocks retained for type-compat but only a text block is ever pushed
  const contentBlocks: Anthropic.MessageParam["content"] = [];
  // Start with pasted text + any pre-extracted text from client-side analysis
  let textContent = [pastedText, preExtractedText].filter(Boolean).join("\n");

  // Only re-process files that weren't pre-extracted on the client
  const filesToProcess = preExtractedText ? [] : files;

  for (const file of filesToProcess) {
    const ext = file.name.toLowerCase().split(".").pop() ?? "";
    const bytes = Buffer.from(await file.arrayBuffer());

    try {
      if (IMAGE_EXTENSIONS.has(ext)) {
        const mediaType = (ext === "jpg" || ext === "jpeg") ? "image/jpeg" as const
          : ext === "png"  ? "image/png"  as const
          : ext === "gif"  ? "image/gif"  as const
          : "image/webp"   as const;
        textContent += "\n" + await aiExtractTextFromImage(bytes, mediaType);
      } else if (ext === "pdf") {
        const pdfParse = (await import("pdf-parse")).default;
        const data = await pdfParse(bytes);
        textContent += "\n" + data.text;
      } else if (ext === "docx") {
        const mammoth = (await import("mammoth")).default;
        const { value } = await mammoth.extractRawText({ buffer: bytes });
        textContent += "\n" + value;
      } else if (ext === "xlsx") {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(bytes, { type: "buffer" });
        for (const name of wb.SheetNames) {
          textContent += "\n" + XLSX.utils.sheet_to_csv(wb.Sheets[name]!);
        }
      } else if (["txt", "md", "csv", "json"].includes(ext)) {
        textContent += "\n" + bytes.toString("utf-8");
      }
    } catch (err) {
      console.error(`[ai-import] Failed to process ${file.name}:`, err);
    }
  }

  if (!textContent.trim() && contentBlocks.length === 0) {
    return { error: "No content to process" };
  }

  // Quota check — deduct chars based on content size (capped at 100K)
  const cost = aiCharCost(textContent.trim().slice(0, 100_000));
  const ok = await deductQuota(supabase, user.id, "chars", cost, { feature: "ai_import" });
  if (!ok) return { error: "Insufficient character balance. Please top up to continue." };
  const balanceAfterDeduct = await getQuotaBalance(supabase, user.id);

  const styleDesc = CARD_STYLE_DESCRIPTIONS[cardStyle] ?? CARD_STYLE_DESCRIPTIONS.vocabulary!;

  const promptLines = [
    "Generate flashcard pairs for a language learning course.",
    "",
    `Course: ${courseTitle || "Untitled"}`,
    `Question language (card front): ${sourceLanguage || "source language"}`,
    `Answer language (card back): ${targetLanguage || "target language"}`,
    category           ? `Category: ${category}` : "",
    level              ? `Level: ${level}` : "",
    `Section: ${sectionTitle || "General"}`,
    sectionDescription ? `Section description: ${sectionDescription}` : "",
    "",
    `Card style: ${cardStyle} — ${styleDesc}`,
    `You MUST generate EXACTLY ${count} flashcard pairs — no more, no less. This is a strict requirement.`,
    `If the source content seems exhausted before reaching ${count} cards, generate variations, synonyms, related concepts, or deeper sub-topics from the same material to reach the exact count.`,
    focusInstruction   ? `Focus on: ${focusInstruction}` : "",
    textContent.trim() ? `\nSource content:\n${textContent.trim().slice(0, 100_000)}` : "",
    "",
    "Rules:",
    `- Front (question side): use ${sourceLanguage || "the source language"}`,
    `- Back (answer side): use ${targetLanguage || "the target language"}`,
    "- Every card must be unique",
    "- Strictly match the card style",
    "- For mathematical content: always use Unicode characters — never LaTeX or code-style notation. Use superscripts (², ³, ⁴, ⁿ), subscripts (₀, ₁, ₂), fractions (½, ⅓, ¼), Greek letters (π, α, β, γ, θ, λ, μ, σ, ω, ∆, Σ), and math symbols (×, ÷, ≤, ≥, ≠, ≈, √, ∞, ∫, ∑). Write formulas in readable plain form: e.g. 'y(t) = y₀ + v₀t − ½gt²', 'f = 1/T', 'E = mc²', 'v = √(2gh)'. Never use $...$ LaTeX, \\frac, \\text, or ^ for exponents.",
    "- If the source is a multiple-choice question and the correct answer is a combination option that references multiple other options, expand the back to list the actual text of every referenced option joined by ' / '. Recognize all of these patterns (in any language): explicit combination phrases ('All of the above', 'Both A and B', 'Cả a, b và c', 'Cả a, b, c đều đúng', 'Toutes ces réponses', 'Todas las anteriores'); SHORT bare-list forms where the answer text is nothing but a list of option letters ('Cả a, b, c' with or without 'đều đúng', 'a, b và c', 'a và b', 'A, B, C'); or any structurally equivalent pattern where the answer contains only letter references and no independent content. Never write 'All of the above', its translation, or bare letter labels as the back.",
    "- Every card MUST include a 'distractors' array of exactly 3 wrong answers. For MCQ source cards: take the wrong option texts from the source (no letter prefix). For non-MCQ cards: generate 3 plausible but clearly wrong alternatives. In both cases normalize all distractors to exactly match the format and sentence length of the correct answer — if the correct answer is a full sentence, rewrite each distractor as a full sentence using the same grammatical pattern (e.g. correct: 'The percentage of male students is 40%' → distractors: ['The percentage of male students is 10%', 'The percentage of male students is 55%', 'The percentage of male students is 60%']); if the correct answer is a short value, use equally short values. The goal is that no option stands out by length or structure.",
    "",
    "Return ONLY a valid JSON array — no markdown, no explanation, nothing else:",
    '[{"front": "...", "back": "...", "distractors": ["wrong1", "wrong2", "wrong3"]}, ...]',
  ].filter(Boolean).join("\n");

  contentBlocks.push({ type: "text", text: promptLines });

  try {
    const result = await aiComplete({
      system: "You are a JSON generator. Respond with only a valid JSON array. No markdown, no code fences, no explanation — just the raw JSON array.",
      messages: [{ role: "user", content: promptLines }],
      maxTokens: 10000,
    });

    if (result.stopReason === "max_tokens") {
      return { error: "AI response was too long to process. Try requesting fewer cards." };
    }

    const rawText = result.text;
    const text = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) {
      console.error("[ai-import] No JSON array in response:", rawText.slice(0, 300));
      return { error: "Could not parse AI response — no JSON array found" };
    }

    const { jsonrepair } = await import("jsonrepair");
    const parsed = JSON.parse(jsonrepair(match[0])) as Array<{ front?: string; back?: string; distractors?: unknown }>;
    const cards: AiImportCard[] = parsed
      .filter((c) => c.front?.trim() && c.back?.trim())
      .map((c) => ({
        front: c.front!.trim(),
        back: c.back!.trim(),
        distractors: Array.isArray(c.distractors)
          ? (c.distractors as string[]).filter((d) => typeof d === "string" && d.trim())
          : [],
      }));

    if (cards.length === 0) return { error: "AI returned no valid cards" };
    return { cards, charCount: textContent.trim().length, remainingChars: balanceAfterDeduct?.chars_balance };
  } catch (err) {
    console.error("[ai-import] Claude error:", err);
    return { error: (err as Error).message ?? "Unknown error" };
  }
}
