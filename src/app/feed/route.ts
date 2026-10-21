import { getSettings, resolveSiteUrl } from '@/lib/data/settings'
import { getAllPublished } from '@/lib/data/posts'
import { renderContent } from '@/lib/content/render'
import { escapeHtml } from '@/lib/content/text'
import { replaceVars } from '@/lib/seo/templates'
import { abs } from '@/lib/seo/resolve'

export const dynamic = 'force-static'
export const revalidate = 3600

const cdata = (s: string) => `<![CDATA[${s.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`

/** RSS 2.0 feed at the WordPress URL /feed/ (with the Yoast RSS before/after text). */
export async function GET() {
  const settings = await getSettings()
  const siteUrl = resolveSiteUrl(settings)
  const { general, reading, seo } = settings
  const posts = (await getAllPublished('post', Math.max(1, reading.feedItems))).filter(
    (p) => p.seo.robotsIndex !== 'noindex',
  )

  const items = posts
    .map((p) => {
      const url = `${siteUrl}${p.path}`
      const vars = {
        POSTLINK: `<a href="${url}">${escapeHtml(p.title)}</a>`,
        BLOGLINK: `<a href="${siteUrl}/">${escapeHtml(general.siteName)}</a>`,
        BLOGDESCLINK: `<a href="${siteUrl}/">${escapeHtml(general.siteName)} - ${escapeHtml(general.tagline)}</a>`,
        AUTHORLINK: escapeHtml(settings.appearance.author.name),
      }
      const fill = (tpl: string) =>
        tpl ? `<p>${replaceVars(tpl.replace(/%%(POSTLINK|BLOGLINK|BLOGDESCLINK|AUTHORLINK)%%/g, (_m, k: keyof typeof vars) => vars[k]), { sitename: general.siteName, sep: seo.separator, title: p.title })}</p>` : ''
      const body = reading.feedSummaryOnly ? `<p>${escapeHtml(p.excerpt)}</p>` : renderContent(p.content).html
      const html = fill(seo.rss.before) + body + fill(seo.rss.after)
      const image = p.image ? abs(siteUrl, p.image.url) : ''
      return [
        '\t\t<item>',
        `\t\t\t<title>${escapeHtml(p.title)}</title>`,
        `\t\t\t<link>${url}</link>`,
        `\t\t\t<dc:creator>${cdata(settings.appearance.author.name)}</dc:creator>`,
        `\t\t\t<pubDate>${p.publishedAt.toUTCString()}</pubDate>`,
        ...p.categories.map((c) => `\t\t\t<category>${cdata(c.name)}</category>`),
        ...p.tags.map((c) => `\t\t\t<category>${cdata(c.name)}</category>`),
        `\t\t\t<guid isPermaLink="true">${url}</guid>`,
        `\t\t\t<description>${cdata(p.excerpt)}</description>`,
        `\t\t\t<content:encoded>${cdata(html)}</content:encoded>`,
        image ? `\t\t\t<media:content url="${escapeHtml(image)}" medium="image" />` : '',
        '\t\t</item>',
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
\t<channel>
\t\t<title>${escapeHtml(general.siteName)}</title>
\t\t<atom:link href="${siteUrl}/feed/" rel="self" type="application/rss+xml" />
\t\t<link>${siteUrl}/</link>
\t\t<description>${escapeHtml(general.tagline)}</description>
\t\t<lastBuildDate>${(posts[0]?.updatedAt ?? new Date()).toUTCString()}</lastBuildDate>
\t\t<language>${escapeHtml(general.language)}</language>
\t\t<generator>Next.js</generator>
${items}
\t</channel>
</rss>
`
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=UTF-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
