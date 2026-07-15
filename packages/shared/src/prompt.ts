import { getPreset } from "./presets";

/**
 * Quality/style descriptors appended to every generation prompt. Nudges video
 * models toward a cinematic look regardless of how terse the user's prompt is.
 */
export const CINEMATIC_STYLE_SUFFIX =
  "cinematic film still, professional cinematography, dramatic natural lighting, " +
  "shallow depth of field, rich color grading, crisp detail, realistic textures, " +
  "smooth natural motion, high dynamic range, shot on 35mm";

/**
 * Default negative prompt — the failure modes most worth suppressing in AI
 * video (used by providers that accept a negative prompt, e.g. fal/Kling).
 */
export const DEFAULT_NEGATIVE_PROMPT =
  "blurry, low quality, low resolution, pixelated, distorted, deformed, disfigured, " +
  "warped face, mutated hands, extra limbs, bad anatomy, watermark, text, caption, logo, " +
  "jpeg artifacts, oversaturated, harsh flicker, choppy motion, morphing artifacts, ugly";

export interface BuiltPrompt {
  enhancedPrompt: string;
  negativePrompt: string;
}

function cleanClause(s: string): string {
  return s.trim().replace(/\s+/g, " ").replace(/[.。]+$/, "");
}

/**
 * Deterministic, no-network prompt builder. Composes the user's subject with
 * the selected camera-motion preset and the cinematic style suffix, and merges
 * the default negative prompt with any user-supplied negatives. Shared by the
 * API (source of truth, stored on the generation) and the web app (instant
 * preview) so the two never drift.
 */
export function buildEnhancedPrompt(input: {
  prompt: string;
  motionPreset?: string | null;
  negativePrompt?: string | null;
}): BuiltPrompt {
  const subject = cleanClause(input.prompt);
  const preset = getPreset(input.motionPreset);

  const parts = [subject];
  if (preset) parts.push(cleanClause(preset.motion));
  parts.push(CINEMATIC_STYLE_SUFFIX);

  const userNegative = input.negativePrompt ? cleanClause(input.negativePrompt) : "";
  const negativePrompt = userNegative
    ? `${DEFAULT_NEGATIVE_PROMPT}, ${userNegative}`
    : DEFAULT_NEGATIVE_PROMPT;

  return {
    enhancedPrompt: parts.filter(Boolean).join(", "),
    negativePrompt,
  };
}
