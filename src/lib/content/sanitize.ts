import 'server-only'
import sanitizeHtml from 'sanitize-html'
import { decodeEntities } from './text'

const IFRAME_HOSTS = [
  'www.youtube.com',
  'youtube.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
  'www.google.com',
  'maps.google.com',
  'docs.google.com',
  'open.spotify.com',
  'www.loom.com',
  'codepen.io',
]

const BASE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'u', 's', 'del', 'ins', 'mark', 'sub', 'sup',
    'small', 'a', 'ul', 'ol', 'li', 'blockquote', 'cite', 'q', 'code', 'pre', 'kbd', 'hr', 'img', 'figure',
    'figcaption', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col', 'iframe',
    'video', 'audio', 'source', 'aside', 'div', 'details', 'summary', 'dl', 'dt', 'dd', 'abbr',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel', 'name', 'id'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    iframe: ['src', 'width', 'height', 'title', 'allow', 'allowfullscreen', 'frameborder', 'loading', 'referrerpolicy'],
    video: ['src', 'controls', 'poster', 'width', 'height', 'preload', 'muted', 'loop', 'playsinline'],
    audio: ['src', 'controls', 'preload'],
    source: ['src', 'type'],
    h2: ['id', 'style'],
    h3: ['id', 'style'],
    h4: ['id', 'style'],
    h5: ['id', 'style'],
    h6: ['id', 'style'],
    p: ['style'],
    th: ['colspan', 'rowspan', 'scope', 'style'],
    td: ['colspan', 'rowspan', 'style'],
    col: ['span'],
    ol: ['start', 'reversed', 'type'],
    aside: ['class', 'data-title'],
    figure: ['class'],
    code: ['class'],
    pre: ['class'],
    div: ['data-youtube-video'],
    abbr: ['title'],
    blockquote: ['cite'],
    q: ['cite'],
  },
  allowedClasses: {
    aside: ['jb-copy-box'],
    figure: ['aligncenter', 'alignleft', 'alignright', 'alignwide', 'alignfull'],
    code: [/^language-[\w-]+$/],
    pre: [/^language-[\w-]+$/],
  },
  allowedStyles: {
    '*': { 'text-align': [/^(left|right|center|justify)$/] },
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  allowedIframeHostnames: IFRAME_HOSTS,
  allowProtocolRelative: false,
  transformTags: {
    h1: 'h2',
    b: 'strong',
    i: 'em',
    strike: 's',
    a: (tagName, attribs) => {
      const out = { ...attribs }
      if (out.target === '_blank') {
        const rel = new Set((out.rel || '').split(/\s+/).filter(Boolean))
        rel.add('noopener')
        rel.add('noreferrer')
        out.rel = [...rel].join(' ')
      } else if (out.target && out.target !== '_self') {
        delete out.target
      }
      return { tagName, attribs: out }
    },
  },
  // Drop empty paragraphs like <p>&nbsp;</p> left by WordPress/Google Docs.
  exclusiveFilter: (frame) =>
    frame.tag === 'p' && !frame.text.replace(/[\s ]/g, '') && !frame.mediaChildren?.length,
}

/** Clean editor/imported HTML into the safe subset the theme can style. */
export function sanitizeContent(html: string): string {
  return sanitizeHtml(html || '', BASE_OPTIONS).trim()
}

/**
 * Plain text with no markup at all. Entities are decoded back to characters
 * ("&" stays "&"): plain text is always escaped again where it is output.
 */
export function sanitizePlain(input: string): string {
  return decodeEntities(sanitizeHtml(input || '', { allowedTags: [], allowedAttributes: {} })).trim()
}
