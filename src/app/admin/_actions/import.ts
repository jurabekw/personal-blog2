'use server'

import { isNotNull, eq } from 'drizzle-orm'
import { requireUser } from '@/lib/auth'
import { getDb, schema } from '@/lib/db'
import { getSettings, saveSettings } from '@/lib/data/settings'
import { sanitizePlain } from '@/lib/content/sanitize'
import { decodeEntities, stripTags } from '@/lib/content/text'
import { revalidateSite } from '@/lib/revalidate'
import {
  authHeader,
  cleanContent,
  importItem,
  normalizeRestItem,
  templatizeTitle,
  upsertTerms,
  wpJson,
  type ImportItemResult,
  type NormalizedItem,
  type NormalizedTerm,
  type WpTermsIndex,
} from '@/lib/import/wordpress'
import { recalcScores } from './seo'

export interface ImportConnection {
  url: string
  username?: string
  appPassword?: string
}

export interface ImportFlags {
  downloadImages: boolean
  overwrite: boolean
  importSeo: boolean
}

export interface DiscoveredItem {
  type: 'post' | 'page'
  id: number
  title: string
  slug: string
  status: string
  role?: 'front' | 'blog'
}

export interface DiscoverResult {
  ok: boolean
  error?: string
  site?: { name: string; description: string; home: string }
  terms?: { categories: number; tags: number; created: number }
  items?: DiscoveredItem[]
}

function baseUrl(url: string): string {
  const u = new URL(url.trim())
  return `${u.protocol}//${u.host}`
}

async function fetchAll<T>(url: string, headers: Record<string, string>): Promise<T[]> {
  const out: T[] = []
  for (let page = 1; page <= 50; page++) {
    const sep = url.includes('?') ? '&' : '?'
    const { data, totalPages } = await wpJson<T[]>(`${url}${sep}per_page=100&page=${page}`, headers)
    out.push(...data)
    if (page >= totalPages || data.length < 100) break
  }
  return out
}

const norm = (u: string) => u.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '')

/** Step 1: read site info, import categories & tags, list posts and pages. */
export async function wpDiscover(conn: ImportConnection): Promise<DiscoverResult> {
  try {
    await requireUser('manage_options')
    const base = baseUrl(conn.url)
    const headers = authHeader(conn.username, conn.appPassword)
    const authed = Boolean(headers.Authorization)
    const { data: root } = await wpJson<{ name: string; description: string; home: string; url: string }>(`${base}/wp-json/`, headers)

    type WpTerm = { id: number; name: string; slug: string; description: string; parent?: number }
    const [cats, tags] = await Promise.all([
      fetchAll<WpTerm>(`${base}/wp-json/wp/v2/categories?_fields=id,name,slug,description,parent`, headers),
      fetchAll<WpTerm>(`${base}/wp-json/wp/v2/tags?_fields=id,name,slug,description`, headers),
    ])
    const catById = new Map(cats.map((c) => [c.id, c]))
    const list: NormalizedTerm[] = [
      ...cats.map((c) => ({
        taxonomy: 'category' as const,
        name: decodeEntities(c.name),
        slug: decodeURIComponent(c.slug),
        description: c.description,
        parentSlug: c.parent ? catById.get(c.parent)?.slug : undefined,
        wpId: c.id,
      })),
      ...tags.map((t) => ({ taxonomy: 'tag' as const, name: decodeEntities(t.name), slug: decodeURIComponent(t.slug), description: t.description, wpId: t.id })),
    ]
    const termResult = await upsertTerms(list)

    type WpListItem = { id: number; slug: string; status: string; link: string; title: { rendered: string } }
    const status = authed ? '&status=publish,draft,pending,future,private' : ''
    const [postList, pageList] = await Promise.all([
      fetchAll<WpListItem>(`${base}/wp-json/wp/v2/posts?_fields=id,slug,status,link,title${status}`, headers),
      fetchAll<WpListItem>(`${base}/wp-json/wp/v2/pages?_fields=id,slug,status,link,title${status}`, headers),
    ])
    const home = norm(root.home || root.url || base)
    const items: DiscoveredItem[] = [
      ...pageList.map((p) => {
        const link = norm(p.link || '')
        const role: DiscoveredItem['role'] = link === home ? 'front' : link === `${home}/blog` || p.slug === 'blog' ? 'blog' : undefined
        return { type: 'page' as const, id: p.id, title: stripTags(p.title.rendered), slug: decodeURIComponent(p.slug), status: p.status, role }
      }),
      ...postList.map((p) => ({ type: 'post' as const, id: p.id, title: stripTags(p.title.rendered), slug: decodeURIComponent(p.slug), status: p.status })),
    ]
    return {
      ok: true,
      site: { name: decodeEntities(root.name), description: decodeEntities(root.description), home: root.home },
      terms: { categories: cats.filter((c) => c.slug !== 'uncategorized').length, tags: tags.length, created: termResult.created },
      items,
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

async function termIndex(): Promise<WpTermsIndex> {
  const rows = await getDb().select().from(schema.terms).where(isNotNull(schema.terms.wpId))
  const idx: WpTermsIndex = { categories: new Map(), tags: new Map() }
  for (const r of rows) (r.taxonomy === 'tag' ? idx.tags : idx.categories).set(r.wpId!, { slug: r.slug, name: r.name })
  return idx
}

/** Step 2: import one post or page (content, images, terms, Yoast data). */
export async function wpImportOne(conn: ImportConnection, item: { type: 'post' | 'page'; id: number }, flags: ImportFlags): Promise<ImportItemResult> {
  try {
    await requireUser('manage_options')
    const base = baseUrl(conn.url)
    const headers = authHeader(conn.username, conn.appPassword)
    const context = headers.Authorization ? 'edit' : 'view'
    const { data } = await wpJson<Parameters<typeof normalizeRestItem>[0]>(`${base}/wp-json/wp/v2/${item.type}s/${item.id}?context=${context}`, headers)
    const normalized = await normalizeRestItem(data, item.type, await termIndex(), base, headers)
    return importItem(normalized, { ...flags, sourceHosts: [new URL(base).hostname] })
  } catch (error) {
    return { ok: false, action: 'failed', title: `${item.type} #${item.id}`, images: 0, warnings: [error instanceof Error ? error.message : String(error)] }
  }
}

/** Step 3: homepage/blog SEO, site title & tagline, scores, cache refresh. */
export async function wpFinish(
  conn: ImportConnection,
  opts: { frontId?: number; blogId?: number; site?: { name: string; description: string }; importSiteInfo: boolean; importHomeContent: boolean; downloadImages: boolean },
): Promise<{ ok: boolean; log: string[] }> {
  await requireUser('manage_options')
  const log: string[] = []
  const base = baseUrl(conn.url)
  const headers = authHeader(conn.username, conn.appPassword)
  const settings = await getSettings()
  const seo = structuredClone(settings.seo)
  const general = structuredClone(settings.general)
  const appearance = structuredClone(settings.appearance)

  type Page = { content: { rendered: string }; yoast_head_json?: { title?: string; description?: string } }
  try {
    if (opts.frontId) {
      const { data } = await wpJson<Page>(`${base}/wp-json/wp/v2/pages/${opts.frontId}`, headers)
      if (data.yoast_head_json?.title) seo.titles.home = templatizeTitle(sanitizePlain(decodeEntities(data.yoast_head_json.title)), opts.site?.name || general.siteName)
      if (data.yoast_head_json?.description) seo.descriptions.home = sanitizePlain(decodeEntities(data.yoast_head_json.description))
      log.push(`Homepage SEO title & description imported (“${seo.titles.home}”).`)
      if (opts.importHomeContent) {
        const cleaned = await cleanContent(data.content.rendered, { sourceHosts: [new URL(base).hostname], downloadImages: opts.downloadImages, overwrite: true, importSeo: true }, false)
        if (stripTags(cleaned.html).split(/\s+/).length > 5) {
          appearance.homeContent = cleaned.html
          log.push('Homepage content imported (Appearance → Homepage).')
        }
      }
    }
    if (opts.blogId) {
      const { data } = await wpJson<Page>(`${base}/wp-json/wp/v2/pages/${opts.blogId}`, headers)
      if (data.yoast_head_json?.title) seo.titles.blog = templatizeTitle(sanitizePlain(decodeEntities(data.yoast_head_json.title)), opts.site?.name || general.siteName).replace(' %%sep%%', ' %%page%% %%sep%%')
      if (data.yoast_head_json?.description) seo.descriptions.blog = sanitizePlain(decodeEntities(data.yoast_head_json.description))
      log.push('Blog page SEO title & description imported.')
    }
  } catch (error) {
    log.push(`Could not read homepage/blog SEO: ${error instanceof Error ? error.message : error}`)
  }
  if (opts.importSiteInfo && opts.site) {
    if (opts.site.name) general.siteName = sanitizePlain(opts.site.name)
    if (opts.site.description) general.tagline = sanitizePlain(opts.site.description)
    log.push(`Site title “${general.siteName}” and tagline imported.`)
  }
  await saveSettings('seo', seo)
  await saveSettings('general', general)
  await saveSettings('appearance', appearance)

  const r = await recalcScores()
  if (r.ok) log.push(r.message || 'Scores recalculated.')
  revalidateSite()
  return { ok: true, log }
}

/* ---------------- WXR (Tools → Export file) ---------------- */

export async function wxrImportTerms(list: NormalizedTerm[]): Promise<{ ok: boolean; created: number; error?: string }> {
  try {
    await requireUser('manage_options')
    const r = await upsertTerms(list.slice(0, 2000))
    return { ok: true, created: r.created }
  } catch (error) {
    return { ok: false, created: 0, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function wxrImportOne(item: NormalizedItem, flags: ImportFlags, sourceHost: string): Promise<ImportItemResult> {
  await requireUser('manage_options')
  if (!item || (item.type !== 'post' && item.type !== 'page')) return { ok: false, action: 'failed', title: '?', images: 0, warnings: ['Invalid item'] }
  return importItem(item, { ...flags, sourceHosts: sourceHost ? [sourceHost] : [] })
}

export async function wxrFinish(site?: { name: string; description: string; importSiteInfo: boolean }): Promise<{ ok: boolean; log: string[] }> {
  await requireUser('manage_options')
  const log: string[] = []
  if (site?.importSiteInfo && site.name) {
    const settings = await getSettings()
    await saveSettings('general', { ...settings.general, siteName: sanitizePlain(site.name), tagline: sanitizePlain(site.description || settings.general.tagline) })
    log.push(`Site title “${site.name}” imported.`)
  }
  const r = await recalcScores()
  if (r.ok) log.push(r.message || '')
  revalidateSite()
  return { ok: true, log }
}

/** Remove WordPress's default "Uncategorized" category if it was imported and is empty. */
export async function cleanupUncategorized(): Promise<void> {
  await requireUser('manage_options')
  await getDb().delete(schema.terms).where(eq(schema.terms.slug, 'uncategorized'))
}
