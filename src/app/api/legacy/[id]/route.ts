import { NextResponse } from 'next/server'
import { getPublishedByWpId } from '@/lib/data/posts'

/** /?p=123 and /?page_id=12 (old WordPress links) → the post's pretty URL. */
export async function GET(request: Request, ctx: RouteContext<'/api/legacy/[id]'>) {
  const { id } = await ctx.params
  const url = new URL(request.url)
  const found = /^\d+$/.test(id) ? await getPublishedByWpId(Number(id)) : null
  return NextResponse.redirect(new URL(found ? `/${found.slug}/` : '/', url.origin), found ? 301 : 302)
}
