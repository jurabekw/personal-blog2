import { getSettings, resolveSiteUrl } from '@/lib/data/settings'
import { termSitemapEntries, urlset, xmlResponse } from '@/lib/seo/sitemaps'

export const dynamic = 'force-static'
export const revalidate = 3600

export async function GET() {
  const settings = await getSettings()
  if (!settings.seo.sitemaps.enabled || !settings.seo.sitemaps.includeTags) return new Response('Not found', { status: 404 })
  const siteUrl = resolveSiteUrl(settings)
  return xmlResponse(urlset(await termSitemapEntries('tag', settings, siteUrl)))
}
