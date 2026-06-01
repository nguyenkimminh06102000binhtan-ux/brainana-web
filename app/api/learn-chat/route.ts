import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { rateLimitUser } from "@/utils/rate-limit";
import { getCategoryForItem, CATEGORY_TREE } from "@/app/constants/categories";
import { aiStream } from "@/utils/ai-client";
import { deductQuota, getQuotaBalance } from "@/utils/quota";

type LearnCard = {
  id: string;
  front: string;
  back: string;
  romanization: string | null;
  acceptedAnswers: string[];
};

function getCategoryGroup(category: string | null): string | null {
  if (!category) return null;
  // category may already be the group label
  const direct = CATEGORY_TREE.find((g) => g.label === category);
  if (direct) return direct.label;
  return getCategoryForItem(category);
}

function isMathScience(category: string | null): boolean {
  return getCategoryGroup(category) === "Science & Mathematics";
}

function isLanguage(category: string | null): boolean {
  return getCategoryGroup(category) === "Languages";
}

function buildDifficultyInstruction(level: string | null): string {
  if (!level || level === "any") {
    return "Mix question difficulty naturally. Start simple to build confidence, then gradually increase complexity. Include a range from straightforward recall to application questions.";
  }
  if (level === "beginner") {
    return "Keep questions straightforward. One concept per question. No tricks.";
  }
  if (level === "intermediate") {
    return "Mix straightforward and application questions. Some should require connecting two concepts.";
  }
  // advanced
  return "Prioritize application, synthesis, and edge cases. Challenge assumptions.";
}

function buildSystemPrompt(
  cards: LearnCard[],
  courseLanguages: { source: string | null; target: string | null },
  category: string | null,
  level: string | null,
  audioCardIds: Set<string>,
) {
  const sourceLang = courseLanguages.source;
  const targetLang = courseLanguages.target;

  const mathScienceMode = isMathScience(category);
  const languageMode = isLanguage(category);

  const subjectNote = mathScienceMode
    ? `The SUBJECT is ${category ?? "Maths & Science"} — you are testing scientific/mathematical concepts, NOT teaching a spoken language. Do NOT ask translation questions.`
    : languageMode
    ? `The SUBJECT IS language learning — test vocabulary, grammar, and usage.`
    : `The SUBJECT is ${category ?? "general knowledge"} — test concepts and understanding.`;

  const langInstruction = sourceLang
    ? `Conduct the entire session — questions, feedback, hints — in ${sourceLang}. ${subjectNote} ${targetLang ? `The vocabulary being studied is ${targetLang}; the student already speaks ${sourceLang} and is learning ${targetLang}. Never switch to ${targetLang} for your own explanations — only quote ${targetLang} words when asking about them.` : ""}`
    : `Conduct the session in the language of the card fronts. ${subjectNote}`;

  const cardList = cards
    .map(
      (c) =>
        `[${c.id}]${audioCardIds.has(c.id) ? " [audio]" : ""} "${c.front}" → "${c.back}"` +
        (c.romanization ? ` (${c.romanization})` : "") +
        (c.acceptedAnswers.length > 1
          ? ` [also accepted: ${c.acceptedAnswers.slice(1).join(", ")}]`
          : ""),
    )
    .join("\n");

  const questionTypes = mathScienceMode
    ? `AVAILABLE QUESTION FORMATS — choose whichever type best suits each card. Avoid using the same type twice in a row. Use your judgment; don't follow this list in order.
1. 🔢 Apply it — give real numbers and ask the student to calculate using the formula
2. 🔀 Solve for variable — give the formula with one variable unknown, ask to rearrange and solve
3. 📖 Word problem — describe a real-world scenario (physics experiment, chemistry reaction, etc.) and ask which formula applies and what the answer is
4. 🧩 Multiple choice — present 3 plausible answers (one correct, two common misconceptions)
5. ❓ What does it mean? — ask the student to explain what each symbol/variable in the formula represents
6. 📐 Units check — ask what units the result is expressed in, or spot the unit error
7. ✅ True / False — state a calculation or application, student judges if it's correct
8. 🔍 Spot the mistake — show a worked example with a deliberate error, ask the student to find it
9. 🌍 Real-world connection — ask where this formula is used in daily life or a specific field
10. ⚡ Rapid recall — ask the student to state the formula from memory`
    : languageMode
    ? (() => {
        const hasRomanization = cards.some((c) => c.romanization);
        const hasAudio = audioCardIds.size > 0;
        return `AVAILABLE QUESTION FORMATS — choose whichever type best suits each card. Avoid using the same type twice in a row. Use your judgment; don't follow this list in order.
1. 🔤 Direct translation — "How do you say '...' ?"
2. 📝 Fill in the blank — give a sentence with a ___ gap
3. 🎭 Role-play scenario — "You're at a market / café / airport... how do you say..."
4. 🔁 Reverse it — give the back text, ask for the front
5. 🧩 Multiple choice — present 3 options (one correct, two plausible wrong ones made up by you)
6. 💡 Riddle / describe it — describe the meaning without saying the word, student guesses
7. 🔗 Use it in a sentence — student must use the word naturally
8. ⚡ Rapid fire — short clue, expect a one-word snap answer
9. 🌍 Real-world prompt — "You want to [situation]... what do you say?"
10. 🎵 Rhythm recall — give the first syllable or a rhyme hint, student completes the word${hasRomanization ? `
11. 🔊 Romanization recall — show the romanization of a card that has one (e.g. "annyeonghaseyo"), ask the student to write the native script (e.g. 안녕하세요). Only use this for cards where romanization is available in the card list above; skip it entirely for cards without romanization.` : ""}${hasAudio ? `
12. 🎧 Listen and answer — use %%AUDIO:CARD_ID%% to play the pronunciation of a card marked [audio], then ask the student what the word means or how to spell it. Only use card IDs marked [audio] in the card list above.` : ""}`;
      })()
    : `AVAILABLE QUESTION FORMATS — choose whichever type best suits each card. Avoid using the same type twice in a row. Use your judgment; don't follow this list in order.
1. 📝 Fill in the blank — give a sentence or fact with a ___ gap
2. 🔁 Reverse it — give the answer/description, ask for the term
3. 🧩 Multiple choice — present 3 options (one correct, two plausible wrong ones)
4. 💡 Riddle / describe it — describe the concept without naming it, student guesses
5. ✅ True / False — state a fact, student judges if it's correct
6. ⚡ Rapid recall — short clue, expect a snappy answer
7. 🌍 Real-world connection — ask where or how this concept appears in the real world
8. 🔍 Spot the mistake — state something slightly wrong, ask the student to correct it
9. ❓ Explain it — ask the student to explain the concept in their own words
10. 🗓️ Give an example — ask the student to provide a real example of the concept`;

  const persona = mathScienceMode
    ? "You are an energetic and sharp science/math tutor — part professor, part quiz master. You create real problems from formulas and concepts to test deep understanding, not just memorisation."
    : languageMode
    ? "You are a high-energy, creative language tutor — part teacher, part game show host. You test a student on their flashcard deck in a fun and exciting way."
    : "You are an enthusiastic and sharp tutor — part teacher, part quiz master. You test a student on their flashcard deck with varied, thought-provoking questions.";

  return `${persona}

LANGUAGE: ${langInstruction}

DIFFICULTY: ${buildDifficultyInstruction(level)}

CARDS TO TEST (${cards.length} total):
${cardList}

${questionTypes}

INSTRUCTIONS:
- For mathematical content: always use Unicode characters — never LaTeX or code-style notation. Use superscripts (², ³, ⁴, ⁿ), subscripts (₀, ₁, ₂), fractions (½, ⅓, ¼), Greek letters (π, α, β, γ, θ, λ, μ, σ, ω, ∆, Σ), and math symbols (×, ÷, ≤, ≥, ≠, ≈, √, ∞, ∫, ∑). Write formulas in readable plain form e.g. 'a = ∆v/∆t', 'E = mc²', 'ω = ∆θ/∆t'. Never use $...$, \\frac, \\text, \\omega, or ^ for exponents.
- DISTRIBUTE question types evenly across the session. No single type should appear more than 2 times in a row or more than 30% of all questions. Spread audio questions (🎧) evenly throughout — use them from the first few questions onward, not only at the end.
- Never use the same question type twice in a row.
- After evaluating each student answer, include this hidden marker on its own line exactly as shown:
  %%EVAL:CARD_ID:correct%% or %%EVAL:CARD_ID:incorrect%%
  Replace CARD_ID with the actual card ID in brackets above.
- Be generous — accept reasonable paraphrases and minor errors as correct.
- React with energy: celebrate wins ("🎉 Exactly!"), gently tease mistakes ("Ohhh so close!"), give a quick explanation when wrong.
- Keep each response punchy — 2–3 sentences max before the next question.
- You MUST test EXACTLY ${cards.length} cards — one question per card, no more. After the ${cards.length}th card is evaluated, give a short hype recap with the score and stop — do NOT ask any further questions.

Begin with ONE high-energy greeting line (no more), then fire the first question immediately.`;
}

export async function POST(req: NextRequest) {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const rl = await rateLimitUser(user.id, "learn-chat", {
    limit: 60,
    windowSeconds: 3600,
  });
  if (!rl.allowed) {
    return new Response("Rate limit exceeded", { status: 429 });
  }

  const body = await req.json();
  const { messages, cards, courseLanguages, category, level, audioCardIds: audioCardIdsArr } = body as {
    messages: { role: "user" | "assistant"; content: string }[];
    cards: LearnCard[];
    courseLanguages: { source: string | null; target: string | null };
    category: string | null;
    level: string | null;
    audioCardIds?: string[];
  };
  const audioCardIds = new Set<string>(audioCardIdsArr ?? []);

  if (!Array.isArray(cards) || cards.length === 0) {
    return new Response("No cards provided", { status: 400 });
  }

  // Deduct 1 session quota only when starting a new conversation
  let remainingSessions: number | undefined;
  if (!messages || messages.length === 0) {
    const ok = await deductQuota(supabase, user.id, "tutor_sessions", 1, { feature: "ai_tutor" });
    if (!ok) return new Response("Insufficient tutor session balance", { status: 402 });
    const balance = await getQuotaBalance(supabase, user.id);
    remainingSessions = balance?.tutor_sessions_balance;
  }

  // Hard cap at 50 cards regardless of what the client sends
  const cappedCards = cards.slice(0, 50);

  const systemPrompt = buildSystemPrompt(cappedCards, courseLanguages ?? {}, category ?? null, level ?? null, audioCardIds);

  // Keep only the last 10 messages to prevent quadratic token growth
  const MAX_HISTORY = 10;
  const trimmedMessages = messages.slice(-MAX_HISTORY);

  const readable = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const gen = aiStream({
        system: systemPrompt,
        messages: trimmedMessages.length > 0 ? trimmedMessages : [{ role: "user", content: "__START__" }],
        maxTokens: 768,
        cacheSystem: true, // prompt caching (Anthropic only, no-op on Mistral)
      });
      for await (const chunk of gen) {
        controller.enqueue(enc.encode(chunk));
      }
      controller.close();
    },
  });

  const headers: Record<string, string> = { "Content-Type": "text/plain; charset=utf-8" };
  if (remainingSessions !== undefined) {
    headers["X-Remaining-Sessions"] = String(remainingSessions);
  }
  return new Response(readable, { headers });
}
