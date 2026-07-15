import { buildEnhancedPrompt, getPreset, type BuiltPrompt } from "@repo/shared";
import { env } from "../env";

export interface EnhanceInput {
  prompt: string;
  motionPreset?: string | null;
  negativePrompt?: string | null;
}

const LLM_TIMEOUT_MS = 8_000;

const SYSTEM_PROMPT =
  "You are a prompt engineer for a cinematic text-to-video model. Rewrite the " +
  "user's idea into a single vivid, concrete prompt of 40-80 words. Describe the " +
  "subject, setting, lighting, mood, and the specified camera motion as one " +
  "flowing shot. Keep every concrete detail the user gave; do not invent named " +
  "people or brands. Output ONLY the prompt text — no preamble, no quotes, no line breaks.";

/**
 * Produce the final positive/negative prompt for a generation. Always computes
 * the deterministic rule-based prompt as a floor; when an LLM enhancer is
 * configured (PROMPT_ENHANCER=llm + LLM_API_KEY) it replaces the positive
 * prompt with an LLM rewrite, falling back to the rule-based result on any
 * error or timeout. The negative prompt always comes from the rule-based
 * builder so provider behavior stays predictable.
 */
export async function enhancePrompt(input: EnhanceInput): Promise<BuiltPrompt> {
  const base = buildEnhancedPrompt(input);

  if (env.PROMPT_ENHANCER !== "llm" || !env.LLM_API_KEY) {
    return base;
  }

  try {
    const rewritten = await callLlm(input);
    if (rewritten) {
      return { enhancedPrompt: rewritten, negativePrompt: base.negativePrompt };
    }
  } catch (err) {
    console.warn("[prompt-enhancer] LLM enhance failed, using rule-based prompt:", err);
  }
  return base;
}

async function callLlm(input: EnhanceInput): Promise<string | null> {
  const preset = getPreset(input.motionPreset);
  const userMessage = [
    `Idea: ${input.prompt.trim()}`,
    preset ? `Camera motion: ${preset.motion}` : "Camera motion: tasteful, motivated camera movement",
  ].join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    const res = await fetch(`${env.LLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.LLM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.LLM_MODEL,
        temperature: 0.7,
        max_tokens: 300,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`LLM request failed: ${res.status} ${await res.text()}`);
    }
    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = body.choices?.[0]?.message?.content?.trim();
    return text && text.length > 0 ? text.replace(/\s+/g, " ") : null;
  } finally {
    clearTimeout(timeout);
  }
}
