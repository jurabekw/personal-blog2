import 'server-only'
import type { Metadata } from 'next'
import type { AllSettings } from '@/lib/settings-defaults'
import type { PostFull, TermRef } from '@/lib/data/posts'
import { formatDate } from '@/lib/format'
import { truncate } from '@/lib/content/text'
import { replaceVars, type TemplateContext } from './templates'

export type SeoKind = 'home' | 'blog' | 'post' | 'page' | 'category' | 'tag' | 'search' | 'notFound'

export interface SeoInput {
  kind: SeoKind
  /** Canonical path of page 1, e.g. "/blog/" or "/category/marketing/". */
  path: string
  page?: number
  pageTotal?: number
  post?: PostFull
  term?: TermRef
  search?: string
}

export interface ResolvedSeo {
  title: string
  description: string
  canonical: string
  index: boolean
  follow: boolean
  noimageindex: boolean
  noarchive: boolean
  nosnippet: boolean
  ogType: 'website' | 'article'
  ogTitle: string
  ogDescription: string
  ogImage: { url: string; width?: number; height?: number; alt?: string }
  twitterTitle: string
  twitterDescription: string
  twitterImage: string
}

export const abs = (siteUrl: string, url: string) => (!url ? '' : /^https?:\/\//i.test(url) ? url : `${siteUrl}${url.startsWith('/') ? '' : '/'}${url}`)

export function pagedPath(path: string, page?: number): string {
  return page && page > 1 ? `${path}page/${page}/` : path
}

function robotsChoice(choice: string | undefined, typeDefaultNoindex: boolean): boolean {
  if (choice === 'noindex') return false
  if (choice === 'index') return true
  return !typeDefaultNoindex
}

export function resolveSeo(input: SeoInput, settings: AllSettings, siteUrl: string): ResolvedSeo {
  const s = settings.seo
  const g = settings.general
  const base: TemplateContext = {
    sitename: g.siteName,
    sitedesc: g.tagline,
    sep: s.separator,
    page: input.page,
    pageTotal: input.pageTotal,
    blogtitle: settings.appearance.blogTitle,
    author: settings.appearance.author.name,
  }
  let titleTpl = ''
  let descTpl = ''
  let ctx: TemplateContext = base
  let index = true
  let follow = true
  let noimageindex = false
  let noarchive = false
  let nosnippet = false
  let canonical = abs(siteUrl, pagedPath(input.path, input.page))
  let ogType: 'website' | 'article' = 'website'
  let image: ResolvedSeo['ogImage'] | null = null
  let ogTitle = ''
  let ogDescription = ''
  let twitterTitle = ''
  let twitterDescription = ''
  let twitterImage = ''

  switch (input.kind) {
    case 'home':
      titleTpl = s.titles.home
      descTpl = s.descriptions.home || '%%sitedesc%%'
      break
    case 'blog':
      titleTpl = s.titles.blog
      descTpl = s.descriptions.blog || settings.appearance.blogIntro
      break
    case 'post':
    case 'page': {
      const p = input.post!
      const seo = p.seo || {}
      ctx = {
        ...base,
        title: p.title,
        excerpt: p.excerpt,
        category: p.categories.map((c) => c.name).join(', '),
        primaryCategory: p.category?.name,
        tag: p.tags.map((c) => c.name).join(', '),
        date: formatDate(p.publishedAt, g.language, g.timezone),
        modified: formatDate(p.updatedAt, g.language, g.timezone),
        focuskw: seo.focusKeyphrase,
      }
      titleTpl = seo.title || s.titles[input.kind]
      descTpl = seo.metaDescription || s.descriptions[input.kind]
      index = robotsChoice(seo.robotsIndex, s.noindex[input.kind])
      follow = !seo.nofollow
      noimageindex = !!seo.noimageindex
      noarchive = !!seo.noarchive
      nosnippet = !!seo.nosnippet
      if (seo.canonical) canonical = abs(siteUrl, seo.canonical)
      if (input.kind === 'post') ogType = 'article'
      if (seo.ogImage) image = { url: abs(siteUrl, seo.ogImage) }
      else if (p.image) image = { url: abs(siteUrl, p.image.url), width: p.image.width ?? undefined, height: p.image.height ?? undefined, alt: p.image.alt || p.title }
      ogTitle = seo.ogTitle || ''
      ogDescription = seo.ogDescription || ''
      twitterTitle = seo.twitterTitle || ''
      twitterDescription = seo.twitterDescription || ''
      twitterImage = seo.twitterImage ? abs(siteUrl, seo.twitterImage) : ''
      break
    }
    case 'category':
    case 'tag': {
      const term = input.term!
      const seo = term.seo || {}
      ctx = { ...base, title: term.name, termTitle: term.name, termDescription: term.description }
      titleTpl = seo.title || s.titles[input.kind]
      descTpl = seo.metaDescription || s.descriptions[input.kind]
      index = robotsChoice(seo.robotsIndex, s.noindex[input.kind])
      if (seo.canonical) canonical = abs(siteUrl, seo.canonical)
      if (seo.ogImage) image = { url: abs(siteUrl, seo.ogImage) }
      ogTitle = seo.ogTitle || ''
      ogDescription = seo.ogDescription || ''
      twitterTitle = seo.twitterTitle || ''
      twitterDescription = seo.twitterDescription || ''
      twitterImage = seo.twitterImage ? abs(siteUrl, seo.twitterImage) : ''
      break
    }
    case 'search':
      ctx = { ...base, searchphrase: input.search }
      titleTpl = s.titles.search
      index = false
      canonical = ''
      break
    case 'notFound':
      titleTpl = s.titles.notFound
      index = false
      canonical = ''
      break
  }

  if (settings.reading.discourageSearchEngines) {
    index = false
    follow = false
  }

  const title = replaceVars(titleTpl, ctx) || g.siteName
  let description = replaceVars(descTpl, ctx)
  if (!description && (input.kind === 'post' || input.kind === 'page')) description = input.post!.excerpt
  description = truncate(description, 300)

  if (!image && s.social.defaultOgImage) image = { url: abs(siteUrl, s.social.defaultOgImage) }
  if (!image) {
    const label = input.kind === 'post' ? input.post!.category?.name || '' : ''
    const q = new URLSearchParams({ title: input.kind === 'home' ? g.siteName : stripSite(title, g.siteName, s.separator) })
    if (label) q.set('label', label)
    image = { url: `${siteUrl}/og/?${q.toString()}`, width: 1200, height: 630, alt: title }
  }

  return {
    title,
    description,
    canonical,
    index,
    follow,
    noimageindex,
    noarchive,
    nosnippet,
    ogType,
    ogTitle: replaceVars(ogTitle, ctx) || title,
    ogDescription: replaceVars(ogDescription, ctx) || description,
    ogImage: image,
    twitterTitle: replaceVars(twitterTitle, ctx) || replaceVars(ogTitle, ctx) || title,
    twitterDescription: replaceVars(twitterDescription, ctx) || replaceVars(ogDescription, ctx) || description,
    twitterImage: twitterImage || image.url,
  }
}

function stripSite(title: string, site: string, sep: string): string {
  const suffix = ` ${sep} ${site}`
  return title.endsWith(suffix) ? title.slice(0, -suffix.length) : title
}

/** Convert resolved SEO into Next.js Metadata. */
export function toMetadata(r: ResolvedSeo, settings: AllSettings, extra?: { post?: PostFull; siteUrl: string }): Metadata {
  const twitterSite = settings.seo.social.twitterUsername
    ? '@' + settings.seo.social.twitterUsername.replace(/^@/, '')
    : undefined
  const post = extra?.post
  return {
    title: { absolute: r.title },
    description: r.description || undefined,
    alternates: {
      ...(r.canonical ? { canonical: r.canonical } : {}),
      types: { 'application/rss+xml': [{ url: '/feed/', title: `${settings.general.siteName} » Feed` }] },
    },
    robots: {
      index: r.index,
      follow: r.follow,
      noimageindex: r.noimageindex || undefined,
      noarchive: r.noarchive || undefined,
      nosnippet: r.nosnippet || undefined,
      googleBot: r.index
        ? {
            index: true,
            follow: r.follow,
            'max-snippet': r.nosnippet ? 0 : -1,
            'max-image-preview': 'large',
            'max-video-preview': -1,
          }
        : { index: false, follow: r.follow },
    },
    openGraph: {
      type: r.ogType,
      locale: settings.general.locale,
      siteName: settings.general.siteName,
      url: r.canonical || undefined,
      title: r.ogTitle,
      description: r.ogDescription || undefined,
      images: [
        {
          url: r.ogImage.url,
          width: r.ogImage.width,
          height: r.ogImage.height,
          alt: r.ogImage.alt,
        },
      ],
      ...(post && r.ogType === 'article'
        ? {
            publishedTime: post.publishedAt.toISOString(),
            modifiedTime: post.updatedAt.toISOString(),
            section: post.category?.name,
            tags: post.tags.map((t) => t.name),
            authors: [settings.appearance.author.name],
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: r.twitterTitle,
      description: r.twitterDescription || undefined,
      images: [r.twitterImage],
      site: twitterSite,
      creator: twitterSite,
    },
  }
}
