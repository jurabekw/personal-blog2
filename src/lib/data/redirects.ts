import 'server-only'
import { eq, sql } from 'drizzle-orm'
import { getDb, isDatabaseConfigured, schema } from '@/lib/db'

/** Normalize a path for redirect matching: leading slash, no trailing slash, lowercase-insensitive. */
export function normalizeRedirectPath(input: string): string {
  let p = (input || '').trim()
  try {
    if (/^https?:\/\//i.test(p)) p = new URL(p).pathname
  } catch {
    /* keep as is */
  }
  p = p.split('#')[0].split('?')[0]
  try {
    p = decodeURI(p)
  } catch {
    /* keep encoded */
  }
  if (!p.startsWith('/')) p = '/' + p
  if (p.length > 1) p = p.replace(/\/+$/, '')
  return p
}

export interface RedirectMatch {
  target: string
  statusCode: number
}

/**
 * Find a redirect for a path. Exact matches win; then a source ending in "/*"
 * matches everything below it (the remainder is appended when the target ends with "/*").
 */
export async function findRedirect(pathname: string): Promise<RedirectMatch | null> {
  if (!isDatabaseConfigured()) return null
  const path = normalizeRedirectPath(pathname)
  const db = getDb()
  try {
    const rows = await db
      .select()
      .from(schema.redirects)
      .where(
        sql`lower(${schema.redirects.source}) = lower(${path}) or (${schema.redirects.source} like '%/*' and lower(${path}) like lower(replace(${schema.redirects.source}, '/*', '')) || '/%')`,
      )
      .limit(5)
    if (!rows.length) return null
    const exact = rows.find((r) => r.source.toLowerCase() === path.toLowerCase())
    const row = exact ?? rows.sort((a, b) => b.source.length - a.source.length)[0]
    let target = row.target
    if (!exact && row.source.endsWith('/*') && target.endsWith('/*')) {
      const rest = path.slice(row.source.length - 2)
      target = target.slice(0, -2) + rest
    }
    // Fire-and-forget hit counter.
    db.update(schema.redirects)
      .set({ hits: sql`${schema.redirects.hits} + 1`, lastHitAt: new Date() })
      .where(eq(schema.redirects.id, row.id))
      .catch(() => {})
    return { target, statusCode: row.statusCode }
  } catch {
    return null
  }
}
