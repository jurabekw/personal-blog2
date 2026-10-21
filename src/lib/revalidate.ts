import 'server-only'
import { revalidatePath } from 'next/cache'

/**
 * Refresh every static page after content or settings change.
 * Pages are pre-rendered HTML; this makes the next visit regenerate them,
 * so edits appear immediately while visitors still get static speed.
 */
export function revalidateSite(): void {
  revalidatePath('/', 'layout')
  for (const p of [
    '/sitemap_index.xml',
    '/post-sitemap.xml',
    '/page-sitemap.xml',
    '/category-sitemap.xml',
    '/post_tag-sitemap.xml',
    '/feed',
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
