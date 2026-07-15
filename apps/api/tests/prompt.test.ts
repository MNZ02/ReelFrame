import { describe, expect, test } from "bun:test";
import {
  buildEnhancedPrompt,
  CINEMATIC_STYLE_SUFFIX,
  DEFAULT_NEGATIVE_PROMPT,
  getPreset,
} from "@repo/shared";
import { enhancePrompt } from "../src/lib/prompt-enhancer";

describe("buildEnhancedPrompt", () => {
  test("composes subject + cinematic suffix when no preset", () => {
    const out = buildEnhancedPrompt({ prompt: "a fox in a snowy forest" });
    expect(out.enhancedPrompt.startsWith("a fox in a snowy forest,")).toBe(true);
    expect(out.enhancedPrompt.endsWith(CINEMATIC_STYLE_SUFFIX)).toBe(true);
  });

  test("injects the preset's motion clause when a preset is given", () => {
    const preset = getPreset("crash-zoom")!;
    const out = buildEnhancedPrompt({ prompt: "a lone samurai", motionPreset: "crash-zoom" });
    expect(out.enhancedPrompt).toContain(preset.motion);
    expect(out.enhancedPrompt).toContain("a lone samurai");
    expect(out.enhancedPrompt).toContain(CINEMATIC_STYLE_SUFFIX);
  });

  test("ignores an unknown preset slug (no crash, no motion clause)", () => {
    const out = buildEnhancedPrompt({ prompt: "a city street", motionPreset: "does-not-exist" });
    expect(out.enhancedPrompt).toContain("a city street");
  });

  test("negative prompt defaults, and user negatives are appended", () => {
    const plain = buildEnhancedPrompt({ prompt: "x" });
    expect(plain.negativePrompt).toBe(DEFAULT_NEGATIVE_PROMPT);

    const withNeg = buildEnhancedPrompt({ prompt: "x", negativePrompt: "rain, umbrellas" });
    expect(withNeg.negativePrompt.startsWith(DEFAULT_NEGATIVE_PROMPT)).toBe(true);
    expect(withNeg.negativePrompt.endsWith("rain, umbrellas")).toBe(true);
  });

  test("collapses whitespace and strips trailing punctuation in the subject", () => {
    const out = buildEnhancedPrompt({ prompt: "  a   red   balloon.  " });
    expect(out.enhancedPrompt.startsWith("a red balloon,")).toBe(true);
  });
});

describe("enhancePrompt", () => {
  test("returns the rule-based result when no LLM enhancer is configured (test env)", async () => {
    // Test env has PROMPT_ENHANCER unset (=> 'rule') and no LLM_API_KEY, so
    // this must not make any network call and must equal the pure builder.
    const input = { prompt: "a dragon over mountains", motionPreset: "orbit-360" };
    const out = await enhancePrompt(input);
    expect(out).toEqual(buildEnhancedPrompt(input));
  });
});
