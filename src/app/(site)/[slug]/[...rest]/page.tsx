import { notFound, permanentRedirect, redirect } from 'next/navigation'
import { findRedirect } from '@/lib/data/redirects'
import { getPublishedBySlug } from '@/lib/data/posts'

/**
 * Deeper unknown paths: managed redirects first, then old WordPress sub-URLs
 * (/post/amp/, /post/feed/, /post/attachment/x/, /post/2/) back to the post itself.
 */
export default async function CatchAll({ params }: PageProps<'/[slug]/[...rest]'>) {
  const { slug, rest } = await params
  const path = `/${[slug, ...rest].map((s) => decodeURIComponent(s)).join('/')}`
  const match = await findRedirect(path)
  if (match && match.statusCode !== 410 && match.target) {
    if (match.statusCode === 301 || match.statusCode === 308) permanentRedirect(match.target)
    redirect(match.target)
  }
  const tail = rest[0]
  if (['amp', 'feed', 'attachment', 'embed', 'trackback', 'comment-page-1'].includes(tail) || /^\d+$/.test(tail)) {
    const post = await getPublishedBySlug(decodeURIComponent(slug))
    if (post) permanentRedirect(post.path)
  }
  notFound()
}
