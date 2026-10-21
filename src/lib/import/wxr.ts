/**
 * Browser-side parser for WordPress export files (Tools → Export → All content).
 * Produces the same normalized items as the REST importer, including Yoast meta
 * (focus keyphrase, title, description, robots, social, cornerstone, primary category).
 */
import type { NormalizedItem, NormalizedTerm } from './wordpress'

const WP = 'http://wordpress.org/export/1.2/'

function text(el: Element | null | undefined): string {
  return el?.textContent ?? ''
}

/** Direct child by qualified tag name (XML DOM keeps prefixes, e.g. "wp:post_id"). */
function child(el: Element, tag: string): Element | null {
  for (const c of Array.from(el.children)) if (c.tagName === tag) return c
  return null
}

function children(el: Element, tag: string): Element[] {
  return Array.from(el.children).filter((c) => c.tagName === tag)
}

export interface WxrParseResult {
  site: { name: string; description: string; link: string }
  terms: NormalizedTerm[]
  items: NormalizedItem[]
  skipped: number
}

export function parseWxr(xml: string): WxrParseResult {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.querySelector('parsererror')) throw new Error('This file is not a valid WordPress export (XML).')
  const channel = doc.querySelector('channel')
  if (!channel) throw new Error('No <channel> found — is this a WordPress export file?')
  void WP

  const site = {
    name: text(child(channel, 'title')),
    description: text(child(channel, 'description')),
    link: text(child(channel, 'link')),
  }

  const terms: NormalizedTerm[] = []
  for (const c of children(channel, 'wp:category')) {
    terms.push({
      taxonomy: 'category',
      name: text(child(c, 'wp:cat_name')),
      slug: decodeURIComponent(text(child(c, 'wp:category_nicename'))),
      parentSlug: text(child(c, 'wp:category_parent')) || undefined,
      description: text(child(c, 'wp:category_description')),
      wpId: Number(text(child(c, 'wp:term_id'))) || undefined,
    })
  }
  for (const t of children(channel, 'wp:tag')) {
    terms.push({
      taxonomy: 'tag',
      name: text(child(t, 'wp:tag_name')),
      slug: decodeURIComponent(text(child(t, 'wp:tag_slug'))),
      description: text(child(t, 'wp:tag_description')),
      wpId: Number(text(child(t, 'wp:term_id'))) || undefined,
    })
  }

  const rawItems = children(channel, 'item')
  const attachments = new Map<number, { url: string; alt: string; title: string }>()
  const meta = (item: Element) => {
    const out: Record<string, string> = {}
    for (const m of children(item, 'wp:postmeta')) out[text(child(m, 'wp:meta_key'))] = text(child(m, 'wp:meta_value'))
    return out
  }
  for (const it of rawItems) {
    if (text(child(it, 'wp:post_type')) !== 'attachment') continue
    const m = meta(it)
    attachments.set(Number(text(child(it, 'wp:post_id'))), {
      url: text(child(it, 'wp:attachment_url')),
      alt: m._wp_attachment_image_alt || '',
      title: text(child(it, 'title')),
    })
  }

  const items: NormalizedItem[] = []
  let skipped = 0
  for (const it of rawItems) {
    const type = text(child(it, 'wp:post_type'))
    const status = text(child(it, 'wp:status'))
    if ((type !== 'post' && type !== 'page') || status === 'trash' || status === 'auto-draft' || status === 'inherit') {
      if (type !== 'attachment' && type !== 'nav_menu_item') skipped++
      continue
    }
    const m = meta(it)
    const cats: { slug: string; name: string }[] = []
    const tags: { slug: string; name: string }[] = []
    for (const c of children(it, 'category')) {
      const domain = c.getAttribute('domain')
      const entry = { slug: decodeURIComponent(c.getAttribute('nicename') || ''), name: c.textContent || '' }
      if (domain === 'category') cats.push(entry)
      if (domain === 'post_tag') tags.push(entry)
    }
    const thumb = attachments.get(Number(m._thumbnail_id))
    const primaryId = Number(m._yoast_wpseo_primary_category)
    const primaryTerm = primaryId ? terms.find((t) => t.taxonomy === 'category' && t.wpId === primaryId) : undefined
    const date = text(child(it, 'wp:post_date_gmt'))
    items.push({
      wpId: Number(text(child(it, 'wp:post_id'))),
      type,
      status,
      title: text(child(it, 'title')),
      slug: decodeURIComponent(text(child(it, 'wp:post_name'))),
      content: text(child(it, 'content:encoded')),
      raw: true,
      excerpt: text(child(it, 'excerpt:encoded')),
      date: date && !date.startsWith('0000') ? date.replace(' ', 'T') + 'Z' : text(child(it, 'wp:post_date')).replace(' ', 'T'),
      modified: '',
      sticky: text(child(it, 'wp:is_sticky')) === '1',
      menuOrder: Number(text(child(it, 'wp:menu_order'))) || 0,
      template: m._wp_page_template || '',
      categories: cats,
      tags,
      featuredImage: thumb ? { url: thumb.url, alt: thumb.alt, title: thumb.title } : undefined,
      link: text(child(it, 'link')),
      yoast: {
        title: m._yoast_wpseo_title,
        metadesc: m._yoast_wpseo_metadesc,
        focuskw: m._yoast_wpseo_focuskw,
        noindex: m['_yoast_wpseo_meta-robots-noindex'] === '1',
        nofollow: m['_yoast_wpseo_meta-robots-nofollow'] === '1',
        canonical: m._yoast_wpseo_canonical,
        ogTitle: m['_yoast_wpseo_opengraph-title'],
        ogDescription: m['_yoast_wpseo_opengraph-description'],
        ogImage: m['_yoast_wpseo_opengraph-image'],
        twitterTitle: m['_yoast_wpseo_twitter-title'],
        twitterDescription: m['_yoast_wpseo_twitter-description'],
        twitterImage: m['_yoast_wpseo_twitter-image'],
        cornerstone: m._yoast_wpseo_is_cornerstone === '1',
        primaryCategorySlug: primaryTerm?.slug,
        breadcrumbTitle: m._yoast_wpseo_bctitle,
        schemaPageType: m._yoast_wpseo_schema_page_type,
        schemaArticleType: m._yoast_wpseo_schema_article_type,
      },
    } as NormalizedItem)
  }
  return { site, terms, items, skipped }
}
