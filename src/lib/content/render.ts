import 'server-only'
import type { Heading } from '@/lib/types'
import { sanitizeContent } from './sanitize'
import { decodeEntities, escapeHtml, slugify, stripTags } from './text'

export interface MediaInfo {
  width: number | null
  height: number | null
  alt?: string
}

export interface RenderOptions {
  /** Known dimensions by image URL, used to add width/height (prevents layout shift). */
  media?: Map<string, MediaInfo>
  /** Collect H2/H3 headings for the "Mundarija" table of contents. */
  withToc?: boolean
  tocTitle?: string
  copyLabel?: string
  copiedLabel?: string
}

export interface RenderedContent {
  html: string
  headings: Heading[]
}

const SRCSET_WIDTHS = [420, 640, 828, 1080, 1200]

function isOptimizable(src: string): boolean {
  return (
    src.startsWith('/uploads/') ||
    src.startsWith('/images/') ||
    /^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\//.test(src)
  )
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'))
  return m ? (m[2] ?? m[3] ?? '') : null
}

/** Convert [jb_copy_box title="..."]text[/jb_copy_box] shortcodes into the stored copy-box markup. */
export function convertCopyBoxShortcodes(html: string): string {
  return html.replace(
    /(?:<p>\s*)?\[jb_copy_box(?:\s+title=(?:"([^"]*)"|'([^']*)'|“([^”]*)”))?\s*\]([\s\S]*?)\[\/jb_copy_box\](?:\s*<\/p>)?/gi,
    (_m, t1, t2, t3, body: string) => {
      const title = escapeHtml(decodeEntities(t1 ?? t2 ?? t3 ?? 'Maslahat'))
      const parts = body
        .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .split(/\n\s*\n/)
      const paragraphs = parts
        .map((p) => stripTags(p).trim())
        .filter(Boolean)
        .map((p) => `<p>${escapeHtml(p)}</p>`)
        .join('')
      return `<aside class="jb-copy-box" data-title="${title}">${paragraphs || '<p></p>'}</aside>`
    },
  )
}

/**
 * Normalize the copy box rendered by the WordPress theme (imported via REST)
 * back into the editor's storage markup.
 */
export function normalizeRenderedCopyBoxes(html: string): string {
  return html.replace(
    /<aside class="jb-copy-box">\s*<div class="jb-copy-box__head">\s*<strong>([\s\S]*?)<\/strong>[\s\S]*?<\/div>\s*<div class="jb-copy-box__content">([\s\S]*?)<\/div>\s*(?:<p class="jb-copy-status"[^>]*>\s*<\/p>)?\s*<\/aside>/gi,
    (_m, title: string, body: string) =>
      `<aside class="jb-copy-box" data-title="${escapeHtml(stripTags(title))}">${body.trim()}</aside>`,
  )
}

function renderToc(headings: Heading[], title: string): string {
  if (headings.length < 2) return ''
  let n2 = 0
  let n3 = 0
  const items = headings
    .map((h) => {
      let num: string
      if (h.level === 2) {
        n2++
        n3 = 0
        num = `${n2}.`
      } else {
        n3++
        num = `${Math.max(n2, 1)}.${n3}`
      }
      return `<li class="jb-toc__item jb-toc__item--h${h.level}"><a class="jb-toc__link" href="#${escapeHtml(h.id)}"><span class="jb-toc__num">${num}</span><span class="jb-toc__text">${escapeHtml(h.text)}</span></a></li>`
    })
    .join('')
  return `<nav class="jb-toc jb-toc--card" aria-label="${escapeHtml(title)}" data-jb-toc><div class="jb-toc__head"><svg class="jb-toc__icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg><p class="jb-toc__title">${escapeHtml(title)}</p></div><ol class="jb-toc__list">${items}</ol></nav>`
}

/**
 * Turn stored post HTML into the final article markup:
 * sanitize → shortcodes → heading IDs (for the TOC) → copy boxes → responsive images,
 * scrollable tables and responsive embeds.
 */
export function renderContent(raw: string, opts: RenderOptions = {}): RenderedContent {
  const copyLabel = opts.copyLabel ?? 'Nusxalash'
  const copiedLabel = opts.copiedLabel ?? 'Nusxalandi'

  let html = convertCopyBoxShortcodes(raw || '')
  // [jb_article_sections] → placeholder, filled once headings are known.
  html = html.replace(/(?:<p>\s*)?\[jb_article_sections(?:\s+title="([^"]*)")?\s*\](?:\s*<\/p>)?/gi, (_m, t) =>
    `<p>JBTOCPLACEHOLDER${t ? encodeURIComponent(t) : ''}JBEND</p>`,
  )
  // Remove any other (unknown) WordPress shortcodes so they don't show as text.
  html = html.replace(/\[\/?(?:caption|embed|gallery|elementor-template|contact-form-7)[^\]]*\]/gi, '')

  html = sanitizeContent(html)

  // Heading IDs.
  const headings: Heading[] = []
  const used = new Set<string>()
  html = html.replace(/<h([23])((?:\s[^>]*)?)>([\s\S]*?)<\/h\1>/gi, (match, lvl: string, attrs: string, inner: string) => {
    const level = Number(lvl) as 2 | 3
    const text = stripTags(inner)
    if (!text) return match
    const existing = attr(`<h ${attrs}>`, 'id')
    if (existing) {
      used.add(existing)
      headings.push({ id: existing, text, level })
      return match
    }
    const base = slugify(text, 80) || 'bolim'
    let id = base
    let n = 2
    while (used.has(id)) id = `${base}-${n++}`
    used.add(id)
    headings.push({ id, text, level })
    return `<h${level} id="${id}"${attrs}>${inner}</h${level}>`
  })

  // Inline table of contents placeholder(s).
  html = html.replace(/<p>JBTOCPLACEHOLDER([^<]*?)JBEND<\/p>/g, (_m, t: string) =>
    renderToc(headings, t ? decodeURIComponent(t) : opts.tocTitle || 'Mundarija'),
  )

  // Copy boxes.
  html = html.replace(
    /<aside class="jb-copy-box"(?: data-title="([^"]*)")?>([\s\S]*?)<\/aside>/g,
    (_m, title: string | undefined, body: string) =>
      `<aside class="jb-copy-box"><div class="jb-copy-box__head"><strong>${title || 'Maslahat'}</strong><button type="button" class="jb-copy-button" data-label-default="${escapeHtml(copyLabel)}" data-label-success="${escapeHtml(copiedLabel)}">${escapeHtml(copyLabel)}</button></div><div class="jb-copy-box__content">${body}</div><p class="jb-copy-status" role="status" aria-live="polite"></p></aside>`,
  )

  // Images: lazy loading, intrinsic size, responsive srcset through the Next.js optimizer.
  html = html.replace(/<img\b([^>]*?)\/?>/gi, (_m, attrs: string) => {
    const src = attr(` ${attrs}`, 'src') || ''
    let out = attrs.replace(/\s(loading|decoding|srcset|sizes)\s*=\s*("[^"]*"|'[^']*')/gi, '')
    const info = opts.media?.get(src)
    if (info?.width && info?.height && !/\swidth=/i.test(out)) {
      out += ` width="${info.width}" height="${info.height}"`
    }
    if (info?.alt && !/\salt=/i.test(out)) out += ` alt="${escapeHtml(info.alt)}"`
    if (!/\salt=/i.test(out)) out += ' alt=""'
    if (isOptimizable(src)) {
      const max = info?.width ?? Infinity
      const widths = SRCSET_WIDTHS.filter((w) => w <= max)
      if (!widths.length) widths.push(SRCSET_WIDTHS[0])
      const set = widths.map((w) => `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75 ${w}w`).join(', ')
      out += ` srcset="${set}" sizes="(min-width: 1024px) 760px, 100vw"`
    }
    return `<img${out} loading="lazy" decoding="async">`
  })

  // Horizontal scrolling for wide tables on phones.
  html = html.replace(/<table\b[\s\S]*?<\/table>/gi, (t) => `<div class="jb-table-wrap">${t}</div>`)

  // Responsive, lazy embeds.
  html = html.replace(/<div data-youtube-video(?:="[^"]*")?>\s*(<iframe[\s\S]*?<\/iframe>)\s*<\/div>/gi, '$1')
  html = html.replace(/<iframe\b([^>]*)>([\s\S]*?)<\/iframe>/gi, (_m, attrs: string) => {
    const a = attrs.replace(/\s(loading)\s*=\s*("[^"]*"|'[^']*')/gi, '')
    return `<div class="jb-embed"><iframe${a} loading="lazy"></iframe></div>`
  })

  return { html, headings }
}

/** Headings only (used when the sidebar needs the TOC without rendering twice). */
export function extractHeadings(html: string): Heading[] {
  return renderContent(html).headings
}
