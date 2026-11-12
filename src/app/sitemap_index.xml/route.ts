import { sitemapIndexResponse } from '@/lib/seo/sitemaps'

export const dynamic = 'force-static'
export const revalidate = 3600

/** Yoast-compatible sitemap index (same URL as on WordPress, already known to Google) + alphabet sitemaps. */
export function GET() {
  return sitemapIndexResponse()
}
