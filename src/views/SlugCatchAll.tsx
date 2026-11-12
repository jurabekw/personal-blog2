import { notFound, permanentRedirect, redirect } from 'next/navigation'
import { findRedirect } from '@/lib/data/redirects'
import { getPublishedBySlug } from '@/lib/data/posts'
import { redirectHref, scriptHref, type Script } from '@/lib/alphabet'

type Props = { params: Promise<{ slug: string; rest: string[] }> }

/**
 * Deeper unknown paths: managed redirects first, then old WordPress sub-URLs
 * (/post/amp/, /post/feed/, /post/attachment/x/, /post/2/) back to the post itself.
 */
export async function renderSlugCatchAll(script: Script, { params }: Props): Promise<never> {
  const { slug, rest } = await params
  const path = `/${[slug, ...rest].map((s) => decodeURIComponent(s)).join('/')}`
  const match = await findRedirect(path)
  if (match && match.statusCode !== 410 && match.target) {
    const target = await redirectHref(script, match.target)
    if (match.statusCode === 301 || match.statusCode === 308) permanentRedirect(target)
    redirect(target)
  }
  const tail = rest[0]
  if (['amp', 'feed', 'attachment', 'embed', 'trackback', 'comment-page-1'].includes(tail) || /^\d+$/.test(tail)) {
    const post = await getPublishedBySlug(decodeURIComponent(slug))
    if (post) permanentRedirect(scriptHref(script, post.path))
  }
  notFound()
}
