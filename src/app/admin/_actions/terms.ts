'use server'

import { z } from 'zod'
import { and, eq, inArray, ne } from 'drizzle-orm'
import { getDb, schema } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { sanitizePlain } from '@/lib/content/sanitize'
import { slugify } from '@/lib/content/text'
import { normalizeRedirectPath } from '@/lib/data/redirects'
import { revalidateSite } from '@/lib/revalidate'
import type { ActionResult, TermOption } from '@/lib/admin-types'
import type { TermSeo } from '@/lib/types'

const { terms, redirects, posts } = schema

const termInput = z.object({
  taxonomy: z.enum(['category', 'tag']),
  name: z.string().min(1).max(200),
  slug: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  parentId: z.number().int().nullable().optional(),
  seo: z.record(z.string(), z.unknown()).optional(),
})

async function uniqueTermSlug(taxonomy: string, base: string, excludeId?: number) {
  const db = getDb()
  let slug = base || `term-${Date.now().toString(36)}`
  let n = 2
  while (true) {
    const rows = await db
      .select({ id: terms.id })
      .from(terms)
      .where(and(eq(terms.taxonomy, taxonomy), eq(terms.slug, slug), excludeId ? ne(terms.id, excludeId) : undefined))
      .limit(1)
    if (!rows.length) return slug
    slug = `${base}-${n++}`
  }
}

function cleanSeo(seo: Record<string, unknown> | undefined): TermSeo {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(seo ?? {})) {
    if (typeof v === 'string' && v.trim()) out[k] = v.slice(0, 2000)
    if (k === 'robotsIndex' && v === 'default') delete out[k]
  }
  return out as TermSeo
}

/** Path of a category including its parents, e.g. /category/digital-marketing/target */
async function termPath(taxonomy: string, id: number): Promise<string> {
  const db = getDb()
  const all = await db.select({ id: terms.id, slug: terms.slug, parentId: terms.parentId }).from(terms).where(eq(terms.taxonomy, taxonomy))
  const map = new Map(all.map((t) => [t.id, t]))
  const chain: string[] = []
  let cur = map.get(id)
  let guard = 0
  while (cur && guard++ < 10) {
    chain.unshift(cur.slug)
    cur = cur.parentId ? map.get(cur.parentId) : undefined
  }
  return `/${taxonomy === 'tag' ? 'tag' : 'category'}/${chain.join('/')}`
}

export async function createTerm(raw: z.infer<typeof termInput>): Promise<ActionResult<TermOption>> {
  await requireUser(raw.taxonomy === 'category' ? 'edit_others' : 'publish')
  const parsed = termInput.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'Please enter a name.' }
  const input = parsed.data
  const name = sanitizePlain(input.name)
  const db = getDb()
  const slug = await uniqueTermSlug(input.taxonomy, slugify(input.slug || name))
  const [row] = await db
    .insert(terms)
    .values({
      taxonomy: input.taxonomy,
      name,
      slug,
      description: sanitizePlain(input.description || ''),
      parentId: input.taxonomy === 'category' ? (input.parentId ?? null) : null,
      seo: cleanSeo(input.seo),
    })
    .returning()
  revalidateSite()
  return { ok: true, data: { id: row.id, name: row.name, slug: row.slug, parentId: row.parentId, count: 0, description: row.description, seo: row.seo } }
}

export async function updateTerm(id: number, raw: z.infer<typeof termInput>): Promise<ActionResult> {
  await requireUser('edit_others')
  const parsed = termInput.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'Please enter a name.' }
  const input = parsed.data
  const db = getDb()
  const [before] = await db.select().from(terms).where(eq(terms.id, id)).limit(1)
  if (!before) return { ok: false, error: 'Not found.' }
  if (input.parentId === id) return { ok: false, error: 'A category cannot be its own parent.' }
  const oldPath = await termPath(before.taxonomy, id)
  const slug = await uniqueTermSlug(before.taxonomy, slugify(input.slug || input.name), id)
  await db
    .update(terms)
    .set({
      name: sanitizePlain(input.name),
      slug,
      description: sanitizePlain(input.description || ''),
      parentId: before.taxonomy === 'category' ? (input.parentId ?? null) : null,
      seo: cleanSeo(input.seo),
    })
    .where(eq(terms.id, id))
  const newPath = await termPath(before.taxonomy, id)
  if (oldPath !== newPath) {
    await db
      .insert(redirects)
      .values({ source: normalizeRedirectPath(oldPath), target: `${newPath}/`, statusCode: 301, note: 'Created automatically after the URL changed' })
      .onConflictDoUpdate({ target: redirects.source, set: { target: `${newPath}/` } })
  }
  revalidateSite()
  return { ok: true, message: 'Saved.' }
}

export async function deleteTerms(ids: number[]): Promise<ActionResult> {
  await requireUser('edit_others')
  const db = getDb()
  const clean = ids.filter((n) => Number.isInteger(n))
  if (!clean.length) return { ok: false, error: 'Nothing selected.' }
  // Children move up to the deleted term's parent (WordPress behaviour).
  const rows = await db.select().from(terms).where(inArray(terms.id, clean))
  for (const r of rows) {
    await db.update(terms).set({ parentId: r.parentId }).where(eq(terms.parentId, r.id))
    await db.update(posts).set({ primaryCategoryId: null }).where(eq(posts.primaryCategoryId, r.id))
  }
  await db.delete(terms).where(inArray(terms.id, clean))
  revalidateSite()
  return { ok: true, message: `${clean.length} deleted.` }
}
