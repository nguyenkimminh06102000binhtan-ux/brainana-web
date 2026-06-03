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
  mistral:   "mistral-large-latest",
  // Vision models (used for image OCR only)
  anthropicVision: "claude-haiku-4-5-20251001",
  mistralVision:   "pixtral-large-latest",
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

type ChatCompletionLike = {
  choices: Array<{
    message?: { content?: string | null };
    finish_reason?: string | null;
  }>;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(error: unknown) {
  return Boolean(error && typeof error === "object" && "status" in error && (error as { status?: number }).status === 429);
}

// ── Non-streaming completion ──────────────────────────────────────────────────
export async function aiComplete(opts: AICompleteOptions): Promise<AICompleteResult> {

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
    return result;
  }

  // Mistral via OpenAI-compatible API
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({
    apiKey:  process.env.MISTRAL_API_KEY!,
    baseURL: "https://api.mistral.ai/v1",
  });

  let completion: ChatCompletionLike | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      completion = await client.chat.completions.create({
        model:      MODELS.mistral,
        max_tokens: opts.maxTokens,
        messages: [
          { role: "system", content: opts.system },
          ...opts.messages,
        ],
      }) as ChatCompletionLike;
      break;
    } catch (error) {
      if (!isRateLimitError(error) || attempt === 2) throw error;
      await sleep(5_000 * (attempt + 1));
    }
  }

  const choice = completion?.choices[0];
  const result = {
    text:       choice?.message?.content ?? "",
    stopReason: choice?.finish_reason ?? "stop",
  };
  return result;
}

// ── Streaming completion ──────────────────────────────────────────────────────
export async function* aiStream(opts: AICompleteOptions): AsyncGenerator<string> {

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

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
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

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

// ── Vision: extract text from an image (replaces Tesseract) ──────────────────
type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export async function aiExtractTextFromImage(
  imageBytes: Buffer,
  mediaType: ImageMediaType,
): Promise<string> {
  const base64 = imageBytes.toString("base64");
  const prompt = "Extract all text from this image exactly as it appears. Return only the extracted text with no additional commentary.";

  if (PROVIDER === "anthropic") {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();
    const msg = await client.messages.create({
      model:      MODELS.anthropicVision,
      max_tokens: 4096,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: prompt },
        ],
      }],
    });
    const block = msg.content.find((b) => b.type === "text");
    return block?.type === "text" ? block.text : "";
  }

  // Mistral via Pixtral vision model
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({
    apiKey:  process.env.MISTRAL_API_KEY!,
    baseURL: "https://api.mistral.ai/v1",
  });
  const completion = await client.chat.completions.create({
    model:      MODELS.mistralVision,
    max_tokens: 4096,
    messages: [{
      role: "user",
      content: [
        { type: "image_url", image_url: { url: `data:${mediaType};base64,${base64}` } },
        { type: "text", text: prompt },
      ],
    }],
  });
  return completion.choices[0]?.message?.content ?? "";
}
