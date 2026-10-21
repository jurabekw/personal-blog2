import 'server-only'
import { and, eq, or } from 'drizzle-orm'
import { getDb, schema } from '@/lib/db'
import { getSettings, resolveSiteUrl } from '@/lib/data/settings'
import { convertCopyBoxShortcodes, normalizeRenderedCopyBoxes } from '@/lib/content/render'
import { sanitizeContent, sanitizePlain } from '@/lib/content/sanitize'
import { decodeEntities, escapeHtml, slugify, stripTags, wordCountFromHtml } from '@/lib/content/text'
import { buildPathname, readDimensions, storeFile, ALLOWED_TYPES } from '@/lib/storage'
import type { PageTemplate, PostSeo, SchemaArticleType, SchemaPageType } from '@/lib/types'

const { posts, terms, postTerms, media } = schema

/* ------------------------------------------------------------------ */
/* Normalized format shared by the REST and WXR importers              */
/* ------------------------------------------------------------------ */

export interface NormalizedTerm {
  taxonomy: 'category' | 'tag'
  name: string
  slug: string
  description?: string
  parentSlug?: string
  wpId?: number
}

export interface NormalizedYoast {
  title?: string
  metadesc?: string
  focuskw?: string
  noindex?: boolean
  nofollow?: boolean
  canonical?: string
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
  twitterTitle?: string
  twitterDescription?: string
  twitterImage?: string
  cornerstone?: boolean
  primaryCategorySlug?: string
  breadcrumbTitle?: string
  schemaPageType?: string
  schemaArticleType?: string
}

export interface NormalizedItem {
  wpId: number
  type: 'post' | 'page'
  status: string
  title: string
  slug: string
  /** HTML (rendered REST content or raw WXR content). */
  content: string
  raw: boolean
  excerpt: string
  date: string
  modified: string
  sticky: boolean
  menuOrder: number
  template: string
  categories: { slug: string; name: string }[]
  tags: { slug: string; name: string }[]
  featuredImage?: { url: string; alt?: string; title?: string }
  yoast: NormalizedYoast
  link?: string
}

export interface ImportOptions {
  /** Host names of the old site (links to them become relative). */
  sourceHosts: string[]
  downloadImages: boolean
  overwrite: boolean
  importSeo: boolean
}

export interface ImportItemResult {
  ok: boolean
  action: 'created' | 'updated' | 'skipped' | 'failed'
  title: string
  slug?: string
  images: number
  warnings: string[]
}

/* ------------------------------------------------------------------ */
/* HTTP                                                                */
/* ------------------------------------------------------------------ */

export function assertPublicUrl(raw: string): URL {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error('Enter a valid URL, e.g. https://www.jurabek.blog')
  }
  if (!/^https?:$/.test(url.protocol)) throw new Error('Only http(s) URLs are supported.')
  const host = url.hostname
  const privateHost =
    host === 'localhost' ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host) ||
    host.endsWith('.internal') ||
    host === '[::1]'
  if (privateHost && process.env.NODE_ENV === 'production') throw new Error('Private network addresses are not allowed.')
  return url
}

export function authHeader(username?: string, appPassword?: string): Record<string, string> {
  if (!username || !appPassword) return {}
  return { Authorization: `Basic ${Buffer.from(`${username}:${appPassword.replace(/\s+/g, '')}`).toString('base64')}` }
}

export async function wpFetch(url: string, headers: Record<string, string> = {}, timeoutMs = 25000): Promise<Response> {
  assertPublicUrl(url)
  return fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'JurabekBlog-Importer/1.0 (+Next.js)', ...headers },
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'follow',
    cache: 'no-store',
  })
}

export async function wpJson<T>(url: string, headers: Record<string, string> = {}): Promise<{ data: T; total: number; totalPages: number }> {
  const res = await wpFetch(url, headers)
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`
    try {
      const j = (await res.json()) as { message?: string }
      if (j.message) msg += ` — ${j.message}`
    } catch {
      /* not JSON */
    }
    throw new Error(`Request failed (${url}): ${msg}`)
  }
  const data = (await res.json()) as T
  return { data, total: Number(res.headers.get('x-wp-total') || 0), totalPages: Number(res.headers.get('x-wp-totalpages') || 1) }
}

/* ------------------------------------------------------------------ */
/* Media                                                               */
/* ------------------------------------------------------------------ */

function originalUploadUrl(url: string): string {
  return url.replace(/-\d+x\d+(\.[a-z0-9]+)(\?.*)?$/i, '$1').replace(/-scaled(\.[a-z0-9]+)$/i, '$1')
}

/** Download a WordPress upload once and register it in the media library (deduplicated by original URL). */
export async function importImage(url: string, meta: { alt?: string; title?: string } = {}): Promise<{ url: string; id: number } | null> {
  const db = getDb()
  const clean = decodeEntities(url).split('#')[0]
  const original = originalUploadUrl(clean)
  const path = (u: string) => {
    try {
      return new URL(u).pathname
    } catch {
      return u
    }
  }
  const existing = await db
    .select({ id: media.id, url: media.url, alt: media.alt })
    .from(media)
    .where(or(eq(media.legacyUrl, original), eq(media.legacyUrl, clean)))
    .limit(1)
  if (existing.length) {
    if (meta.alt && !existing[0].alt) await db.update(media).set({ alt: sanitizePlain(meta.alt) }).where(eq(media.id, existing[0].id))
    return existing[0]
  }

  let res: Response | null = null
  for (const candidate of original !== clean ? [original, clean] : [clean]) {
    try {
      const r = await wpFetch(candidate, { Accept: 'image/*,*/*' }, 30000)
      if (r.ok) {
        res = r
        break
      }
    } catch {
      /* try next */
    }
  }
  if (!res) return null
  const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
  const mime = ALLOWED_TYPES[type] ? type : guessMime(clean)
  if (!mime || !ALLOWED_TYPES[mime]) return null
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length > 25 * 1024 * 1024) return null
  const filename = decodeURIComponent(path(original).split('/').pop() || 'image')
  const stored = await storeFile(buildPathname(filename, mime), buf, mime)
  const dims = readDimensions(buf, mime)
  const [row] = await db
    .insert(media)
    .values({
      url: stored.url,
      pathname: stored.pathname,
      filename,
      mimeType: mime,
      size: buf.length,
      width: dims.width,
      height: dims.height,
      alt: sanitizePlain(meta.alt || ''),
      title: sanitizePlain(meta.title || filename.replace(/\.[^.]+$/, '')),
      legacyUrl: original,
    })
    .returning({ id: media.id, url: media.url })
  return row
}

function guessMime(url: string): string {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
  return (
    { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif', svg: 'image/svg+xml', pdf: 'application/pdf' } as Record<string, string>
  )[ext || ''] || ''
}

/* ------------------------------------------------------------------ */
/* Content clean-up                                                    */
/* ------------------------------------------------------------------ */

/** Minimal wpautop() for classic-editor content stored without <p> tags. */
export function wpautop(text: string): string {
  if (/<p[\s>]/i.test(text) || /<!-- wp:/.test(text)) return text
  const blocks = text.replace(/\r\n/g, '\n').split(/\n\s*\n/)
  return blocks
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => (/^<(h[1-6]|ul|ol|table|blockquote|figure|div|pre|hr|aside|iframe)/i.test(b) ? b : `<p>${b.replace(/\n/g, '<br>\n')}</p>`))
    .join('\n')
}

/** Rewrite content for the new site: re-host images, relative internal links, unwrap page-builder wrappers. */
export async function cleanContent(html: string, opts: ImportOptions, raw: boolean): Promise<{ html: string; images: number; warnings: string[] }> {
  const warnings: string[] = []
  let out = html || ''
  if (raw) out = wpautop(out.replace(/<!--\s*\/?wp:[\s\S]*?-->/g, ''))
  out = normalizeRenderedCopyBoxes(out)
  out = convertCopyBoxShortcodes(out)
  // Page-builder wrappers (Elementor etc.): keep the content, drop the wrappers.
  out = out.replace(/<\/?(section|span|font|center)\b[^>]*>/gi, '')
  out = out.replace(/<div\b(?![^>]*data-youtube-video)[^>]*>/gi, '').replace(/<\/div>/gi, '')
  // Lazy-load attributes from plugins: use the real source.
  out = out.replace(/<img\b([^>]*?)\sdata-(?:lazy-)?src="([^"]+)"([^>]*)>/gi, (_m, a, src, b) => `<img${a.replace(/\ssrc="[^"]*"/i, '')} src="${src}"${b.replace(/\ssrc="[^"]*"/i, '')}>`)

  let images = 0
  if (opts.downloadImages) {
    const urls = new Set<string>()
    for (const m of out.matchAll(/<img\b[^>]*?\ssrc="([^"]+)"/gi)) urls.add(m[1])
    for (const m of out.matchAll(/<a\b[^>]*?\shref="([^"]+\.(?:jpe?g|png|gif|webp|avif))"/gi)) urls.add(m[1])
    for (const src of urls) {
      if (!/\/wp-content\/uploads\//.test(src)) continue
      const alt = out.match(new RegExp(`<img[^>]*src="${src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*alt="([^"]*)"`, 'i'))?.[1]
      try {
        const m = await importImage(src, { alt: alt ? decodeEntities(alt) : '' })
        if (m) {
          out = out.split(src).join(m.url)
          images++
        } else warnings.push(`Image not downloaded: ${src}`)
      } catch (e) {
        warnings.push(`Image failed (${src}): ${e instanceof Error ? e.message : 'error'}`)
      }
    }
  }

  // Absolute links to the old site → relative paths (works on any domain / preview).
  for (const host of opts.sourceHosts) {
    const h = host.replace(/^www\./, '').replace(/\./g, '\\.')
    out = out.replace(new RegExp(`(href=")https?://(?:www\\.)?${h}(/[^"]*)?"`, 'gi'), (_m, pre: string, path?: string) => `${pre}${path || '/'}"`)
  }
  return { html: sanitizeContent(out).replace(/\n{3,}/g, '\n\n'), images, warnings }
}

/* ------------------------------------------------------------------ */
/* Terms                                                               */
/* ------------------------------------------------------------------ */

export async function upsertTerms(list: NormalizedTerm[]): Promise<{ created: number; updated: number }> {
  const db = getDb()
  let created = 0
  let updated = 0
  // Parents first.
  const ordered = [...list].sort((a, b) => Number(Boolean(a.parentSlug)) - Number(Boolean(b.parentSlug)))
  for (let pass = 0; pass < 2; pass++) {
    for (const t of ordered) {
      const slug = slugify(t.slug || t.name) || slugify(t.name)
      if (!slug || (t.taxonomy === 'category' && slug === 'uncategorized')) continue
      const [existing] = await db
        .select()
        .from(terms)
        .where(and(eq(terms.taxonomy, t.taxonomy), eq(terms.slug, slug)))
        .limit(1)
      let parentId: number | null = null
      if (t.parentSlug) {
        const [p] = await db.select({ id: terms.id }).from(terms).where(and(eq(terms.taxonomy, 'category'), eq(terms.slug, slugify(t.parentSlug)))).limit(1)
        parentId = p?.id ?? null
      }
      if (existing) {
        if (pass === 1) {
          await db
            .update(terms)
            .set({ name: sanitizePlain(t.name), description: sanitizePlain(t.description || existing.description), parentId: parentId ?? existing.parentId, wpId: t.wpId ?? existing.wpId })
            .where(eq(terms.id, existing.id))
          updated++
        }
      } else if (pass === 0) {
        await db.insert(terms).values({ taxonomy: t.taxonomy, name: sanitizePlain(t.name), slug, description: sanitizePlain(t.description || ''), parentId, wpId: t.wpId ?? null })
        created++
      }
    }
  }
  return { created, updated: Math.max(0, updated - created) }
}

/** "Title - Jurabek" → "Title %%sep%% %%sitename%%" so later separator/name changes apply. */
export function templatizeTitle(title: string, siteName: string): string {
  const t = title.trim()
  for (const sep of ['-', '–', '—', '|', '·', '•', ':', '~', '»', '«', '>', '<', '*', '⋆']) {
    const suffix = ` ${sep} ${siteName}`
    if (siteName && t.endsWith(suffix)) return `${t.slice(0, -suffix.length)} %%sep%% %%sitename%%`
  }
  return t
}

/* ------------------------------------------------------------------ */
/* Items                                                               */
/* ------------------------------------------------------------------ */

function mapTemplate(t: string): PageTemplate {
  if (/about/i.test(t)) return 'about'
  if (/full-width|elementor_canvas|elementor_header_footer/i.test(t)) return 'full-width'
  return 'default'
}

function mapStatus(s: string): 'publish' | 'draft' | 'pending' {
  if (s === 'publish' || s === 'future') return 'publish'
  if (s === 'pending') return 'pending'
  return 'draft'
}

export async function importItem(item: NormalizedItem, opts: ImportOptions): Promise<ImportItemResult> {
  const db = getDb()
  const warnings: string[] = []
  const title = sanitizePlain(decodeEntities(item.title)) || '(no title)'
  try {
    const slug = slugify(decodeURIComponent(item.slug || '')) || slugify(title)
    const [existing] = await db
      .select({ id: posts.id, slug: posts.slug })
      .from(posts)
      .where(or(and(eq(posts.wpId, item.wpId), eq(posts.type, item.type)), eq(posts.slug, slug)))
      .limit(1)
    if (existing && !opts.overwrite) return { ok: true, action: 'skipped', title, slug: existing.slug, images: 0, warnings: ['Already exists (overwrite is off).'] }

    const hosts = new Set(opts.sourceHosts)
    try {
      if (item.link) hosts.add(new URL(item.link).hostname)
    } catch {
      /* no link */
    }
    const cleaned = await cleanContent(item.content, { ...opts, sourceHosts: [...hosts] }, item.raw)
    warnings.push(...cleaned.warnings)
    let images = cleaned.images

    let featuredImageId: number | null = null
    if (item.featuredImage?.url && opts.downloadImages) {
      const m = await importImage(item.featuredImage.url, { alt: item.featuredImage.alt, title: item.featuredImage.title })
      if (m) {
        featuredImageId = m.id
        images++
      } else warnings.push(`Featured image not downloaded: ${item.featuredImage.url}`)
    }

    // Yoast → SEO fields.
    const settings = await getSettings()
    const seo: PostSeo = {}
    const y = item.yoast
    if (opts.importSeo) {
      const defaultTitle = `${title} ${settings.seo.separator} ${settings.general.siteName}`
      if (y.title && decodeEntities(y.title).trim() !== defaultTitle && !/%%title%%\s*%%page%%\s*%%sep%%\s*%%sitename%%/.test(y.title)) {
        seo.title = templatizeTitle(sanitizePlain(decodeEntities(y.title)), settings.general.siteName)
      }
      if (y.metadesc) seo.metaDescription = sanitizePlain(decodeEntities(y.metadesc))
      if (y.focuskw) seo.focusKeyphrase = sanitizePlain(y.focuskw)
      if (y.noindex) seo.robotsIndex = 'noindex'
      if (y.nofollow) seo.nofollow = true
      if (y.cornerstone) seo.cornerstone = true
      if (y.breadcrumbTitle) seo.breadcrumbTitle = sanitizePlain(y.breadcrumbTitle)
      if (y.canonical) {
        const own = item.link?.replace(/\/$/, '')
        const c = y.canonical.replace(/\/$/, '')
        const ownPath = own ? new URL(own).pathname : ''
        let cPath = ''
        try {
          cPath = new URL(c).pathname
        } catch {
          /* relative */
        }
        if (c && c !== own && cPath !== ownPath) seo.canonical = y.canonical
      }
      if (y.ogTitle && decodeEntities(y.ogTitle) !== decodeEntities(y.title || '')) seo.ogTitle = sanitizePlain(decodeEntities(y.ogTitle))
      if (y.ogDescription && decodeEntities(y.ogDescription) !== decodeEntities(y.metadesc || '')) seo.ogDescription = sanitizePlain(decodeEntities(y.ogDescription))
      if (y.twitterTitle) seo.twitterTitle = sanitizePlain(decodeEntities(y.twitterTitle))
      if (y.twitterDescription) seo.twitterDescription = sanitizePlain(decodeEntities(y.twitterDescription))
      for (const [key, value] of [['ogImage', y.ogImage], ['twitterImage', y.twitterImage]] as const) {
        if (!value || (item.featuredImage && originalUploadUrl(value) === originalUploadUrl(item.featuredImage.url))) continue
        if (/\/wp-content\/uploads\//.test(value) && opts.downloadImages) {
          const m = await importImage(value)
          if (m) seo[key] = m.url
        } else seo[key] = value
      }
      if (y.schemaPageType && y.schemaPageType !== 'WebPage') seo.schemaPageType = y.schemaPageType as SchemaPageType
      if (y.schemaArticleType && y.schemaArticleType !== 'Article') seo.schemaArticleType = y.schemaArticleType as SchemaArticleType
    }

    const excerpt = sanitizePlain(stripTags(decodeEntities(item.excerpt || '')).replace(/\s*\[(?:…|&hellip;|\.\.\.)\]\s*$/, '').replace(/\s*…\s*$/, ''))
    // REST excerpts are auto-generated from content when empty — only keep hand-written ones.
    const squash = (s: string) => s.replace(/[\s ]+/g, '').toLowerCase()
    const manualExcerpt = excerpt && !squash(stripTags(cleaned.html)).startsWith(squash(excerpt).slice(0, 40)) ? excerpt : ''

    const values = {
      type: item.type,
      status: mapStatus(item.status),
      title,
      slug,
      content: cleaned.html,
      excerpt: manualExcerpt,
      sticky: item.type === 'post' ? item.sticky : false,
      template: item.type === 'page' ? mapTemplate(item.template) : 'default',
      menuOrder: item.menuOrder || 0,
      featuredImageId,
      seo,
      wordCount: wordCountFromHtml(cleaned.html),
      wpId: item.wpId,
      publishedAt: item.date ? new Date(item.date) : new Date(),
      createdAt: item.date ? new Date(item.date) : new Date(),
      updatedAt: item.modified ? new Date(item.modified) : new Date(),
    }

    let id: number
    let action: ImportItemResult['action']
    if (existing) {
      await db.update(posts).set(values).where(eq(posts.id, existing.id))
      id = existing.id
      action = 'updated'
    } else {
      const [row] = await db.insert(posts).values(values).returning({ id: posts.id })
      id = row.id
      action = 'created'
    }

    // Terms.
    if (item.type === 'post') {
      await db.delete(postTerms).where(eq(postTerms.postId, id))
      const ids: number[] = []
      let primary: number | null = null
      for (const [tax, list] of [['category', item.categories], ['tag', item.tags]] as const) {
        for (const t of list) {
          const s = slugify(t.slug || t.name)
          if (!s || (tax === 'category' && s === 'uncategorized')) continue
          let [row] = await db.select({ id: terms.id }).from(terms).where(and(eq(terms.taxonomy, tax), eq(terms.slug, s))).limit(1)
          if (!row) [row] = await db.insert(terms).values({ taxonomy: tax, name: sanitizePlain(decodeEntities(t.name)), slug: s }).returning({ id: terms.id })
          ids.push(row.id)
          if (tax === 'category' && y.primaryCategorySlug && slugify(y.primaryCategorySlug) === s) primary = row.id
        }
      }
      if (ids.length) await db.insert(postTerms).values([...new Set(ids)].map((termId) => ({ postId: id, termId }))).onConflictDoNothing()
      if (primary) await db.update(posts).set({ primaryCategoryId: primary }).where(eq(posts.id, id))
    }

    return { ok: true, action, title, slug, images, warnings }
  } catch (error) {
    return { ok: false, action: 'failed', title, images: 0, warnings: [...warnings, error instanceof Error ? error.message : String(error)] }
  }
}

/* ------------------------------------------------------------------ */
/* REST API → normalized                                               */
/* ------------------------------------------------------------------ */

interface WpRestItem {
  id: number
  date_gmt?: string
  date?: string
  modified_gmt?: string
  slug: string
  status: string
  type: string
  link: string
  title: { rendered?: string; raw?: string }
  content: { rendered?: string; raw?: string }
  excerpt: { rendered?: string; raw?: string }
  featured_media?: number
  sticky?: boolean
  template?: string
  categories?: number[]
  tags?: number[]
  menu_order?: number
  yoast_head_json?: {
    title?: string
    description?: string
    canonical?: string
    robots?: { index?: string; follow?: string }
    og_title?: string
    og_description?: string
    og_image?: { url: string }[]
    twitter_title?: string
    twitter_description?: string
    twitter_image?: string
    schema?: { '@graph'?: { '@type'?: string | string[] }[] }
  }
}

export interface WpTermsIndex {
  categories: Map<number, { slug: string; name: string }>
  tags: Map<number, { slug: string; name: string }>
}

function schemaTypes(graph: { '@type'?: string | string[] }[] = []): { page?: string; article?: string } {
  const out: { page?: string; article?: string } = {}
  const pageTypes = ['WebPage', 'ItemPage', 'AboutPage', 'FAQPage', 'QAPage', 'ProfilePage', 'ContactPage', 'MedicalWebPage', 'CollectionPage', 'CheckoutPage', 'RealEstateListing', 'SearchResultsPage']
  const articleTypes = ['Article', 'BlogPosting', 'SocialMediaPosting', 'NewsArticle', 'AdvertiserContentArticle', 'SatiricalArticle', 'ScholarlyArticle', 'TechArticle', 'Report']
  for (const node of graph) {
    const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type'] || '']
    const p = types.find((t) => pageTypes.includes(t) && t !== 'WebPage') ?? (types.includes('WebPage') ? 'WebPage' : undefined)
    const a = types.find((t) => articleTypes.includes(t))
    if (p && !out.page) out.page = p
    if (a && !out.article) out.article = a
  }
  return out
}

export async function normalizeRestItem(
  json: WpRestItem,
  type: 'post' | 'page',
  index: WpTermsIndex,
  base: string,
  headers: Record<string, string>,
): Promise<NormalizedItem> {
  const y = json.yoast_head_json ?? {}
  let featuredImage: NormalizedItem['featuredImage']
  if (json.featured_media) {
    try {
      const { data } = await wpJson<{ source_url: string; alt_text?: string; title?: { rendered?: string } }>(
        `${base}/wp-json/wp/v2/media/${json.featured_media}?_fields=source_url,alt_text,title`,
        headers,
      )
      featuredImage = { url: data.source_url, alt: data.alt_text, title: stripTags(data.title?.rendered || '') }
    } catch {
      if (y.og_image?.[0]?.url) featuredImage = { url: y.og_image[0].url }
    }
  }
  const types = schemaTypes(y.schema?.['@graph'])
  return {
    wpId: json.id,
    type,
    status: json.status,
    title: json.title.raw ?? stripTags(json.title.rendered || ''),
    slug: json.slug,
    content: json.content.raw ?? json.content.rendered ?? '',
    raw: json.content.raw !== undefined,
    excerpt: json.excerpt.raw ?? stripTags(json.excerpt.rendered || ''),
    date: json.date_gmt ? `${json.date_gmt}Z` : json.date || '',
    modified: json.modified_gmt ? `${json.modified_gmt}Z` : '',
    sticky: Boolean(json.sticky),
    menuOrder: json.menu_order || 0,
    template: json.template || '',
    categories: (json.categories || []).map((id) => index.categories.get(id)).filter((x): x is { slug: string; name: string } => Boolean(x)),
    tags: (json.tags || []).map((id) => index.tags.get(id)).filter((x): x is { slug: string; name: string } => Boolean(x)),
    featuredImage,
    link: json.link,
    yoast: {
      title: y.title,
      metadesc: y.description,
      canonical: y.canonical,
      noindex: y.robots?.index === 'noindex',
      nofollow: y.robots?.follow === 'nofollow',
      ogTitle: y.og_title,
      ogDescription: y.og_description,
      ogImage: y.og_image?.[0]?.url,
      twitterTitle: y.twitter_title,
      twitterDescription: y.twitter_description,
      twitterImage: y.twitter_image,
      schemaPageType: types.page,
      schemaArticleType: types.article,
    },
  }
}

export async function currentSiteHost(): Promise<string> {
  return new URL(resolveSiteUrl(await getSettings())).hostname
}

export { escapeHtml }
