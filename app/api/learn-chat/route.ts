import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { rateLimitUser } from "@/utils/rate-limit";
import { getCategoryForItem, CATEGORY_TREE } from "@/app/constants/categories";
import { aiStream } from "@/utils/ai-client";

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
  return getCategoryGroup(category) === "Maths & Science";
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
    ? `Write all messages in ${sourceLang}. ${subjectNote} ${targetLang ? `The student's native language is ${targetLang} — you may briefly clarify in ${targetLang} only when the student is clearly confused.` : ""}`
    : `Conduct the session in the language of the cards. ${subjectNote}`;

  const cardList = cards
    .map(
      (c) =>
        `[${c.id}] "${c.front}" → "${c.back}"` +
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
11. 🔊 Romanization recall — show the romanization of a card that has one (e.g. "annyeonghaseyo"), ask the student to write the native script (e.g. 안녕하세요). Only use this for cards where romanization is available in the card list above; skip it entirely for cards without romanization.` : ""}`;
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
- For each card, pick the question format that best fits its content — a formula card suits "Apply it" or "Spot the mistake", a vocab card suits "Riddle" or "Fill in the blank", etc. Surprise the student.
- After evaluating each student answer, include this hidden marker on its own line exactly as shown:
  %%EVAL:CARD_ID:correct%% or %%EVAL:CARD_ID:incorrect%%
  Replace CARD_ID with the actual card ID in brackets above.
- Be generous — accept reasonable paraphrases and minor errors as correct.
- React with energy: celebrate wins ("🎉 Exactly!"), gently tease mistakes ("Ohhh so close!"), give a quick explanation when wrong.
- Keep each response punchy — 2–3 sentences max before the next question.
- After all ${cards.length} cards, give a hype end-of-session recap with a score and a fun comment.

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
  const { messages, cards, courseLanguages, category, level } = body as {
    messages: { role: "user" | "assistant"; content: string }[];
    cards: LearnCard[];
    courseLanguages: { source: string | null; target: string | null };
    category: string | null;
    level: string | null;
  };

  if (!Array.isArray(cards) || cards.length === 0) {
    return new Response("No cards provided", { status: 400 });
  }

  // Hard cap at 100 cards regardless of what the client sends
  const cappedCards = cards.slice(0, 100);

  const systemPrompt = buildSystemPrompt(cappedCards, courseLanguages ?? {}, category ?? null, level ?? null);

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

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
