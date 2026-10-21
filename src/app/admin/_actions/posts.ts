'use server'

import { z } from 'zod'
import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm'
import { getDb, schema } from '@/lib/db'
import { can, requireUser, type CurrentUser } from '@/lib/auth'
import { getSettings, resolveSiteUrl } from '@/lib/data/settings'
import { sanitizeContent, sanitizePlain } from '@/lib/content/sanitize'
import { escapeHtml, excerptFromHtml, slugify, wordCountFromHtml } from '@/lib/content/text'
import { analyzeReadability, analyzeSeo } from '@/lib/seo/analysis'
import { replaceVars } from '@/lib/seo/templates'
import { normalizeRedirectPath } from '@/lib/data/redirects'
import { revalidateSite } from '@/lib/revalidate'
import type { ActionResult, PostInput, SaveResult } from '@/lib/admin-types'

const { posts, postTerms, terms, revisions, redirects } = schema

const seoSchema = z
  .object({
    focusKeyphrase: z.string().max(200).optional(),
    relatedKeyphrases: z.array(z.string().max(200)).max(10).optional(),
    title: z.string().max(300).optional(),
    metaDescription: z.string().max(1000).optional(),
    canonical: z.string().max(1000).optional(),
    robotsIndex: z.enum(['default', 'index', 'noindex']).optional(),
    nofollow: z.boolean().optional(),
    noimageindex: z.boolean().optional(),
    noarchive: z.boolean().optional(),
    nosnippet: z.boolean().optional(),
    breadcrumbTitle: z.string().max(300).optional(),
    cornerstone: z.boolean().optional(),
    schemaPageType: z.string().max(60).optional(),
    schemaArticleType: z.string().max(60).optional(),
    ogTitle: z.string().max(300).optional(),
    ogDescription: z.string().max(1000).optional(),
    ogImage: z.string().max(2000).optional(),
    twitterTitle: z.string().max(300).optional(),
    twitterDescription: z.string().max(1000).optional(),
    twitterImage: z.string().max(2000).optional(),
  })
  .passthrough()

const inputSchema = z.object({
  id: z.number().int().positive().optional(),
  type: z.enum(['post', 'page']),
  title: z.string().max(500),
  slug: z.string().max(200),
  content: z.string().max(2_000_000),
  excerpt: z.string().max(5000),
  status: z.enum(['draft', 'pending', 'publish']),
  publishedAt: z.string().max(40),
  sticky: z.boolean(),
  template: z.enum(['default', 'about', 'full-width']),
  parentId: z.number().int().nullable(),
  menuOrder: z.number().int(),
  categoryIds: z.array(z.number().int()).max(100),
  tagNames: z.array(z.string().max(100)).max(100),
  primaryCategoryId: z.number().int().nullable(),
  featuredImageId: z.number().int().nullable(),
  seo: seoSchema,
  faq: z.array(z.object({ question: z.string().max(500), answer: z.string().max(10000) })).max(50),
})

async function uniqueSlug(base: string, excludeId?: number): Promise<string> {
  const db = getDb()
  const clean = base || `draft-${Date.now().toString(36)}`
  let slug = clean
  let n = 2
  // Reserved paths used by the app itself.
  const reserved = new Set(['blog', 'category', 'tag', 'search', 'feed', 'admin', 'api', 'og', 'draft-preview', 'page'])
  while (true) {
    if (!reserved.has(slug)) {
      const rows = await db
        .select({ id: posts.id })
        .from(posts)
        .where(excludeId ? and(eq(posts.slug, slug), ne(posts.id, excludeId)) : eq(posts.slug, slug))
        .limit(1)
      if (!rows.length) return slug
    }
    slug = `${clean}-${n++}`
  }
}

async function tagIdsFor(names: string[]): Promise<number[]> {
  const db = getDb()
  const ids: number[] = []
  for (const raw of names) {
    const name = sanitizePlain(raw).trim()
    if (!name) continue
    const slug = slugify(name) || `tag-${Date.now().toString(36)}`
    const [existing] = await db
      .select({ id: terms.id })
      .from(terms)
      .where(and(eq(terms.taxonomy, 'tag'), sql`(lower(${terms.name}) = lower(${name}) or ${terms.slug} = ${slug})`))
      .limit(1)
    if (existing) ids.push(existing.id)
    else {
      const [row] = await db.insert(terms).values({ taxonomy: 'tag', name, slug }).returning({ id: terms.id })
      ids.push(row.id)
    }
  }
  return [...new Set(ids)]
}

async function assertCanEdit(user: CurrentUser, postId: number) {
  if (can(user, 'edit_others')) return
  const [row] = await getDb().select({ authorId: posts.authorId }).from(posts).where(eq(posts.id, postId)).limit(1)
  if (!row || row.authorId !== user.id) throw new Error('You can only edit your own posts.')
}

export async function savePost(raw: PostInput): Promise<SaveResult> {
  try {
    const user = await requireUser()
    const parsed = inputSchema.safeParse(raw)
    if (!parsed.success) return { ok: false, error: 'Invalid data: ' + parsed.error.issues[0]?.message }
    const input = parsed.data
    if (input.id) await assertCanEdit(user, input.id)
    if (input.type === 'page' && !can(user, 'edit_others')) return { ok: false, error: 'Only editors can manage pages.' }
    let status = input.status
    if (status === 'publish' && !can(user, 'publish')) status = 'pending'

    const db = getDb()
    const settings = await getSettings()
    const siteUrl = resolveSiteUrl(settings)
    const title = sanitizePlain(input.title).slice(0, 500)
    const content = sanitizeContent(input.content)
    const excerpt = sanitizePlain(input.excerpt)
    const slug = await uniqueSlug(slugify(input.slug || title), input.id)
    const wordCount = wordCountFromHtml(content)
    let publishedAt: Date | null = input.publishedAt ? new Date(input.publishedAt) : null
    if (publishedAt && Number.isNaN(publishedAt.getTime())) publishedAt = null
    if (status === 'publish' && !publishedAt) publishedAt = new Date()

    const seo = Object.fromEntries(
      Object.entries(input.seo).filter(([, v]) => v !== '' && v !== undefined && v !== null && !(Array.isArray(v) && !v.length)),
    ) as PostInput['seo']
    if (seo.robotsIndex === 'default') delete seo.robotsIndex
    const faq = input.faq
      .map((q) => ({ question: sanitizePlain(q.question), answer: sanitizeContent(q.answer.includes('<') ? q.answer : q.answer.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')) }))
      .filter((q) => q.question && q.answer)

    // Scores (shown as coloured dots in lists, like Yoast).
    const ctx = {
      title,
      sitename: settings.general.siteName,
      sitedesc: settings.general.tagline,
      sep: settings.seo.separator,
      excerpt: excerpt || excerptFromHtml(content),
      focuskw: seo.focusKeyphrase,
    }
    const seoTitle = replaceVars(seo.title || settings.seo.titles[input.type], ctx)
    const customDesc = replaceVars(seo.metaDescription || '', ctx)
    const metaDescription = customDesc || replaceVars(settings.seo.descriptions[input.type], ctx) || ctx.excerpt
    let usedElsewhere = 0
    if (seo.focusKeyphrase?.trim()) {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(posts)
        .where(
          and(
            sql`lower(${posts.seo}->>'focusKeyphrase') = lower(${seo.focusKeyphrase.trim()})`,
            ne(posts.status, 'trash'),
            input.id ? ne(posts.id, input.id) : sql`true`,
          ),
        )
      usedElsewhere = count
    }
    const host = new URL(siteUrl).hostname
    const seoResult = analyzeSeo({
      html: content,
      title,
      seoTitle,
      metaDescription,
      metaDescriptionIsCustom: Boolean(customDesc),
      slug,
      keyphrase: seo.focusKeyphrase || '',
      siteHost: host,
      keyphraseUsedElsewhere: usedElsewhere,
      cornerstone: seo.cornerstone,
      language: settings.seo.analysisLanguage,
    })
    const readResult = analyzeReadability({ html: content, language: settings.seo.analysisLanguage })

    const values = {
      type: input.type,
      status,
      title,
      slug,
      content,
      excerpt,
      sticky: input.type === 'post' ? input.sticky : false,
      template: input.type === 'page' ? input.template : 'default',
      parentId: input.parentId,
      menuOrder: input.menuOrder,
      primaryCategoryId: input.primaryCategoryId && input.categoryIds.includes(input.primaryCategoryId) ? input.primaryCategoryId : null,
      featuredImageId: input.featuredImageId,
      seo,
      faq,
      seoScore: seoResult.rating === 'na' ? null : seoResult.score,
      readabilityScore: readResult.score,
      wordCount,
      publishedAt,
      updatedAt: new Date(),
    }

    let id = input.id
    let redirectCreated: string | undefined
    let previous: typeof posts.$inferSelect | undefined
    if (id) {
      ;[previous] = await db.select().from(posts).where(eq(posts.id, id)).limit(1)
      if (!previous) return { ok: false, error: 'This item no longer exists.' }
      await db.update(posts).set(values).where(eq(posts.id, id))
      // Slug changed on a published item → keep old links working (301).
      if (previous.status === 'publish' && previous.slug !== slug) {
        const source = normalizeRedirectPath(`/${previous.slug}`)
        await db
          .insert(redirects)
          .values({ source, target: `/${slug}/`, statusCode: 301, note: 'Created automatically after the URL changed' })
          .onConflictDoUpdate({ target: redirects.source, set: { target: `/${slug}/`, statusCode: 301 } })
        // Never redirect the new URL away.
        await db.delete(redirects).where(eq(redirects.source, normalizeRedirectPath(`/${slug}`)))
        redirectCreated = `${source}/ → /${slug}/`
      }
    } else {
      const [row] = await db
        .insert(posts)
        .values({ ...values, authorId: user.id, createdAt: new Date() })
        .returning({ id: posts.id })
      id = row.id
    }

    // Terms.
    await db.delete(postTerms).where(eq(postTerms.postId, id))
    if (input.type === 'post') {
      const tagIds = await tagIdsFor(input.tagNames)
      const termIds = [...new Set([...input.categoryIds, ...tagIds])]
      if (termIds.length) await db.insert(postTerms).values(termIds.map((termId) => ({ postId: id!, termId }))).onConflictDoNothing()
    }

    // Revision (keep the 25 most recent).
    if (!previous || previous.content !== content || previous.title !== title || previous.excerpt !== excerpt) {
      await db.insert(revisions).values({ postId: id, title, content, excerpt, authorId: user.id })
      const old = await db
        .select({ id: revisions.id })
        .from(revisions)
        .where(and(eq(revisions.postId, id), eq(revisions.kind, 'revision')))
        .orderBy(desc(revisions.createdAt))
        .offset(25)
      if (old.length) await db.delete(revisions).where(inArray(revisions.id, old.map((r) => r.id)))
    }

    revalidateSite()
    return {
      ok: true,
      id,
      slug,
      status,
      publishedAt: publishedAt ? publishedAt.toISOString() : null,
      seoScore: values.seoScore,
      readabilityScore: values.readabilityScore,
      savedAt: new Date().toISOString(),
      redirectCreated,
    }
  } catch (error) {
    console.error('[savePost]', error)
    return { ok: false, error: error instanceof Error ? error.message : 'Could not save.' }
  }
}

export async function bulkPostAction(ids: number[], action: 'trash' | 'restore' | 'delete' | 'publish' | 'draft'): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const clean = ids.filter((n) => Number.isInteger(n) && n > 0).slice(0, 500)
    if (!clean.length) return { ok: false, error: 'Nothing selected.' }
    for (const id of clean) await assertCanEdit(user, id)
    const db = getDb()
    if (action === 'trash') {
      await db
        .update(posts)
        .set({ previousStatus: sql`${posts.status}`, status: 'trash', sticky: false, updatedAt: new Date() })
        .where(and(inArray(posts.id, clean), ne(posts.status, 'trash')))
    } else if (action === 'restore') {
      await db
        .update(posts)
        .set({ status: sql`coalesce(${posts.previousStatus}, 'draft')`, previousStatus: null })
        .where(and(inArray(posts.id, clean), eq(posts.status, 'trash')))
    } else if (action === 'delete') {
      if (!can(user, 'edit_others')) return { ok: false, error: 'Only editors can delete permanently.' }
      await db.delete(posts).where(and(inArray(posts.id, clean), eq(posts.status, 'trash')))
    } else if (action === 'publish') {
      if (!can(user, 'publish')) return { ok: false, error: 'You cannot publish.' }
      await db
        .update(posts)
        .set({ status: 'publish', publishedAt: sql`coalesce(${posts.publishedAt}, now())`, updatedAt: new Date() })
        .where(inArray(posts.id, clean))
    } else if (action === 'draft') {
      await db.update(posts).set({ status: 'draft', updatedAt: new Date() }).where(inArray(posts.id, clean))
    }
    revalidateSite()
    const verb = { trash: 'moved to the Trash', restore: 'restored', delete: 'permanently deleted', publish: 'published', draft: 'switched to draft' }[action]
    return { ok: true, message: `${clean.length} item${clean.length === 1 ? '' : 's'} ${verb}.` }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Action failed.' }
  }
}

export async function emptyTrash(type: 'post' | 'page'): Promise<ActionResult> {
  const user = await requireUser()
  if (!can(user, 'edit_others')) return { ok: false, error: 'Not allowed.' }
  await getDb().delete(posts).where(and(eq(posts.type, type), eq(posts.status, 'trash')))
  return { ok: true, message: 'Trash emptied.' }
}

export async function getRevisions(postId: number) {
  const user = await requireUser()
  await assertCanEdit(user, postId)
  const db = getDb()
  const rows = await db
    .select({ id: revisions.id, title: revisions.title, createdAt: revisions.createdAt, authorId: revisions.authorId, size: sql<number>`length(${revisions.content})`.mapWith(Number) })
    .from(revisions)
    .where(and(eq(revisions.postId, postId), eq(revisions.kind, 'revision')))
    .orderBy(desc(revisions.createdAt))
    .limit(25)
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))
}

export async function getRevision(revisionId: number) {
  const user = await requireUser()
  const [row] = await getDb().select().from(revisions).where(eq(revisions.id, revisionId)).limit(1)
  if (!row) return null
  await assertCanEdit(user, row.postId)
  return { id: row.id, postId: row.postId, title: row.title, content: row.content, excerpt: row.excerpt, createdAt: row.createdAt.toISOString() }
}

export async function quickDraft(title: string, content: string): Promise<ActionResult<{ id: number }>> {
  const user = await requireUser()
  const t = sanitizePlain(title).trim()
  if (!t) return { ok: false, error: 'Add a title.' }
  const body = content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(sanitizePlain(p))}</p>`)
    .join('')
  const db = getDb()
  const slug = await uniqueSlug(slugify(t))
  const [row] = await db
    .insert(posts)
    .values({ type: 'post', status: 'draft', title: t, slug, content: body, authorId: user.id, wordCount: wordCountFromHtml(body) })
    .returning({ id: posts.id })
  return { ok: true, data: { id: row.id }, message: 'Draft saved.' }
}

/** Suggest a unique slug for the permalink editor. */
export async function suggestSlug(text: string, excludeId?: number): Promise<string> {
  await requireUser()
  return uniqueSlug(slugify(text), excludeId)
}

/** "Preview changes": store unsaved title/content/excerpt for the preview page without touching the live post. */
export async function storePreview(postId: number, data: { title: string; content: string; excerpt: string }): Promise<ActionResult> {
  const user = await requireUser()
  await assertCanEdit(user, postId)
  const db = getDb()
  await db.delete(revisions).where(and(eq(revisions.postId, postId), eq(revisions.kind, 'preview'), eq(revisions.authorId, user.id)))
  await db.insert(revisions).values({
    postId,
    kind: 'preview',
    authorId: user.id,
    title: sanitizePlain(data.title),
    content: sanitizeContent(data.content),
    excerpt: sanitizePlain(data.excerpt),
  })
  return { ok: true }
}
