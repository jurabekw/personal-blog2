import 'server-only'
import type { AllSettings } from '@/lib/settings-defaults'
import { getAllPublished, getTaxonomies, type PostFull, type TermRef } from '@/lib/data/posts'
import { escapeHtml } from '@/lib/content/text'
import { getSettings, resolveSiteUrl } from '@/lib/data/settings'
import { SCRIPT_PREFIX, type Script } from '@/lib/script'
import { indexNewLatin } from '@/lib/translit'
import { abs, hreflangLanguages, isCustomCanonical, pageUrl } from './resolve'

/**
 * Whether a post/page belongs in the sitemap of `script` — the same rules as its page's robots tag.
 * latn keeps its original rule; the alphabet versions also drop custom-canonical posts (their
 * pages are noindex) and /yangi/ follows the admin switch.
 */
export function isPostIndexable(post: PostFull, settings: AllSettings, siteUrl: string, script: Script = 'latn'): boolean {
  if (settings.reading.discourageSearchEngines) return false
  if (script === 'yangi' && !indexNewLatin(settings.alphabets)) return false
  const choice = post.seo?.robotsIndex
  const typeNoindex = settings.seo.noindex[post.type]
  if (choice === 'noindex' || ((!choice || choice === 'default') && typeNoindex)) return false
  const canonical = post.seo?.canonical?.trim()
  if (script === 'latn') {
    if (canonical && abs(siteUrl, canonical).replace(/\/$/, '') !== `${siteUrl}${post.path}`.replace(/\/$/, '')) return false
  } else if (isCustomCanonical(canonical, `${siteUrl}${post.path}`, siteUrl)) return false
  return true
}

/** Same as isPostIndexable for archives: latn unchanged; variants drop custom-canonical terms. */
export function isTermIndexable(term: TermRef, settings: AllSettings, siteUrl = '', script: Script = 'latn'): boolean {
  if (settings.reading.discourageSearchEngines || term.count === 0) return false
  if (script === 'yangi' && !indexNewLatin(settings.alphabets)) return false
  const choice = term.seo?.robotsIndex
  if (choice === 'noindex') return false
  if ((!choice || choice === 'default') && settings.seo.noindex[term.taxonomy]) return false
  if (script !== 'latn' && isCustomCanonical(term.seo?.canonical, `${siteUrl}${term.path}`, siteUrl)) return false
  return true
}

/**
 * hreflang alternates for a sitemap entry: exactly what the page's <head> emits (resolveSeo),
 * i.e. none for /yangi/ and none when the page has a custom canonical.
 */
function entryAlternates(script: Script, siteUrl: string, path: string, canonical?: string): Record<string, string> | undefined {
  if (script === 'yangi') return undefined
  if (isCustomCanonical(canonical, `${siteUrl}${path}`, siteUrl)) return undefined
  return hreflangLanguages(siteUrl, path)
}

export interface UrlEntry {
  loc: string
  lastmod?: Date
  images?: string[]
  /** hreflang → absolute URL, written as xhtml:link elements. */
  alternates?: Record<string, string>
}

const HEADER = '<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="/main-sitemap.xsl"?>\n'

export function urlset(entries: UrlEntry[]): string {
  const body = entries
    .map((e) => {
      const imgs = (e.images ?? [])
        .slice(0, 50)
        .map((src) => `\t\t<image:image>\n\t\t\t<image:loc>${escapeHtml(src)}</image:loc>\n\t\t</image:image>`)
        .join('\n')
      const links = Object.entries(e.alternates ?? {})
        .map(([lang, href]) => `\t\t<xhtml:link rel="alternate" hreflang="${escapeHtml(lang)}" href="${escapeHtml(href)}" />`)
        .join('\n')
      return `\t<url>\n\t\t<loc>${escapeHtml(e.loc)}</loc>${e.lastmod ? `\n\t\t<lastmod>${e.lastmod.toISOString()}</lastmod>` : ''}${links ? '\n' + links : ''}${imgs ? '\n' + imgs : ''}\n\t</url>`
    })
    .join('\n')
  return `${HEADER}<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
}

function contentImages(post: PostFull, siteUrl: string): string[] {
  const list: string[] = []
  if (post.image) list.push(abs(siteUrl, post.image.url))
  for (const m of post.content.matchAll(/<img\b[^>]*?\ssrc="([^"]+)"/gi)) list.push(abs(siteUrl, m[1]))
  return [...new Set(list)]
}

/** Sitemap entries for posts or pages of one alphabet (pure; `latestPost` dates the home/blog entries). */
export function postUrlEntries(
  all: PostFull[],
  type: 'post' | 'page',
  settings: AllSettings,
  siteUrl: string,
  script: Script = 'latn',
  latestPost?: Date,
): UrlEntry[] {
  const items = all.filter((p) => isPostIndexable(p, settings, siteUrl, script))
  const withImages = settings.seo.sitemaps.includeImages
  const entries: UrlEntry[] = items.map((p) => {
    const alternates = entryAlternates(script, siteUrl, p.path, p.seo?.canonical)
    return {
      loc: pageUrl(siteUrl, script, p.path),
      lastmod: p.updatedAt,
      ...(alternates ? { alternates } : {}),
      images: withImages ? contentImages(p, siteUrl) : [],
    }
  })
  if (type === 'page' && !settings.reading.discourageSearchEngines && !(script === 'yangi' && !indexNewLatin(settings.alphabets))) {
    const newest = items[0]?.updatedAt
    for (const path of ['/blog/', '/']) {
      const alternates = entryAlternates(script, siteUrl, path)
      entries.unshift({ loc: pageUrl(siteUrl, script, path), lastmod: latestPost ?? newest, ...(alternates ? { alternates } : {}) })
    }
  }
  return entries
}

export async function postSitemapEntries(type: 'post' | 'page', settings: AllSettings, siteUrl: string, script: Script = 'latn'): Promise<UrlEntry[]> {
  const all = await getAllPublished(type)
  const latestPost = type === 'page' ? (await getAllPublished('post', 1))[0]?.updatedAt : undefined
  return postUrlEntries(all, type, settings, siteUrl, script, latestPost)
}

/** Sitemap entries for categories or tags of one alphabet (pure). `posts` dates each term. */
export function termUrlEntries(
  terms: TermRef[],
  posts: PostFull[],
  taxonomy: 'category' | 'tag',
  settings: AllSettings,
  siteUrl: string,
  script: Script = 'latn',
): UrlEntry[] {
  return terms
    .filter((t) => isTermIndexable(t, settings, siteUrl, script))
    .map((term) => {
      const newest = posts.find((p) =>
        taxonomy === 'tag' ? p.tags.some((t) => t.id === term.id) : p.categories.some((c) => c.id === term.id),
      )
      const alternates = entryAlternates(script, siteUrl, term.path, term.seo?.canonical)
      return { loc: pageUrl(siteUrl, script, term.path), lastmod: newest?.updatedAt, ...(alternates ? { alternates } : {}) }
    })
}

export async function termSitemapEntries(taxonomy: 'category' | 'tag', settings: AllSettings, siteUrl: string, script: Script = 'latn'): Promise<UrlEntry[]> {
  const tax = await getTaxonomies()
  const list = taxonomy === 'tag' ? tax.tags : tax.categories
  return termUrlEntries(list, await getAllPublished('post'), taxonomy, settings, siteUrl, script)
}

/* ------------------------------------------------------------------ */
/* Sitemap files and the index                                          */
/* ------------------------------------------------------------------ */

export type SitemapKind = 'post' | 'page' | 'category' | 'post_tag'
const KINDS: SitemapKind[] = ['post', 'page', 'category', 'post_tag']

/** File name of a sitemap: post-sitemap.xml, kirill-post-sitemap.xml, yangi-post-sitemap.xml … */
export function sitemapFile(kind: SitemapKind, script: Script): string {
  const prefix = SCRIPT_PREFIX[script] ? `${SCRIPT_PREFIX[script].slice(1)}-` : ''
  return `${prefix}${kind}-sitemap.xml`
}

/** Whether the sitemap file is served at all (route 404 otherwise). */
export function sitemapServed(kind: SitemapKind, script: Script, settings: AllSettings): boolean {
  if (!settings.seo.sitemaps.enabled) return false
  if (kind === 'post_tag' && !settings.seo.sitemaps.includeTags) return false
  if (script === 'yangi' && !indexNewLatin(settings.alphabets)) return false
  return true
}

/** Candidate sitemap files in index order: latn, then kirill, then yangi (only while it is indexed). */
export function sitemapFiles(settings: AllSettings): { kind: SitemapKind; script: Script; name: string }[] {
  const out: { kind: SitemapKind; script: Script; name: string }[] = []
  for (const script of ['latn', 'cyrl', 'yangi'] as const) {
    for (const kind of KINDS) if (sitemapServed(kind, script, settings)) out.push({ kind, script, name: sitemapFile(kind, script) })
  }
  return out
}

function entriesFor(kind: SitemapKind, script: Script, settings: AllSettings, siteUrl: string): Promise<UrlEntry[]> {
  if (kind === 'post' || kind === 'page') return postSitemapEntries(kind, settings, siteUrl, script)
  return termSitemapEntries(kind === 'post_tag' ? 'tag' : 'category', settings, siteUrl, script)
}

/** Yoast-style index XML; sitemaps without entries are left out. */
export function sitemapIndexXml(parts: { name: string; entries: { lastmod?: Date }[] }[], siteUrl: string): string {
  const body = parts
    .filter((p) => p.entries.length)
    .map((p) => {
      const last = p.entries.map((e) => e.lastmod?.getTime() ?? 0).reduce((a, b) => Math.max(a, b), 0)
      return `\t<sitemap>\n\t\t<loc>${escapeHtml(`${siteUrl}/${p.name}`)}</loc>${last ? `\n\t\t<lastmod>${new Date(last).toISOString()}</lastmod>` : ''}\n\t</sitemap>`
    })
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="/main-sitemap.xsl"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`
}

const notFound = () => new Response('Not found', { status: 404 })

/** GET handler body for /sitemap_index.xml. */
export async function sitemapIndexResponse(): Promise<Response> {
  const settings = await getSettings()
  if (!settings.seo.sitemaps.enabled) return notFound()
  const siteUrl = resolveSiteUrl(settings)
  const parts = await Promise.all(
    sitemapFiles(settings).map(async (f) => ({ name: f.name, entries: await entriesFor(f.kind, f.script, settings, siteUrl) })),
  )
  return xmlResponse(sitemapIndexXml(parts, siteUrl))
}

/** GET handler body for one sitemap file (404 when the file is switched off). */
export async function sitemapResponse(kind: SitemapKind, script: Script): Promise<Response> {
  const settings = await getSettings()
  if (!sitemapServed(kind, script, settings)) return notFound()
  const siteUrl = resolveSiteUrl(settings)
  return xmlResponse(urlset(await entriesFor(kind, script, settings, siteUrl)))
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
