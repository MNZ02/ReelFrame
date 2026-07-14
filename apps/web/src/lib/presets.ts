/**
 * Static preset thumbnails live in apps/web/public/presets/{slug}.svg
 * (generated locally, no external image fetching). We compute the path from
 * the slug ourselves rather than trusting @repo/shared's `thumbnailUrl`
 * field, which points at a `.jpg` we never generated.
 */
export function presetThumbnailSrc(slug: string): string {
  return `/presets/${slug}.svg`;
}
