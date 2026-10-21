import 'server-only'
import { and, asc, desc, eq, gt, ilike, inArray, lte, ne, or, sql, type SQL } from 'drizzle-orm'
import { getDb, schema } from '@/lib/db'
import type { MediaItem, TermOption } from '@/lib/admin-types'

const { posts, postTerms, terms, media, users } = schema

export type ListStatus = 'all' | 'publish' | 'scheduled' | 'draft' | 'pending' | 'trash' | 'cornerstone'

export interface AdminPostRow {
  id: number
  title: string
  slug: string
  status: string
  sticky: boolean
  template: string
  publishedAt: string | null
  updatedAt: string
  author: string
  categories: { id: number; name: string }[]
  tags: { id: number; name: string }[]
  seoScore: number | null
  readabilityScore: number | null
  focusKeyphrase: string
  cornerstone: boolean
  wordCount: number
  noindex: boolean
}

function statusWhere(status: ListStatus): SQL | undefined {
  const now = new Date()
  switch (status) {
    case 'publish':
      return and(eq(posts.status, 'publish'), lte(posts.publishedAt, now))
    case 'scheduled':
      return and(eq(posts.status, 'publish'), gt(posts.publishedAt, now))
    case 'draft':
    case 'pending':
    case 'trash':
      return eq(posts.status, status)
    case 'cornerstone':
      return and(ne(posts.status, 'trash'), sql`(${posts.seo}->>'cornerstone')::boolean is true`)
    default:
      return ne(posts.status, 'trash')
  }
}

export async function adminStatusCounts(type: 'post' | 'page') {
  const db = getDb()
  const [row] = await db
    .select({
      all: sql<number>`count(*) filter (where ${posts.status} <> 'trash')`.mapWith(Number),
      publish: sql<number>`count(*) filter (where ${posts.status} = 'publish' and ${posts.publishedAt} <= now())`.mapWith(Number),
      scheduled: sql<number>`count(*) filter (where ${posts.status} = 'publish' and ${posts.publishedAt} > now())`.mapWith(Number),
      draft: sql<number>`count(*) filter (where ${posts.status} = 'draft')`.mapWith(Number),
      pending: sql<number>`count(*) filter (where ${posts.status} = 'pending')`.mapWith(Number),
      trash: sql<number>`count(*) filter (where ${posts.status} = 'trash')`.mapWith(Number),
      cornerstone: sql<number>`count(*) filter (where ${posts.status} <> 'trash' and (${posts.seo}->>'cornerstone')::boolean is true)`.mapWith(Number),
    })
    .from(posts)
    .where(eq(posts.type, type))
  return row
}

export async function adminListPosts(opts: {
  type: 'post' | 'page'
  status: ListStatus
  search?: string
  categoryId?: number
  seo?: 'good' | 'ok' | 'bad' | 'na'
  page: number
  perPage: number
}): Promise<{ rows: AdminPostRow[]; total: number }> {
  const db = getDb()
  const conds: SQL[] = [eq(posts.type, opts.type)]
  const st = statusWhere(opts.status)
  if (st) conds.push(st)
  if (opts.search?.trim()) {
    const q = `%${opts.search.trim().replace(/[%_]/g, '\\$&')}%`
    conds.push(or(ilike(posts.title, q), ilike(posts.slug, q), ilike(posts.content, q))!)
  }
  if (opts.categoryId) {
    conds.push(inArray(posts.id, db.select({ id: postTerms.postId }).from(postTerms).where(eq(postTerms.termId, opts.categoryId))))
  }
  if (opts.seo === 'good') conds.push(sql`${posts.seoScore} >= 76`)
  if (opts.seo === 'ok') conds.push(sql`${posts.seoScore} between 55 and 75`)
  if (opts.seo === 'bad') conds.push(sql`${posts.seoScore} between 1 and 54`)
  if (opts.seo === 'na') conds.push(sql`${posts.seoScore} is null`)
  const where = and(...conds)
  const order =
    opts.type === 'page'
      ? [asc(posts.menuOrder), asc(posts.title)]
      : [desc(sql`coalesce(${posts.publishedAt}, ${posts.createdAt})`), desc(posts.id)]
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: posts.id,
        title: posts.title,
        slug: posts.slug,
        status: posts.status,
        sticky: posts.sticky,
        template: posts.template,
        publishedAt: posts.publishedAt,
        updatedAt: posts.updatedAt,
        seoScore: posts.seoScore,
        readabilityScore: posts.readabilityScore,
        seo: posts.seo,
        wordCount: posts.wordCount,
        author: users.name,
      })
      .from(posts)
      .leftJoin(users, eq(users.id, posts.authorId))
      .where(where)
      .orderBy(...order)
      .limit(opts.perPage)
      .offset((Math.max(1, opts.page) - 1) * opts.perPage),
    db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(posts).where(where),
  ])
  const ids = rows.map((r) => r.id)
  const links = ids.length
    ? await db
        .select({ postId: postTerms.postId, id: terms.id, name: terms.name, taxonomy: terms.taxonomy })
        .from(postTerms)
        .innerJoin(terms, eq(terms.id, postTerms.termId))
        .where(inArray(postTerms.postId, ids))
        .orderBy(asc(terms.name))
    : []
  return {
    total,
    rows: rows.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      status: r.status,
      sticky: r.sticky,
      template: r.template,
      publishedAt: r.publishedAt?.toISOString() ?? null,
      updatedAt: r.updatedAt.toISOString(),
      author: r.author || '—',
      categories: links.filter((l) => l.postId === r.id && l.taxonomy === 'category').map((l) => ({ id: l.id, name: l.name })),
      tags: links.filter((l) => l.postId === r.id && l.taxonomy === 'tag').map((l) => ({ id: l.id, name: l.name })),
      seoScore: r.seoScore,
      readabilityScore: r.readabilityScore,
      focusKeyphrase: r.seo?.focusKeyphrase ?? '',
      cornerstone: Boolean(r.seo?.cornerstone),
      wordCount: r.wordCount,
      noindex: r.seo?.robotsIndex === 'noindex',
    })),
  }
}

export async function adminTerms(taxonomy: 'category' | 'tag'): Promise<TermOption[]> {
  const db = getDb()
  const rows = await db
    .select({
      id: terms.id,
      name: terms.name,
      slug: terms.slug,
      parentId: terms.parentId,
      description: terms.description,
      seo: terms.seo,
      count: sql<number>`count(${posts.id}) filter (where ${posts.status} <> 'trash')`.mapWith(Number),
    })
    .from(terms)
    .leftJoin(postTerms, eq(postTerms.termId, terms.id))
    .leftJoin(posts, eq(posts.id, postTerms.postId))
    .where(eq(terms.taxonomy, taxonomy))
    .groupBy(terms.id)
    .orderBy(asc(terms.name))
  return rows.map((r) => ({ ...r, seo: r.seo ?? {} }))
}

export function toMediaItem(m: typeof media.$inferSelect): MediaItem {
  return {
    id: m.id,
    url: m.url,
    filename: m.filename,
    mimeType: m.mimeType,
    size: m.size,
    width: m.width,
    height: m.height,
    alt: m.alt,
    title: m.title,
    caption: m.caption,
    createdAt: m.createdAt.toISOString(),
  }
}

export async function adminGetPost(id: number) {
  const db = getDb()
  const [row] = await db.select().from(posts).where(eq(posts.id, id)).limit(1)
  if (!row) return null
  const links = await db
    .select({ id: terms.id, name: terms.name, taxonomy: terms.taxonomy })
    .from(postTerms)
    .innerJoin(terms, eq(terms.id, postTerms.termId))
    .where(eq(postTerms.postId, id))
  const image = row.featuredImageId
    ? (await db.select().from(media).where(eq(media.id, row.featuredImageId)).limit(1))[0]
    : undefined
  return {
    post: row,
    categoryIds: links.filter((l) => l.taxonomy === 'category').map((l) => l.id),
    tagNames: links.filter((l) => l.taxonomy === 'tag').map((l) => l.name),
    featuredImage: image ? toMediaItem(image) : null,
  }
}

export async function adminPagesForParent(excludeId?: number) {
  const db = getDb()
  const rows = await db
    .select({ id: posts.id, title: posts.title })
    .from(posts)
    .where(and(eq(posts.type, 'page'), ne(posts.status, 'trash'), excludeId ? ne(posts.id, excludeId) : sql`true`))
    .orderBy(asc(posts.title))
  return rows
}
