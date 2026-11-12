import { sitemapResponse } from '@/lib/seo/sitemaps'

export const dynamic = 'force-static'
export const revalidate = 3600

/** 404 while New Latin is not indexed (Settings → Alifbolar). */
export function GET() {
  return sitemapResponse('page', 'yangi')
}
