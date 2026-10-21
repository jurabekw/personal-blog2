import { getSettings, resolveSiteUrl } from '@/lib/data/settings'
import { postSitemapEntries, urlset, xmlResponse } from '@/lib/seo/sitemaps'

export const dynamic = 'force-static'
export const revalidate = 3600

export async function GET() {
  const settings = await getSettings()
  if (!settings.seo.sitemaps.enabled) return new Response('Not found', { status: 404 })
  const siteUrl = resolveSiteUrl(settings)
  return xmlResponse(urlset(await postSitemapEntries('page', settings, siteUrl)))
}
