import 'server-only'
import { cache } from 'react'
import { and, asc, desc, eq, gt, ilike, inArray, lt, lte, ne, notInArray, or, sql, type SQL } from 'drizzle-orm'
import { getDb, isDatabaseConfigured, schema } from '@/lib/db'
import { excerptFromHtml, readingMinutes } from '@/lib/content/text'
import type { FaqItem, PostSeo, TermSeo } from '@/lib/types'

const { posts, terms, postTerms, media } = schema

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface ImageRef {
  id: number
  url: string
  width: number | null
  height: number | null
  alt: string
}

export interface TermRef {
  id: number
  taxonomy: 'category' | 'tag'
  name: string
  slug: string
  path: string
  parentId: number | null
  description: string
  count: number
  seo: TermSeo
}

export interface PostSummary {
  id: number
  type: 'post' | 'page'
  title: string
  slug: string
  path: string
  excerpt: string
  hasManualExcerpt: boolean
  publishedAt: Date
  updatedAt: Date
  wordCount: number
  readingMinutes: number
  sticky: boolean
  image: ImageRef | null
  category: TermRef | null
}

export interface PostFull extends PostSummary {
  content: string
  template: string
  status: string
  categories: TermRef[]
  tags: TermRef[]
  seo: PostSeo
  faq: FaqItem[]
  authorId: number | null
  parentId: number | null
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export const postPath = (slug: string) => `/${slug}/`

function publishedWhere(type: 'post' | 'page' = 'post'): SQL {
  return and(eq(posts.type, type), eq(posts.status, 'publish'), lte(posts.publishedAt, new Date()))!
}

/** All categories and tags with published-post counts and URL paths. One query per request. */
export const getTaxonomies = cache(async () => {
  const empty = {
    categories: [] as TermRef[],
    tags: [] as TermRef[],
    byId: new Map<number, TermRef>(),
  }
  if (!isDatabaseConfigured()) return empty
  const db = getDb()
  const rows = await db
    .select({
      id: terms.id,
      taxonomy: terms.taxonomy,
      name: terms.name,
      slug: terms.slug,
      parentId: terms.parentId,
      description: terms.description,
      seo: terms.seo,
      count: sql<number>`count(${posts.id}) filter (where ${posts.status} = 'publish' and ${posts.type} = 'post' and ${posts.publishedAt} <= now())`.mapWith(
        Number,
      ),
    })
    .from(terms)
    .leftJoin(postTerms, eq(postTerms.termId, terms.id))
    .leftJoin(posts, eq(posts.id, postTerms.postId))
    .groupBy(terms.id)
    .orderBy(asc(terms.name))

  const raw = new Map(rows.map((r) => [r.id, r]))
  const chain = (id: number): string[] => {
    const out: string[] = []
    let cur = raw.get(id)
    let guard = 0
    while (cur && guard++ < 10) {
      out.unshift(cur.slug)
      cur = cur.parentId ? raw.get(cur.parentId) : undefined
    }
    return out
  }
  for (const r of rows) {
    const ref: TermRef = {
      id: r.id,
      taxonomy: r.taxonomy === 'tag' ? 'tag' : 'category',
      name: r.name,
      slug: r.slug,
      parentId: r.parentId,
      description: r.description,
      seo: r.seo ?? {},
      count: r.count,
      path: r.taxonomy === 'tag' ? `/tag/${r.slug}/` : `/category/${chain(r.id).join('/')}/`,
    }
    empty.byId.set(ref.id, ref)
    if (ref.taxonomy === 'tag') empty.tags.push(ref)
    else empty.categories.push(ref)
  }
  return empty
})

/** IDs of a category and all of its descendants (WordPress includes child categories in archives). */
export async function categoryWithDescendants(id: number): Promise<number[]> {
  const { categories } = await getTaxonomies()
  const out = new Set([id])
  let grew = true
  while (grew) {
    grew = false
    for (const c of categories) {
      if (c.parentId && out.has(c.parentId) && !out.has(c.id)) {
        out.add(c.id)
        grew = true
      }
    }
  }
  return [...out]
}

type PostRow = typeof posts.$inferSelect

async function hydrate(rows: PostRow[], full: boolean): Promise<PostFull[]> {
  if (!rows.length) return []
  const db = getDb()
  const ids = rows.map((r) => r.id)
  const imageIds = [...new Set(rows.map((r) => r.featuredImageId).filter((v): v is number => !!v))]
  const [imgs, links, tax] = await Promise.all([
    imageIds.length ? db.select().from(media).where(inArray(media.id, imageIds)) : Promise.resolve([]),
    db.select().from(postTerms).where(inArray(postTerms.postId, ids)),
    getTaxonomies(),
  ])
  const imgMap = new Map(imgs.map((m) => [m.id, m]))
  const termsByPost = new Map<number, TermRef[]>()
  for (const l of links) {
    const t = tax.byId.get(l.termId)
    if (!t) continue
    const list = termsByPost.get(l.postId) ?? []
    list.push(t)
    termsByPost.set(l.postId, list)
  }

  return rows.map((r) => {
    const all = (termsByPost.get(r.id) ?? []).sort((a, b) => a.name.localeCompare(b.name))
    const categories = all.filter((t) => t.taxonomy === 'category')
    const tags = all.filter((t) => t.taxonomy === 'tag')
    const primary = categories.find((c) => c.id === r.primaryCategoryId) ?? categories[0] ?? null
    const img = r.featuredImageId ? imgMap.get(r.featuredImageId) : undefined
    const manual = Boolean(r.excerpt?.trim())
    return {
      id: r.id,
      type: r.type === 'page' ? 'page' : 'post',
      title: r.title,
      slug: r.slug,
      path: postPath(r.slug),
      excerpt: manual ? r.excerpt.trim() : excerptFromHtml(r.content),
      hasManualExcerpt: manual,
      publishedAt: r.publishedAt ?? r.createdAt,
      updatedAt: r.updatedAt,
      wordCount: r.wordCount,
      readingMinutes: readingMinutes(r.wordCount),
      sticky: r.sticky,
      image: img ? { id: img.id, url: img.url, width: img.width, height: img.height, alt: img.alt } : null,
      category: primary,
      content: full ? r.content : '',
      template: r.template,
      status: r.status,
      categories,
      tags,
      seo: r.seo ?? {},
      faq: r.faq ?? [],
      authorId: r.authorId,
      parentId: r.parentId,
    }
  })
}

/* ------------------------------------------------------------------ */
/* Public queries                                                      */
/* ------------------------------------------------------------------ */

/** A published post or page by slug. */
export const getPublishedBySlug = cache(async (slug: string): Promise<PostFull | null> => {
  if (!isDatabaseConfigured()) return null
  const db = getDb()
  const rows = await db
    .select()
    .from(posts)
    .where(and(eq(posts.slug, slug), eq(posts.status, 'publish'), lte(posts.publishedAt, new Date())))
    .limit(1)
  const [post] = await hydrate(rows, true)
  return post ?? null
})

export async function getPublishedByWpId(wpId: number) {
  if (!isDatabaseConfigured()) return null
  const db = getDb()
  const [row] = await db
    .select({ slug: posts.slug })
    .from(posts)
    .where(and(eq(posts.wpId, wpId), eq(posts.status, 'publish')))
    .limit(1)
  return row ?? null
}

export interface ListOptions {
  page?: number
  perPage: number
  categoryIds?: number[]
  tagId?: number
  search?: string
  excludeIds?: number[]
}

export async function listPublishedPosts(opts: ListOptions): Promise<{ items: PostSummary[]; total: number }> {
  if (!isDatabaseConfigured()) return { items: [], total: 0 }
  const db = getDb()
  const conds: SQL[] = [publishedWhere('post')]
  if (opts.categoryIds?.length) {
    conds.push(
      inArray(
        posts.id,
        db.select({ id: postTerms.postId }).from(postTerms).where(inArray(postTerms.termId, opts.categoryIds)),
      ),
    )
  }
  if (opts.tagId) {
    conds.push(
      inArray(posts.id, db.select({ id: postTerms.postId }).from(postTerms).where(eq(postTerms.termId, opts.tagId))),
    )
  }
  if (opts.search?.trim()) {
    const q = `%${opts.search.trim().replace(/[%_]/g, '\\$&')}%`
    conds.push(or(ilike(posts.title, q), ilike(posts.content, q), ilike(posts.excerpt, q))!)
  }
  if (opts.excludeIds?.length) conds.push(notInArray(posts.id, opts.excludeIds))
  const where = and(...conds)
  const page = Math.max(1, opts.page ?? 1)
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(posts)
      .where(where)
      .orderBy(desc(posts.publishedAt), desc(posts.id))
      .limit(opts.perPage)
      .offset((page - 1) * opts.perPage),
    db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(posts).where(where),
  ])
  return { items: await hydrate(rows, false), total }
}

/** Featured: the newest sticky post, otherwise the newest post (same rule as the theme). */
export const getFeaturedPost = cache(async (): Promise<PostSummary | null> => {
  if (!isDatabaseConfigured()) return null
  const db = getDb()
  const sticky = await db
    .select()
    .from(posts)
    .where(and(publishedWhere('post'), eq(posts.sticky, true)))
    .orderBy(desc(posts.publishedAt))
    .limit(1)
  const rows = sticky.length
    ? sticky
    : await db.select().from(posts).where(publishedWhere('post')).orderBy(desc(posts.publishedAt)).limit(1)
  const [post] = await hydrate(rows, false)
  return post ?? null
})

export const getRecentPosts = cache(async (limit: number, excludeId = 0): Promise<PostSummary[]> => {
  const { items } = await listPublishedPosts({ perPage: limit, excludeIds: excludeId ? [excludeId] : [] })
  return items
})

/** Shared-category posts first, then the newest posts to fill the gaps (theme behaviour). */
export async function getRelatedPosts(post: PostFull, limit = 3): Promise<PostSummary[]> {
  const catIds = post.categories.map((c) => c.id)
  const first = catIds.length
    ? (await listPublishedPosts({ perPage: limit, categoryIds: catIds, excludeIds: [post.id] })).items
    : []
  if (first.length >= limit) return first
  const more = await listPublishedPosts({
    perPage: limit - first.length,
    excludeIds: [post.id, ...first.map((p) => p.id)],
  })
  return [...first, ...more.items]
}

export async function getAdjacentPosts(post: PostFull): Promise<{ prev: PostSummary | null; next: PostSummary | null }> {
  if (!isDatabaseConfigured()) return { prev: null, next: null }
  const db = getDb()
  const [prevRows, nextRows] = await Promise.all([
    db
      .select()
      .from(posts)
      .where(and(publishedWhere('post'), lt(posts.publishedAt, post.publishedAt), ne(posts.id, post.id)))
      .orderBy(desc(posts.publishedAt))
      .limit(1),
    db
      .select()
      .from(posts)
      .where(and(publishedWhere('post'), gt(posts.publishedAt, post.publishedAt), ne(posts.id, post.id)))
      .orderBy(asc(posts.publishedAt))
      .limit(1),
  ])
  const [prev] = await hydrate(prevRows, false)
  const [next] = await hydrate(nextRows, false)
  return { prev: prev ?? null, next: next ?? null }
}

/** Every published post/page for sitemaps, feeds and llms.txt. */
export async function getAllPublished(type: 'post' | 'page', limit = 5000): Promise<PostFull[]> {
  if (!isDatabaseConfigured()) return []
  const db = getDb()
  const rows = await db
    .select()
    .from(posts)
    .where(publishedWhere(type))
    .orderBy(desc(posts.publishedAt))
    .limit(limit)
  return hydrate(rows, true)
}

/** Slugs to prerender at build time. */
export async function getPublishedSlugs(): Promise<string[]> {
  if (!isDatabaseConfigured()) return []
  try {
    const db = getDb()
    const rows = await db
      .select({ slug: posts.slug })
      .from(posts)
      .where(and(eq(posts.status, 'publish'), lte(posts.publishedAt, new Date())))
    return rows.map((r) => r.slug)
  } catch {
    return []
  }
}

/** Width/height/alt of uploaded images referenced in content (prevents layout shift). */
export async function getMediaInfoForHtml(html: string) {
  const urls = [...html.matchAll(/<img\b[^>]*?\ssrc="([^"]+)"/gi)].map((m) => m[1])
  const map = new Map<string, { width: number | null; height: number | null; alt: string }>()
  if (!urls.length || !isDatabaseConfigured()) return map
  const rows = await getDb()
    .select({ url: media.url, width: media.width, height: media.height, alt: media.alt })
    .from(media)
    .where(inArray(media.url, [...new Set(urls)].slice(0, 200)))
  for (const r of rows) map.set(r.url, { width: r.width, height: r.height, alt: r.alt })
  return map
}

/** Any post/page by id regardless of status (draft previews in the admin). */
export async function getPostForPreview(id: number): Promise<PostFull | null> {
  if (!isDatabaseConfigured()) return null
  const rows = await getDb().select().from(posts).where(eq(posts.id, id)).limit(1)
  const [post] = await hydrate(rows, true)
  return post ?? null
}
