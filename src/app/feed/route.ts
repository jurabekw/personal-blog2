import { feedResponse } from '@/lib/seo/feed'

export const dynamic = 'force-static'
export const revalidate = 3600

/** RSS 2.0 feed at the WordPress URL /feed/ (with the Yoast RSS before/after text). */
export function GET() {
  return feedResponse('latn')
}
