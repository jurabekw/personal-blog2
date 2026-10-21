import { NextResponse } from 'next/server'
import { or, eq, like } from 'drizzle-orm'
import { getDb, isDatabaseConfigured, schema } from '@/lib/db'

/**
 * Old /wp-content/uploads/... image URLs (Google Images, external links) → the
 * re-hosted file. WordPress size variants (photo-300x200.jpg) map to the original.
 */
export async function GET(request: Request, ctx: RouteContext<'/api/legacy-upload/[...path]'>) {
  const { path } = await ctx.params
  const rel = path.map((p) => decodeURIComponent(p)).join('/')
  if (!isDatabaseConfigured() || !rel) return new NextResponse('Not found', { status: 404 })
  const original = rel.replace(/-\d+x\d+(\.[a-z0-9]+)$/i, '$1').replace(/-scaled(\.[a-z0-9]+)$/i, '$1')
  const db = getDb()
  const [row] = await db
    .select({ url: schema.media.url })
    .from(schema.media)
    .where(
      or(
        like(schema.media.legacyUrl, `%/wp-content/uploads/${rel}`),
        like(schema.media.legacyUrl, `%/wp-content/uploads/${original}`),
        eq(schema.media.filename, original.split('/').pop() || ''),
      ),
    )
    .limit(1)
  if (!row) return new NextResponse('Not found', { status: 404 })
  return NextResponse.redirect(new URL(row.url, new URL(request.url).origin), 301)
}
