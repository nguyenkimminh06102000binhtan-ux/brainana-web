/**
 * AI Provider Abstraction
 *
 * ┌─────────────────────────────────────────────────────┐
 * │  Change this ONE line to switch between providers:  │
 * └─────────────────────────────────────────────────────┘
 */
export const PROVIDER: "anthropic" | "mistral" = "mistral";

// ── Model mapping ─────────────────────────────────────────────────────────────
const MODELS = {
  anthropic: "claude-haiku-4-5-20251001",
  mistral:   "mistral-medium-latest",
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────
export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AICompleteOptions {
  system: string;
  messages: AIMessage[];
  maxTokens: number;
  /** Enable prompt caching on the system prompt (Anthropic only, no-op on Mistral) */
  cacheSystem?: boolean;
}

export interface AICompleteResult {
  text: string;
  stopReason: string;
}

// ── Non-streaming completion ──────────────────────────────────────────────────
export async function aiComplete(opts: AICompleteOptions): Promise<AICompleteResult> {
  console.log(`[AI] provider=${PROVIDER}  model=${MODELS[PROVIDER]}  maxTokens=${opts.maxTokens}`);

  if (PROVIDER === "anthropic") {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();

    const systemParam = opts.cacheSystem
      ? [{ type: "text" as const, text: opts.system, cache_control: { type: "ephemeral" as const } }]
      : opts.system;

    const msg = await client.messages.create({
      model:      MODELS.anthropic,
      max_tokens: opts.maxTokens,
      system:     systemParam,
      messages:   opts.messages,
    });

    const block = msg.content.find((b) => b.type === "text");
    const result = {
      text:       block?.type === "text" ? block.text : "",
      stopReason: msg.stop_reason ?? "end_turn",
    };
    console.log(`[AI] response (${result.text.length} chars): ${result.text.slice(0, 500)}${result.text.length > 500 ? "…" : ""}`);
    return result;
  }

  // Mistral via OpenAI-compatible API
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({
    apiKey:  process.env.MISTRAL_API_KEY!,
    baseURL: "https://api.mistral.ai/v1",
  });

  const completion = await client.chat.completions.create({
    model:      MODELS.mistral,
    max_tokens: opts.maxTokens,
    messages: [
      { role: "system", content: opts.system },
      ...opts.messages,
    ],
  });

  const choice = completion.choices[0];
  const result = {
    text:       choice?.message?.content ?? "",
    stopReason: choice?.finish_reason ?? "stop",
  };
  console.log(`[AI] response (${result.text.length} chars): ${result.text.slice(0, 500)}${result.text.length > 500 ? "…" : ""}`);
  return result;
}

// ── Streaming completion ──────────────────────────────────────────────────────
export async function* aiStream(opts: AICompleteOptions): AsyncGenerator<string> {
  console.log(`[AI] provider=${PROVIDER}  model=${MODELS[PROVIDER]}  maxTokens=${opts.maxTokens}  streaming=true`);

  if (PROVIDER === "anthropic") {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();

    const systemParam = opts.cacheSystem
      ? [{ type: "text" as const, text: opts.system, cache_control: { type: "ephemeral" as const } }]
      : opts.system;

    const stream = await client.messages.create({
      model:      MODELS.anthropic,
      max_tokens: opts.maxTokens,
      system:     systemParam,
      messages:   opts.messages,
      stream:     true,
    });

    let full = "";
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        full += event.delta.text;
        yield event.delta.text;
      }
    }
    console.log(`[AI] stream response (${full.length} chars): ${full.slice(0, 500)}${full.length > 500 ? "…" : ""}`);
    return;
  }

  // Mistral streaming via OpenAI-compatible API
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({
    apiKey:  process.env.MISTRAL_API_KEY!,
    baseURL: "https://api.mistral.ai/v1",
  });

  const stream = await client.chat.completions.create({
    model:      MODELS.mistral,
    max_tokens: opts.maxTokens,
    messages: [
      { role: "system", content: opts.system },
      ...opts.messages,
    ],
    stream: true,
  });

  let full = "";
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) { full += delta; yield delta; }
  }
  console.log(`[AI] stream response (${full.length} chars): ${full.slice(0, 500)}${full.length > 500 ? "…" : ""}`);
}
