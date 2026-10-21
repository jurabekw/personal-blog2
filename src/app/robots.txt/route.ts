import { getSettings, resolveSiteUrl } from '@/lib/data/settings'
import { defaultRobotsTxt } from '@/lib/seo/robots'

export const dynamic = 'force-static'
export const revalidate = 3600

export async function GET() {
  const settings = await getSettings()
  const siteUrl = resolveSiteUrl(settings)
  let body: string
  if (settings.reading.discourageSearchEngines) {
    body = 'User-agent: *\nDisallow: /\n'
  } else if (settings.seo.robotsTxt.trim()) {
    body = settings.seo.robotsTxt.replace(/\{\{siteUrl\}\}/g, siteUrl).trim() + '\n'
    if (!/^sitemap:/im.test(body) && settings.seo.sitemaps.enabled) body += `\nSitemap: ${siteUrl}/sitemap_index.xml\n`
  } else {
    body = defaultRobotsTxt(siteUrl)
  }
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=UTF-8', 'Cache-Control': 'public, max-age=0, s-maxage=3600' },
  })
}
