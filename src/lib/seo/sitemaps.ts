import 'server-only'
import type { AllSettings } from '@/lib/settings-defaults'
import { getAllPublished, getTaxonomies, type PostFull, type TermRef } from '@/lib/data/posts'
import { escapeHtml } from '@/lib/content/text'
import { abs } from './resolve'

export function isPostIndexable(post: PostFull, settings: AllSettings, siteUrl: string): boolean {
  if (settings.reading.discourageSearchEngines) return false
  const choice = post.seo?.robotsIndex
  const typeNoindex = settings.seo.noindex[post.type]
  if (choice === 'noindex' || ((!choice || choice === 'default') && typeNoindex)) return false
  const canonical = post.seo?.canonical?.trim()
  if (canonical && abs(siteUrl, canonical).replace(/\/$/, '') !== `${siteUrl}${post.path}`.replace(/\/$/, '')) return false
  return true
}

export function isTermIndexable(term: TermRef, settings: AllSettings): boolean {
  if (settings.reading.discourageSearchEngines || term.count === 0) return false
  const choice = term.seo?.robotsIndex
  if (choice === 'noindex') return false
  if ((!choice || choice === 'default') && settings.seo.noindex[term.taxonomy]) return false
  return true
}

interface UrlEntry {
  loc: string
  lastmod?: Date
  images?: string[]
}

const HEADER = '<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="/main-sitemap.xsl"?>\n'

export function urlset(entries: UrlEntry[]): string {
  const body = entries
    .map((e) => {
      const imgs = (e.images ?? [])
        .slice(0, 50)
        .map((src) => `\t\t<image:image>\n\t\t\t<image:loc>${escapeHtml(src)}</image:loc>\n\t\t</image:image>`)
        .join('\n')
      return `\t<url>\n\t\t<loc>${escapeHtml(e.loc)}</loc>${e.lastmod ? `\n\t\t<lastmod>${e.lastmod.toISOString()}</lastmod>` : ''}${imgs ? '\n' + imgs : ''}\n\t</url>`
    })
    .join('\n')
  return `${HEADER}<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
}

function contentImages(post: PostFull, siteUrl: string): string[] {
  const list: string[] = []
  if (post.image) list.push(abs(siteUrl, post.image.url))
  for (const m of post.content.matchAll(/<img\b[^>]*?\ssrc="([^"]+)"/gi)) list.push(abs(siteUrl, m[1]))
  return [...new Set(list)]
}

export async function postSitemapEntries(type: 'post' | 'page', settings: AllSettings, siteUrl: string): Promise<UrlEntry[]> {
  const items = (await getAllPublished(type)).filter((p) => isPostIndexable(p, settings, siteUrl))
  const withImages = settings.seo.sitemaps.includeImages
  const entries: UrlEntry[] = items.map((p) => ({
    loc: `${siteUrl}${p.path}`,
    lastmod: p.updatedAt,
    images: withImages ? contentImages(p, siteUrl) : [],
  }))
  if (type === 'page' && !settings.reading.discourageSearchEngines) {
    const newest = items[0]?.updatedAt
    const latestPost = (await getAllPublished('post', 1))[0]?.updatedAt
    entries.unshift({ loc: `${siteUrl}/blog/`, lastmod: latestPost ?? newest })
    entries.unshift({ loc: `${siteUrl}/`, lastmod: latestPost ?? newest })
  }
  return entries
}

export async function termSitemapEntries(taxonomy: 'category' | 'tag', settings: AllSettings, siteUrl: string): Promise<UrlEntry[]> {
  const tax = await getTaxonomies()
  const list = (taxonomy === 'tag' ? tax.tags : tax.categories).filter((t) => isTermIndexable(t, settings))
  const posts = await getAllPublished('post')
  return list.map((term) => {
    const newest = posts.find((p) =>
      taxonomy === 'tag' ? p.tags.some((t) => t.id === term.id) : p.categories.some((c) => c.id === term.id),
    )
    return { loc: `${siteUrl}${term.path}`, lastmod: newest?.updatedAt }
  })
}

export function xmlResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=UTF-8',
      'X-Robots-Tag': 'noindex, follow',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
