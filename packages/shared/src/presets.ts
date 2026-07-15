export type MotionCategory =
  | "Zoom & Push"
  | "Orbit"
  | "Aerial & Crane"
  | "Tracking"
  | "Reveal"
  | "Stylized"
  | "Static";

export const MOTION_CATEGORY_ORDER: MotionCategory[] = [
  "Zoom & Push",
  "Orbit",
  "Aerial & Crane",
  "Tracking",
  "Reveal",
  "Stylized",
  "Static",
];

export interface MotionPreset {
  slug: string;
  name: string;
  category: MotionCategory;
  /**
   * The camera-motion clause appended to the subject when building the final
   * prompt (see buildEnhancedPrompt). Written as a descriptive shot, not a
   * template — the subject is composed in front of it.
   */
  motion: string;
  thumbnailUrl: string;
}

/**
 * Curated camera-motion preset catalog. `motion` describes the camera move in
 * cinematographer's terms; buildEnhancedPrompt() composes it with the user's
 * subject and a cinematic quality suffix. Thumbnails are static assets served
 * by apps/web from `public/presets/{slug}.svg`.
 */
export const MOTION_PRESETS: MotionPreset[] = [
  {
    slug: "crash-zoom",
    name: "Crash Zoom",
    category: "Zoom & Push",
    motion: "an aggressive crash zoom snapping in fast with motion blur and a sudden punch of energy",
    thumbnailUrl: "/presets/crash-zoom.svg",
  },
  {
    slug: "dolly-in",
    name: "Dolly In",
    category: "Zoom & Push",
    motion: "a slow, deliberate dolly push-in that steadily closes the distance, building intimacy",
    thumbnailUrl: "/presets/dolly-in.svg",
  },
  {
    slug: "low-angle-push",
    name: "Low Angle Push",
    category: "Zoom & Push",
    motion: "a low-angle hero push-in tilting slightly upward for an imposing, powerful perspective",
    thumbnailUrl: "/presets/low-angle-push.svg",
  },
  {
    slug: "slow-motion-push",
    name: "Slow Motion Push",
    category: "Zoom & Push",
    motion: "a slow-motion push-in at high frame rate, every detail rendered in fluid dramatic slow motion",
    thumbnailUrl: "/presets/slow-motion-push.svg",
  },
  {
    slug: "orbit-360",
    name: "360 Orbit",
    category: "Orbit",
    motion: "a smooth continuous 360-degree orbit circling all the way around, holding the subject centered",
    thumbnailUrl: "/presets/orbit-360.svg",
  },
  {
    slug: "orbit-low",
    name: "Low Orbit",
    category: "Orbit",
    motion: "a ground-level orbit rotating around from a low angle, sweeping past foreground detail",
    thumbnailUrl: "/presets/orbit-low.svg",
  },
  {
    slug: "crane-up",
    name: "Crane Up",
    category: "Aerial & Crane",
    motion: "a sweeping crane move rising up and pulling back for an expansive vertical reveal",
    thumbnailUrl: "/presets/crane-up.svg",
  },
  {
    slug: "crane-down",
    name: "Crane Down",
    category: "Aerial & Crane",
    motion: "a dramatic crane descent lowering down toward the subject from above",
    thumbnailUrl: "/presets/crane-down.svg",
  },
  {
    slug: "overhead-top-down",
    name: "Overhead Top-Down",
    category: "Aerial & Crane",
    motion: "a top-down bird's-eye shot looking straight down, drifting slowly over the scene",
    thumbnailUrl: "/presets/overhead-top-down.svg",
  },
  {
    slug: "fpv-drone-dive",
    name: "FPV Drone Dive",
    category: "Aerial & Crane",
    motion: "a fast FPV drone dive swooping and banking toward the subject with kinetic aerial momentum",
    thumbnailUrl: "/presets/fpv-drone-dive.svg",
  },
  {
    slug: "tracking-side",
    name: "Side Tracking",
    category: "Tracking",
    motion: "a lateral tracking shot moving parallel alongside the subject at a steady matched pace",
    thumbnailUrl: "/presets/tracking-side.svg",
  },
  {
    slug: "steadicam-follow",
    name: "Steadicam Follow",
    category: "Tracking",
    motion: "a fluid steadicam follow gliding smoothly behind the subject through continuous motion",
    thumbnailUrl: "/presets/steadicam-follow.svg",
  },
  {
    slug: "handheld-shake",
    name: "Handheld Shake",
    category: "Tracking",
    motion: "a raw handheld camera with natural shake and urgency, documentary vérité energy",
    thumbnailUrl: "/presets/handheld-shake.svg",
  },
  {
    slug: "dolly-out",
    name: "Dolly Out",
    category: "Reveal",
    motion: "a slow dolly pull-back widening out to reveal the surrounding environment",
    thumbnailUrl: "/presets/dolly-out.svg",
  },
  {
    slug: "zoom-out-reveal",
    name: "Zoom Out Reveal",
    category: "Reveal",
    motion: "a gradual zoom-out unveiling the full scale of the scene around the subject",
    thumbnailUrl: "/presets/zoom-out-reveal.svg",
  },
  {
    slug: "whip-pan",
    name: "Whip Pan",
    category: "Stylized",
    motion: "a fast whip pan streaking across with motion blur into a snappy high-energy reveal",
    thumbnailUrl: "/presets/whip-pan.svg",
  },
  {
    slug: "vertigo-dolly-zoom",
    name: "Vertigo Dolly Zoom",
    category: "Stylized",
    motion: "a vertigo dolly-zoom where the background warps and stretches while the subject stays locked in scale",
    thumbnailUrl: "/presets/vertigo-dolly-zoom.svg",
  },
  {
    slug: "bullet-time",
    name: "Bullet Time",
    category: "Stylized",
    motion: "a bullet-time frozen moment with the camera sweeping around a suspended slice of time",
    thumbnailUrl: "/presets/bullet-time.svg",
  },
  {
    slug: "rack-focus",
    name: "Rack Focus",
    category: "Static",
    motion: "a rack focus pulling sharp attention onto the subject with a shallow depth of field",
    thumbnailUrl: "/presets/rack-focus.svg",
  },
  {
    slug: "static-locked",
    name: "Static Locked",
    category: "Static",
    motion: "a locked-off tripod shot with stable, composed framing and subtle in-frame motion",
    thumbnailUrl: "/presets/static-locked.svg",
  },
];

export function getPreset(slug: string | null | undefined): MotionPreset | undefined {
  if (!slug) return undefined;
  return MOTION_PRESETS.find((p) => p.slug === slug);
}
