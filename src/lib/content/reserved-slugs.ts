/**
 * Top-level paths the app itself uses. A post or page with one of these slugs would be
 * shadowed by the route (e.g. /kirill/ is the Cyrillic tree, /yangi/ the new-Latin tree).
 * Categories and tags live under /category/ and /tag/, so they are not affected.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  'blog',
  'category',
  'tag',
  'search',
  'feed',
  'admin',
  'api',
  'og',
  'draft-preview',
  'page',
  'kirill',
  'yangi',
])

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug)
}

/** Slugs to try in order: `base` (unless reserved), then `base-2`, `base-3`, … */
export function* slugCandidates(base: string): Generator<string, never, unknown> {
  if (!isReservedSlug(base)) yield base
  for (let n = 2; ; n++) yield `${base}-${n}`
}
