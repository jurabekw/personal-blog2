import { sitemapResponse } from '@/lib/seo/sitemaps'

export const dynamic = 'force-static'
export const revalidate = 3600

export function GET() {
  return sitemapResponse('page', 'cyrl')
}
