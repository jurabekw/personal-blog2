'use server'

import { asc, desc, eq, ilike, ne, or, sql } from 'drizzle-orm'
import { getDb, schema } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { getSettings, resolveSiteUrl, saveSettings } from '@/lib/data/settings'
import { normalizeRedirectPath } from '@/lib/data/redirects'
import { sanitizePlain } from '@/lib/content/sanitize'
import { excerptFromHtml } from '@/lib/content/text'
import { analyzeReadability, analyzeSeo } from '@/lib/seo/analysis'
import { replaceVars } from '@/lib/seo/templates'
import { revalidateSite } from '@/lib/revalidate'
import type { ActionResult } from '@/lib/admin-types'

const { redirects, posts } = schema

/* ---------------- Redirects ---------------- */

export interface RedirectRowDto {
  id: number
  source: string
  target: string
  statusCode: number
  hits: number
  lastHitAt: string | null
  note: string
  createdAt: string
}

export async function listRedirects(q = ''): Promise<RedirectRowDto[]> {
  await requireUser('edit_others')
  const db = getDb()
  const rows = await db
    .select()
    .from(redirects)
    .where(q ? or(ilike(redirects.source, `%${q}%`), ilike(redirects.target, `%${q}%`)) : undefined)
    .orderBy(desc(redirects.createdAt))
    .limit(1000)
  return rows.map((r) => ({ ...r, lastHitAt: r.lastHitAt?.toISOString() ?? null, createdAt: r.createdAt.toISOString() }))
}

function normalizeTarget(target: string): string {
  const t = target.trim()
  if (!t) return ''
  if (/^https?:\/\//i.test(t)) return t
  return t.startsWith('/') ? t : `/${t}`
}

export async function saveRedirect(input: { id?: number; source: string; target: string; statusCode: number; note?: string }): Promise<ActionResult> {
  await requireUser('edit_others')
  const source = normalizeRedirectPath(input.source)
  const target = normalizeTarget(input.target)
  const statusCode = [301, 302, 307, 308, 410].includes(input.statusCode) ? input.statusCode : 301
  if (source === '/') return { ok: false, error: 'The homepage cannot be redirected.' }
  if (statusCode !== 410 && !target) return { ok: false, error: 'Enter a target URL.' }
  if (normalizeRedirectPath(target) === source && !/^https?:/i.test(target)) return { ok: false, error: 'Source and target are the same.' }
  const db = getDb()
  try {
    if (input.id) {
      await db.update(redirects).set({ source, target, statusCode, note: sanitizePlain(input.note || '') }).where(eq(redirects.id, input.id))
    } else {
      await db.insert(redirects).values({ source, target, statusCode, note: sanitizePlain(input.note || '') })
    }
  } catch {
    return { ok: false, error: `A redirect for ${source} already exists.` }
  }
  revalidateSite()
  return { ok: true, message: 'Redirect saved.' }
}

export async function deleteRedirects(ids: number[]): Promise<ActionResult> {
  await requireUser('edit_others')
  const db = getDb()
  for (const id of ids) await db.delete(redirects).where(eq(redirects.id, id))
  revalidateSite()
  return { ok: true, message: 'Deleted.' }
}

/** Paste "source, target, type" lines (CSV) to add many redirects at once. */
export async function importRedirects(csv: string): Promise<ActionResult> {
  await requireUser('edit_others')
  let added = 0
  const errors: string[] = []
  for (const line of csv.split(/\r?\n/)) {
    const parts = line.split(/[,;\t]/).map((p) => p.trim())
    if (!parts[0] || parts[0].toLowerCase() === 'source') continue
    const r = await saveRedirect({ source: parts[0], target: parts[1] || '', statusCode: Number(parts[2]) || 301 })
    if (r.ok) added++
    else errors.push(`${parts[0]}: ${r.error}`)
  }
  return errors.length ? { ok: false, error: `${added} added. Problems: ${errors.slice(0, 5).join('; ')}` } : { ok: true, message: `${added} redirects added.` }
}

/* ---------------- Bulk SEO editor ---------------- */

export interface BulkRow {
  id: number
  type: string
  title: string
  slug: string
  status: string
  seoTitle: string
  metaDescription: string
  focusKeyphrase: string
  seoScore: number | null
}

export async function listBulk(type: 'post' | 'page'): Promise<BulkRow[]> {
  await requireUser('edit_others')
  const rows = await getDb()
    .select({ id: posts.id, type: posts.type, title: posts.title, slug: posts.slug, status: posts.status, seo: posts.seo, seoScore: posts.seoScore })
    .from(posts)
    .where(sql`${posts.type} = ${type} and ${posts.status} <> 'trash'`)
    .orderBy(asc(posts.title))
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    slug: r.slug,
    status: r.status,
    seoTitle: r.seo?.title ?? '',
    metaDescription: r.seo?.metaDescription ?? '',
    focusKeyphrase: r.seo?.focusKeyphrase ?? '',
    seoScore: r.seoScore,
  }))
}

export async function saveBulkRow(id: number, data: { seoTitle: string; metaDescription: string; focusKeyphrase: string }): Promise<ActionResult> {
  await requireUser('edit_others')
  const db = getDb()
  const [row] = await db.select({ seo: posts.seo }).from(posts).where(eq(posts.id, id)).limit(1)
  if (!row) return { ok: false, error: 'Not found.' }
  const seo = { ...(row.seo ?? {}) }
  const apply = (k: 'title' | 'metaDescription' | 'focusKeyphrase', v: string) => {
    const clean = sanitizePlain(v)
    if (clean) seo[k] = clean
    else delete seo[k]
  }
  apply('title', data.seoTitle)
  apply('metaDescription', data.metaDescription)
  apply('focusKeyphrase', data.focusKeyphrase)
  await db.update(posts).set({ seo }).where(eq(posts.id, id))
  await recalcScores([id])
  revalidateSite()
  return { ok: true, message: 'Saved.' }
}

/* ---------------- Scores & robots.txt ---------------- */

/** Re-run the SEO + readability analysis for all (or some) posts — e.g. after an import. */
export async function recalcScores(ids?: number[]): Promise<ActionResult> {
  await requireUser('edit_others')
  const db = getDb()
  const settings = await getSettings()
  const host = new URL(resolveSiteUrl(settings)).hostname
  const rows = await db.select().from(posts).where(ne(posts.status, 'trash'))
  const targets = ids ? rows.filter((r) => ids.includes(r.id)) : rows
  for (const p of targets) {
    const seo = p.seo ?? {}
    const type = p.type === 'page' ? 'page' : 'post'
    const ctx = { title: p.title, sitename: settings.general.siteName, sitedesc: settings.general.tagline, sep: settings.seo.separator, excerpt: p.excerpt || excerptFromHtml(p.content), focuskw: seo.focusKeyphrase }
    const customDesc = replaceVars(seo.metaDescription || '', ctx)
    const kp = (seo.focusKeyphrase || '').trim().toLowerCase()
    const used = kp ? rows.filter((r) => r.id !== p.id && (r.seo?.focusKeyphrase || '').trim().toLowerCase() === kp).length : 0
    const s = analyzeSeo({
      html: p.content,
      title: p.title,
      seoTitle: replaceVars(seo.title || settings.seo.titles[type], ctx),
      metaDescription: customDesc || replaceVars(settings.seo.descriptions[type], ctx) || ctx.excerpt,
      metaDescriptionIsCustom: Boolean(customDesc),
      slug: p.slug,
      keyphrase: seo.focusKeyphrase || '',
      siteHost: host,
      keyphraseUsedElsewhere: used,
      cornerstone: seo.cornerstone,
      language: settings.seo.analysisLanguage,
    })
    const r = analyzeReadability({ html: p.content, language: settings.seo.analysisLanguage })
    await db.update(posts).set({ seoScore: s.rating === 'na' ? null : s.score, readabilityScore: r.score }).where(eq(posts.id, p.id))
  }
  return { ok: true, message: `Recalculated ${targets.length} item${targets.length === 1 ? '' : 's'}.` }
}

export async function saveRobotsTxt(text: string): Promise<ActionResult> {
  await requireUser('manage_options')
  const settings = await getSettings()
  await saveSettings('seo', { ...settings.seo, robotsTxt: text.slice(0, 20000) })
  revalidateSite()
  return { ok: true, message: 'robots.txt saved.' }
}
