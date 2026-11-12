import 'server-only'
import { revalidatePath } from 'next/cache'

const SITEMAP_KINDS = ['post', 'page', 'category', 'post_tag']

/**
 * Refresh every static page after content or settings change.
 * Pages are pre-rendered HTML; this makes the next visit regenerate them,
 * so edits appear immediately while visitors still get static speed.
 * The /kirill/ and /yangi/ trees have their own root layouts, so they are refreshed explicitly,
 * together with their sitemaps and feeds.
 */
export function revalidateSite(): void {
  revalidatePath('/', 'layout')
  for (const root of ['/kirill', '/yangi']) {
    try {
      revalidatePath(root, 'layout')
    } catch {
      /* route may not exist */
    }
  }
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
