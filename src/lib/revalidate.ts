import 'server-only'
import { revalidatePath } from 'next/cache'

const SITEMAP_KINDS = ['post', 'page', 'category', 'post_tag']

/**
 * Refresh every static page after content or settings change.
 * Pages are pre-rendered HTML; this makes the next visit regenerate them,
 * so edits appear immediately while visitors still get static speed.
 * revalidatePath('/', 'layout') invalidates every cached path, including the /kirill/ and /yangi/
 * trees (their root layouts live in the (cyrl)/(yangi) route groups, so a '/kirill' layout path
 * would not even match them). The route handlers below (sitemaps, feeds) are listed explicitly.
 */
export function revalidateSite(): void {
  revalidatePath('/', 'layout')
  for (const p of [
    '/sitemap_index.xml',
    ...['', 'kirill-', 'yangi-'].flatMap((prefix) => SITEMAP_KINDS.map((kind) => `/${prefix}${kind}-sitemap.xml`)),
    '/feed',
    '/kirill/feed',
    '/yangi/feed',
    '/llms.txt',
    '/robots.txt',
  ]) {
    try {
      revalidatePath(p)
    } catch {
      /* route may not exist */
    }
  }
}
