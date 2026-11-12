import { feedResponse } from '@/lib/seo/feed'

export const dynamic = 'force-static'
export const revalidate = 3600

/** Cyrillic RSS feed (route handlers take no layout, so living in the route group is fine). */
export function GET() {
  return feedResponse('cyrl')
}
