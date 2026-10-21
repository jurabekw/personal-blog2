import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { and, desc, eq } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth'
import { getDb, schema } from '@/lib/db'
import { getMediaInfoForHtml, getPostForPreview, getRelatedPosts } from '@/lib/data/posts'
import { renderContent } from '@/lib/content/render'
import { sanitizeContent } from '@/lib/content/sanitize'
import { excerptFromHtml, wordCountFromHtml, readingMinutes } from '@/lib/content/text'
import { seoFor } from '@/lib/seo/page'
import { SinglePage, SinglePost } from '@/components/site/Article'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Preview', robots: { index: false, follow: false } }

/** Admin-only preview of drafts and unsaved changes. */
export default async function DraftPreview({ params, searchParams }: PageProps<'/draft-preview/[id]'>) {
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login/')
  const id = Number((await params).id)
  const sp = await searchParams
  const post = Number.isInteger(id) ? await getPostForPreview(id) : null
  if (!post) notFound()

  if (sp.changes) {
    const [rev] = await getDb()
      .select()
      .from(schema.revisions)
      .where(and(eq(schema.revisions.postId, id), eq(schema.revisions.kind, 'preview'), eq(schema.revisions.authorId, user.id)))
      .orderBy(desc(schema.revisions.createdAt))
      .limit(1)
    if (rev) {
      post.title = rev.title
      post.content = rev.content
      post.excerpt = rev.excerpt || excerptFromHtml(rev.content)
      post.hasManualExcerpt = Boolean(rev.excerpt)
      post.wordCount = wordCountFromHtml(rev.content)
      post.readingMinutes = readingMinutes(post.wordCount)
    }
  }

  const { settings, url } = await seoFor({ kind: post.type, path: post.path, post })
  const rendered = renderContent(post.content, { media: await getMediaInfoForHtml(post.content), tocTitle: settings.appearance.sidebar.toc.title })
  post.faq = post.faq.map((q) => ({ question: q.question, answer: sanitizeContent(q.answer) }))
  const banner = (
    <div style={{ background: '#1d2327', color: '#fff', textAlign: 'center', padding: '8px 12px', fontSize: 13 }}>
      Preview{post.status !== 'publish' ? ` — this ${post.type} is not published (${post.status})` : sp.changes ? ' of unsaved changes' : ''}.{' '}
      <a href={`/admin/${post.type === 'page' ? 'pages' : 'posts'}/${post.id}/`} style={{ color: '#72d99a' }}>
        Back to editor
      </a>
    </div>
  )
  if (post.type === 'page') {
    return (
      <>
        {banner}
        <SinglePage post={post} html={rendered.html} settings={settings} graph={{}} />
      </>
    )
  }
  const related = await getRelatedPosts(post, 3)
  return (
    <>
      {banner}
      <SinglePost
        post={post}
        html={rendered.html}
        headings={rendered.headings}
        settings={settings}
        url={url}
        crumbs={[{ label: settings.seo.breadcrumbs.homeLabel, href: '/' }, { label: settings.appearance.blogTitle, href: '/blog/' }]}
        graph={{}}
        related={related}
        adjacent={{ prev: null, next: null }}
      />
    </>
  )
}
