import Anthropic from "@anthropic-ai/sdk";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { rateLimitUser } from "@/utils/rate-limit";

const anthropic = new Anthropic();

type LearnCard = {
  id: string;
  front: string;
  back: string;
  romanization: string | null;
  acceptedAnswers: string[];
};

function buildSystemPrompt(
  cards: LearnCard[],
  courseLanguages: { source: string | null; target: string | null },
) {
  const sourceLang = courseLanguages.source;
  const targetLang = courseLanguages.target;

  const langInstruction = sourceLang
    ? `You MUST conduct this entire tutoring session in ${sourceLang}. Ask all questions, give all feedback, and write all messages in ${sourceLang}. ${targetLang ? `The student's native language is ${targetLang}, so you may briefly clarify a correction in ${targetLang} only when the student is clearly confused, but default to ${sourceLang} at all times.` : ""}`
    : "Conduct the session in the language of the cards.";

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

  return `You are a high-energy, creative language tutor — part teacher, part game show host. You are testing a student on their flashcard deck in a fun and exciting way.

LANGUAGE: ${langInstruction}

CARDS TO TEST (${cards.length} total):
${cardList}

QUESTION VARIETY — rotate through these formats, never use the same type twice in a row:
1. 🔤 Direct translation — "How do you say '...' ?"
2. 📝 Fill in the blank — give a sentence with a ___ gap
3. 🎭 Role-play scenario — "You're at a market / café / airport... how do you say..."
4. 🔁 Reverse it — give the back text, ask for the front
5. 🧩 Multiple choice — present 3 options (one correct, two plausible wrong ones made up by you)
6. 💡 Riddle / describe it — describe the meaning without saying the word, student guesses
7. 🔗 Use it in a sentence — student must use the word naturally
8. ⚡ Rapid fire — short clue, expect a one-word snap answer
9. 🌍 Real-world prompt — "You want to [situation]... what do you say?"
10. 😂 Emoji clue — give 1–3 emojis that hint at the meaning, student guesses the word

INSTRUCTIONS:
- Pick the most fun and fitting question type for each card — surprise the student.
- After evaluating each student answer, include this hidden marker on its own line exactly as shown:
  %%EVAL:CARD_ID:correct%% or %%EVAL:CARD_ID:incorrect%%
  Replace CARD_ID with the actual card ID in brackets above.
- Be generous — accept reasonable paraphrases and minor spelling errors as correct.
- React to answers with energy: celebrate wins ("🎉 Perfect!"), gently tease mistakes ("Ohhh so close!"), give a quick explanation when wrong.
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
  const { messages, cards, courseLanguages } = body as {
    messages: { role: "user" | "assistant"; content: string }[];
    cards: LearnCard[];
    courseLanguages: { source: string | null; target: string | null };
  };

  if (!Array.isArray(cards) || cards.length === 0) {
    return new Response("No cards provided", { status: 400 });
  }

  const systemPrompt = buildSystemPrompt(cards, courseLanguages ?? {});

  const stream = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 768,
    system: systemPrompt,
    messages: messages.length > 0 ? messages : [{ role: "user", content: "__START__" }],
    stream: true,
  });

  const readable = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          controller.enqueue(enc.encode(event.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
