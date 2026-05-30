"use server";

import Anthropic from "@anthropic-ai/sdk";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { rateLimitUser } from "@/utils/rate-limit";

const anthropic = new Anthropic();

const BLOCKED_EXTENSIONS = new Set([
  "exe", "dmg", "pkg", "zip", "rar", "tar",
  "mp3", "mp4", "mov", "psd", "ai", "fig",
  "db", "sql", "py", "js", "ts",
]);

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);
const IMAGE_MIME: Record<string, "image/jpeg" | "image/png" | "image/gif" | "image/webp"> = {
  jpg: "image/jpeg", jpeg: "image/jpeg",
  png: "image/png", gif: "image/gif", webp: "image/webp",
};

const CARD_STYLE_DESCRIPTIONS: Record<string, string> = {
  vocabulary:  "Single word pairs (e.g. Apple → 사과)",
  phrases:     "Full sentence pairs (e.g. How are you? → 잘 지내세요?)",
  definitions: "Term + explanation (e.g. Photosynthesis → The process by which plants convert sunlight to energy)",
  qa:          "Concept questions (e.g. What is the capital of France? → Paris)",
  translation: "Full sentence translation (e.g. I love learning → 나는 배우는 것을 좋아해)",
};

export type AiImportResult =
  | { cards: Array<{ front: string; back: string }> }
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

  const files = formData.getAll("files") as File[];

  // Validate blocked types server-side
  for (const file of files) {
    const ext = file.name.toLowerCase().split(".").pop() ?? "";
    if (BLOCKED_EXTENSIONS.has(ext)) return { error: `Blocked file type: .${ext}` };
  }

  // Build Claude message content
  const contentBlocks: Anthropic.MessageParam["content"] = [];
  let textContent = pastedText;

  for (const file of files) {
    const ext = file.name.toLowerCase().split(".").pop() ?? "";
    const bytes = Buffer.from(await file.arrayBuffer());

    try {
      if (IMAGE_EXTENSIONS.has(ext)) {
        contentBlocks.push({
          type: "image",
          source: { type: "base64", media_type: IMAGE_MIME[ext]!, data: bytes.toString("base64") },
        });
      } else if (ext === "pdf") {
        contentBlocks.push({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: bytes.toString("base64") },
        } as unknown as Anthropic.TextBlockParam);
      } else if (ext === "docx") {
        const mammoth = (await import("mammoth")).default;
        const { value } = await mammoth.extractRawText({ buffer: bytes });
        textContent += "\n" + value;
      } else if (ext === "xlsx") {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(bytes, { type: "buffer" });
        for (const name of wb.SheetNames.slice(0, 3)) {
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
    `Generate exactly ${count} flashcard pairs.`,
    focusInstruction   ? `Focus on: ${focusInstruction}` : "",
    textContent.trim() ? `\nSource content:\n${textContent.trim().slice(0, 15_000)}` : "",
    "",
    "Rules:",
    `- Front (question side): use ${sourceLanguage || "the source language"}`,
    `- Back (answer side): use ${targetLanguage || "the target language"}`,
    "- Every card must be unique",
    "- Strictly match the card style",
    "- If the source is a multiple-choice question and the correct answer is a combination option that references multiple other options, expand the back to list the actual text of every referenced option joined by ' / '. Recognize all of these patterns (in any language): explicit combination phrases ('All of the above', 'Both A and B', 'Cả a, b và c', 'Cả a, b, c đều đúng', 'Toutes ces réponses', 'Todas las anteriores'); SHORT bare-list forms where the answer text is nothing but a list of option letters ('Cả a, b, c' with or without 'đều đúng', 'a, b và c', 'a và b', 'A, B, C'); or any structurally equivalent pattern where the answer contains only letter references and no independent content. Never write 'All of the above', its translation, or bare letter labels as the back.",
    "",
    "Return ONLY a valid JSON array — no markdown, no explanation, nothing else:",
    '[{"front": "...", "back": "..."}, ...]',
  ].filter(Boolean).join("\n");

  contentBlocks.push({ type: "text", text: promptLines });

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 8192,
      system: "You are a JSON generator. Respond with only a valid JSON array. No markdown, no code fences, no explanation — just the raw JSON array.",
      messages: [{ role: "user", content: contentBlocks }],
    });

    if (msg.stop_reason === "max_tokens") {
      return { error: "AI response was too long to process. Try requesting fewer cards." };
    }

    const raw = msg.content.find((b) => b.type === "text");
    const rawText = raw?.type === "text" ? raw.text : "";
    const text = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) {
      console.error("[ai-import] No JSON array in response:", rawText.slice(0, 300));
      return { error: "Could not parse AI response — no JSON array found" };
    }

    const parsed = JSON.parse(match[0]) as Array<{ front?: string; back?: string }>;
    const cards = parsed
      .filter((c) => c.front?.trim() && c.back?.trim())
      .map((c) => ({ front: c.front!.trim(), back: c.back!.trim() }));

    if (cards.length === 0) return { error: "AI returned no valid cards" };
    return { cards };
  } catch (err) {
    console.error("[ai-import] Claude error:", err);
    return { error: (err as Error).message ?? "Unknown error" };
  }
}
