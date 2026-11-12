import type { Metadata } from 'next'
import { notFound, permanentRedirect, redirect } from 'next/navigation'
import { getAdjacentPosts, getMediaInfoForHtml, getPublishedBySlug, getPublishedSlugs, getRelatedPosts } from '@/lib/data/posts'
import { findRedirect } from '@/lib/data/redirects'
import { renderContent } from '@/lib/content/render'
import { sanitizeContent } from '@/lib/content/sanitize'
import { metadataFor, seoFor } from '@/lib/seo/page'
import { buildGraph } from '@/lib/seo/schema'
import { getTranslitConfig } from '@/lib/translit'
import { SinglePage, SinglePost } from '@/components/site/Article'
import type { Crumb } from '@/components/site/parts'
import { localizer, scriptHref, type Script } from '@/lib/alphabet'

type Props = { params: Promise<{ slug: string }> }

export async function slugStaticParams() {
  return (await getPublishedSlugs()).map((slug) => ({ slug }))
}

function decode(slug: string): string {
  try {
    return decodeURIComponent(slug)
  } catch {
    return slug
  }
}

export async function metadataSlug(script: Script, { params }: Props): Promise<Metadata> {
  const slug = decode((await params).slug)
  const post = await getPublishedBySlug(slug)
  if (!post) return { robots: { index: false } }
  return metadataFor({ kind: post.type, path: post.path, post, script })
}

export async function renderSlug(script: Script, { params }: Props) {
  const slug = decode((await params).slug)
  const source = await getPublishedBySlug(slug)

  if (!source) {
    const match = await findRedirect(`/${slug}`)
    if (match && match.statusCode !== 410 && match.target) {
      const target = scriptHref(script, match.target)
      if (match.statusCode === 301 || match.statusCode === 308) permanentRedirect(target)
      redirect(target)
    }
    notFound()
  }

  const { settings: rawSettings, siteUrl, resolved, url } = await seoFor({ kind: source.type, path: source.path, post: source, script })
  const L = localizer(script, getTranslitConfig(rawSettings.alphabets), siteUrl)
  const settings = L.settings(rawSettings)
  const localized = L.post(source)
  const rendered = renderContent(localized.content, {
    media: await getMediaInfoForHtml(source.content),
    tocTitle: settings.appearance.sidebar.toc.title,
  })
  // Localized posts are shared (memoized) objects: build a new one instead of mutating.
  const post = {
    ...localized,
    faq: (localized.faq || [])
      .filter((q) => q.question?.trim() && q.answer?.trim())
      .map((q) => ({ question: q.question, answer: sanitizeContent(q.answer) })),
  }

  const home = settings.seo.breadcrumbs.homeLabel
  const blogCrumb = settings.seo.breadcrumbs.showBlog ? [{ label: settings.appearance.blogTitle, href: '/blog/' }] : []

  if (post.type === 'page') {
    const pageType = post.seo.schemaPageType || (post.template === 'about' ? 'AboutPage' : settings.seo.schema.pageType)
    const graph = buildGraph({
      settings,
      siteUrl,
      seo: resolved,
      url,
      post,
      pageType,
      crumbs: [{ label: home, href: '/' }, { label: post.seo.breadcrumbTitle || post.title }],
    })
    return <SinglePage post={post} html={rendered.html} settings={settings} graph={graph} />
  }

  // Visible breadcrumb matches the theme (Home / Blog / Category); structured data adds the post title.
  const visible: Crumb[] = [{ label: home, href: '/' }, ...blogCrumb]
  if (post.category) visible.push({ label: post.category.name, href: post.category.path })
  const graph = buildGraph({
    settings,
    siteUrl,
    seo: resolved,
    url,
    post,
    pageType: post.seo.schemaPageType || settings.seo.schema.pageType,
    crumbs: [...visible, { label: post.seo.breadcrumbTitle || post.title }],
  })
  const [related, adjacent] = await Promise.all([getRelatedPosts(source, 3), getAdjacentPosts(source)])

  return (
    <SinglePost
      post={post}
      html={rendered.html}
      headings={rendered.headings}
      settings={settings}
      url={url}
      crumbs={visible}
      graph={graph}
      related={L.posts(related)}
      adjacent={{ prev: adjacent.prev ? L.post(adjacent.prev) : null, next: adjacent.next ? L.post(adjacent.next) : null }}
    />
  )
}
