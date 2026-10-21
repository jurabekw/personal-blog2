import 'server-only'
import type { AllSettings } from '@/lib/settings-defaults'
import type { PostFull, PostSummary } from '@/lib/data/posts'
import { stripTags } from '@/lib/content/text'
import { abs, type ResolvedSeo } from './resolve'

export interface Crumb {
  label: string
  href?: string
}

type Node = Record<string, unknown>

function sameAs(settings: AllSettings): string[] {
  const s = settings.seo.social
  const list = [s.facebook, s.instagram, s.linkedin, s.youtube, s.telegram, ...s.other]
  if (s.twitterUsername) list.push(`https://x.com/${s.twitterUsername.replace(/^@/, '')}`)
  for (const so of settings.appearance.author.socials) list.push(so.url)
  return [...new Set(list.filter((u) => /^https?:\/\//.test(u || '')))]
}

/** Site-wide nodes: WebSite + Person (or Organization). */
function siteNodes(settings: AllSettings, siteUrl: string): { nodes: Node[]; publisherId: string; personId: string } {
  const rep = settings.seo.siteRepresentation
  const author = settings.appearance.author
  const personId = `${siteUrl}/#/schema/person/main`
  const orgId = `${siteUrl}/#organization`
  const websiteId = `${siteUrl}/#website`
  const photo = abs(siteUrl, rep.personImage || author.photoUrl || '/images/profile.png')

  const person: Node = {
    '@type': 'Person',
    '@id': personId,
    name: rep.personName || author.name,
    description: rep.personDescription || author.bio || undefined,
    jobTitle: rep.personJobTitle || author.role || undefined,
    image: { '@type': 'ImageObject', '@id': `${siteUrl}/#/schema/person/image`, url: photo, contentUrl: photo, caption: rep.personName || author.name },
    url: author.aboutUrl ? abs(siteUrl, author.aboutUrl) : siteUrl + '/',
    sameAs: sameAs(settings),
  }
  const nodes: Node[] = []
  let publisherId = personId
  if (rep.type === 'organization' && rep.orgName) {
    const logo = abs(siteUrl, rep.orgLogo || settings.general.logoUrl || '')
    nodes.push({
      '@type': 'Organization',
      '@id': orgId,
      name: rep.orgName,
      alternateName: rep.orgAlternateName || undefined,
      url: siteUrl + '/',
      logo: logo ? { '@type': 'ImageObject', '@id': `${siteUrl}/#/schema/logo/image/`, url: logo, contentUrl: logo, caption: rep.orgName } : undefined,
      image: logo ? { '@id': `${siteUrl}/#/schema/logo/image/` } : undefined,
      sameAs: sameAs(settings),
    })
    publisherId = orgId
  }
  nodes.push(person)
  nodes.unshift({
    '@type': 'WebSite',
    '@id': websiteId,
    url: siteUrl + '/',
    name: settings.general.siteName,
    description: settings.general.tagline,
    publisher: { '@id': publisherId },
    inLanguage: settings.general.language,
    potentialAction: [
      {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${siteUrl}/search/?q={search_term_string}` },
        'query-input': { '@type': 'PropertyValueSpecification', valueRequired: true, valueName: 'search_term_string' },
      },
    ],
  })
  return { nodes, publisherId, personId }
}

function breadcrumbNode(url: string, crumbs: Crumb[], siteUrl: string, current: string): Node {
  const items = crumbs.map((c, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: c.label,
    ...(c.href ? { item: abs(siteUrl, c.href) } : {}),
  }))
  if (items.length && !crumbs[crumbs.length - 1].href) items[items.length - 1].name = current || items[items.length - 1].name
  return { '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`, itemListElement: items }
}

export function buildGraph(opts: {
  settings: AllSettings
  siteUrl: string
  seo: ResolvedSeo
  url: string
  crumbs?: Crumb[]
  pageType?: string | string[]
  post?: PostFull
  listing?: PostSummary[]
}): Node {
  const { settings, siteUrl, seo, url, crumbs, post } = opts
  const site = siteNodes(settings, siteUrl)
  const graph: Node[] = [...site.nodes]
  const lang = settings.general.language
  const webpageId = url

  let types: string[] = Array.isArray(opts.pageType) ? opts.pageType : [opts.pageType || 'WebPage']
  if (post?.faq?.length && !types.includes('FAQPage')) types = [...types, 'FAQPage']

  const webpage: Node = {
    '@type': types.length === 1 ? types[0] : types,
    '@id': webpageId,
    url,
    name: seo.title,
    isPartOf: { '@id': `${siteUrl}/#website` },
    description: seo.description || undefined,
    inLanguage: lang,
    potentialAction: [{ '@type': 'ReadAction', target: [url] }],
  }

  if (post) {
    webpage.datePublished = post.publishedAt.toISOString()
    webpage.dateModified = post.updatedAt.toISOString()
    if (post.image) {
      const img = abs(siteUrl, post.image.url)
      graph.push({
        '@type': 'ImageObject',
        inLanguage: lang,
        '@id': `${url}#primaryimage`,
        url: img,
        contentUrl: img,
        width: post.image.width ?? undefined,
        height: post.image.height ?? undefined,
        caption: post.image.alt || undefined,
      })
      webpage.primaryImageOfPage = { '@id': `${url}#primaryimage` }
      webpage.image = { '@id': `${url}#primaryimage` }
      webpage.thumbnailUrl = img
    }
    if (post.type === 'page' && post.template === 'about') {
      webpage.about = { '@id': site.personId }
      webpage.mainEntity = { '@id': site.personId }
    }
  }

  if (crumbs?.length && settings.seo.breadcrumbs.enabled) {
    webpage.breadcrumb = { '@id': `${url}#breadcrumb` }
    graph.push(breadcrumbNode(url, crumbs, siteUrl, post?.seo?.breadcrumbTitle || post?.title || ''))
  }

  // Article (posts only, unless the article type is "None").
  const articleType = post?.seo?.schemaArticleType || settings.seo.schema.articleType
  if (post && post.type === 'post' && articleType !== 'None') {
    graph.push({
      '@type': articleType || 'Article',
      '@id': `${url}#article`,
      isPartOf: { '@id': webpageId },
      author: { name: settings.appearance.author.name, '@id': site.personId },
      headline: post.title.slice(0, 110),
      datePublished: post.publishedAt.toISOString(),
      dateModified: post.updatedAt.toISOString(),
      mainEntityOfPage: { '@id': webpageId },
      wordCount: post.wordCount,
      publisher: { '@id': site.publisherId },
      image: post.image ? { '@id': `${url}#primaryimage` } : undefined,
      thumbnailUrl: post.image ? abs(siteUrl, post.image.url) : undefined,
      keywords: post.tags.map((t) => t.name),
      articleSection: post.categories.map((c) => c.name),
      inLanguage: settings.general.language,
      description: seo.description || undefined,
    })
  }

  // FAQ (Yoast FAQ block equivalent).
  if (post?.faq?.length) {
    const ids = post.faq.map((_, i) => `${url}#faq-question-${i + 1}`)
    webpage.mainEntity = ids.map((id) => ({ '@id': id }))
    post.faq.forEach((q, i) => {
      graph.push({
        '@type': 'Question',
        '@id': ids[i],
        position: i + 1,
        url: `${url}#faq-question-${i + 1}`,
        name: q.question,
        answerCount: 1,
        acceptedAnswer: { '@type': 'Answer', text: stripTags(q.answer), inLanguage: lang },
        inLanguage: lang,
      })
    })
  }

  // Archive / blog listings: CollectionPage with an ItemList of posts.
  if (opts.listing?.length) {
    webpage.mainEntity = {
      '@type': 'ItemList',
      itemListElement: opts.listing.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(siteUrl, p.path), name: p.title })),
    }
  }

  graph.splice(1, 0, webpage)
  return { '@context': 'https://schema.org', '@graph': graph }
}
