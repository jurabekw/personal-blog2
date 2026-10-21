import { getSettings, resolveSiteUrl } from '@/lib/data/settings'
import { postSitemapEntries, termSitemapEntries, xmlResponse } from '@/lib/seo/sitemaps'
import { escapeHtml } from '@/lib/content/text'

export const dynamic = 'force-static'
export const revalidate = 3600

/** Yoast-compatible sitemap index (same URL as on WordPress, already known to Google). */
export async function GET() {
  const settings = await getSettings()
  if (!settings.seo.sitemaps.enabled) return new Response('Not found', { status: 404 })
  const siteUrl = resolveSiteUrl(settings)
  const parts: { name: string; entries: { lastmod?: Date }[] }[] = [
    { name: 'post-sitemap.xml', entries: await postSitemapEntries('post', settings, siteUrl) },
    { name: 'page-sitemap.xml', entries: await postSitemapEntries('page', settings, siteUrl) },
    { name: 'category-sitemap.xml', entries: await termSitemapEntries('category', settings, siteUrl) },
  ]
  if (settings.seo.sitemaps.includeTags) {
    parts.push({ name: 'post_tag-sitemap.xml', entries: await termSitemapEntries('tag', settings, siteUrl) })
  }
  const body = parts
    .filter((p) => p.entries.length)
    .map((p) => {
      const last = p.entries.map((e) => e.lastmod?.getTime() ?? 0).reduce((a, b) => Math.max(a, b), 0)
      return `\t<sitemap>\n\t\t<loc>${escapeHtml(`${siteUrl}/${p.name}`)}</loc>${last ? `\n\t\t<lastmod>${new Date(last).toISOString()}</lastmod>` : ''}\n\t</sitemap>`
    })
    .join('\n')
  return xmlResponse(
    `<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="/main-sitemap.xsl"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`,
  )
}
