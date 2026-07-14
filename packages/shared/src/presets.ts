export interface MotionPreset {
  slug: string;
  name: string;
  promptTemplate: string;
  thumbnailUrl: string;
}

/**
 * Curated camera-motion preset catalog. `promptTemplate` uses `{prompt}` as
 * the substitution point for the user's raw prompt text. Thumbnails are
 * static assets served by apps/web from `public/presets/{slug}.jpg`.
 */
export const MOTION_PRESETS: MotionPreset[] = [
  {
    slug: "crash-zoom",
    name: "Crash Zoom",
    promptTemplate: "Crash zoom in on {prompt}, fast aggressive push-in, motion blur",
    thumbnailUrl: "/presets/crash-zoom.jpg",
  },
  {
    slug: "dolly-in",
    name: "Dolly In",
    promptTemplate: "Smooth dolly in on {prompt}, cinematic tracking shot",
    thumbnailUrl: "/presets/dolly-in.jpg",
  },
  {
    slug: "dolly-out",
    name: "Dolly Out",
    promptTemplate: "Slow dolly out revealing {prompt}, wide reveal shot",
    thumbnailUrl: "/presets/dolly-out.jpg",
  },
  {
    slug: "orbit-360",
    name: "360 Orbit",
    promptTemplate: "360 degree orbit camera move around {prompt}, smooth continuous rotation",
    thumbnailUrl: "/presets/orbit-360.jpg",
  },
  {
    slug: "bullet-time",
    name: "Bullet Time",
    promptTemplate: "Bullet time freeze effect around {prompt}, matrix-style time slice",
    thumbnailUrl: "/presets/bullet-time.jpg",
  },
  {
    slug: "handheld-shake",
    name: "Handheld Shake",
    promptTemplate: "Handheld shaky camera following {prompt}, documentary style",
    thumbnailUrl: "/presets/handheld-shake.jpg",
  },
  {
    slug: "crane-up",
    name: "Crane Up",
    promptTemplate: "Crane shot rising up and away from {prompt}, sweeping vertical reveal",
    thumbnailUrl: "/presets/crane-up.jpg",
  },
  {
    slug: "crane-down",
    name: "Crane Down",
    promptTemplate: "Crane shot descending onto {prompt}, dramatic vertical approach",
    thumbnailUrl: "/presets/crane-down.jpg",
  },
  {
    slug: "whip-pan",
    name: "Whip Pan",
    promptTemplate: "Fast whip pan across to reveal {prompt}, high energy transition",
    thumbnailUrl: "/presets/whip-pan.jpg",
  },
  {
    slug: "vertigo-dolly-zoom",
    name: "Vertigo Dolly Zoom",
    promptTemplate: "Dolly zoom (vertigo effect) on {prompt}, background stretches while subject stays fixed",
    thumbnailUrl: "/presets/vertigo-dolly-zoom.jpg",
  },
  {
    slug: "low-angle-push",
    name: "Low Angle Push",
    promptTemplate: "Low angle push-in shot on {prompt}, heroic upward perspective",
    thumbnailUrl: "/presets/low-angle-push.jpg",
  },
  {
    slug: "overhead-top-down",
    name: "Overhead Top-Down",
    promptTemplate: "Overhead top-down shot of {prompt}, bird's eye view",
    thumbnailUrl: "/presets/overhead-top-down.jpg",
  },
  {
    slug: "tracking-side",
    name: "Side Tracking",
    promptTemplate: "Side tracking shot following {prompt}, parallel lateral movement",
    thumbnailUrl: "/presets/tracking-side.jpg",
  },
  {
    slug: "static-locked",
    name: "Static Locked",
    promptTemplate: "Static locked-off shot of {prompt}, tripod stable framing",
    thumbnailUrl: "/presets/static-locked.jpg",
  },
  {
    slug: "fpv-drone-dive",
    name: "FPV Drone Dive",
    promptTemplate: "FPV drone dive toward {prompt}, fast swooping aerial descent",
    thumbnailUrl: "/presets/fpv-drone-dive.jpg",
  },
  {
    slug: "orbit-low",
    name: "Low Orbit",
    promptTemplate: "Low angle orbiting camera around {prompt}, ground-level rotation",
    thumbnailUrl: "/presets/orbit-low.jpg",
  },
  {
    slug: "zoom-out-reveal",
    name: "Zoom Out Reveal",
    promptTemplate: "Slow zoom out revealing the full scene around {prompt}",
    thumbnailUrl: "/presets/zoom-out-reveal.jpg",
  },
  {
    slug: "rack-focus",
    name: "Rack Focus",
    promptTemplate: "Rack focus pulling sharp focus onto {prompt}, shallow depth of field",
    thumbnailUrl: "/presets/rack-focus.jpg",
  },
  {
    slug: "steadicam-follow",
    name: "Steadicam Follow",
    promptTemplate: "Steadicam smooth follow shot tracking {prompt}, fluid continuous motion",
    thumbnailUrl: "/presets/steadicam-follow.jpg",
  },
  {
    slug: "slow-motion-push",
    name: "Slow Motion Push",
    promptTemplate: "Slow motion push-in on {prompt}, dramatic high frame rate feel",
    thumbnailUrl: "/presets/slow-motion-push.jpg",
  },
];

export function applyMotionPreset(prompt: string, presetSlug: string | null | undefined): string {
  if (!presetSlug) return prompt;
  const preset = MOTION_PRESETS.find((p) => p.slug === presetSlug);
  if (!preset) return prompt;
  return preset.promptTemplate.replace("{prompt}", prompt);
}
