/**
 * Isomorphic text helpers (safe for server and browser; no dependencies).
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  laquo: '«',
  raquo: '»',
  copy: '©',
  reg: '®',
  trade: '™',
  middot: '·',
  bull: '•',
}

export function decodeEntities(input: string): string {
  if (!input || input.indexOf('&') === -1) return input
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? m
  })
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Remove tags (and script/style bodies), decode entities, collapse whitespace. */
export function stripTags(html: string): string {
  if (!html) return ''
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|template)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<\/(p|div|h[1-6]|li|blockquote|tr|section|article|aside|figure|figcaption|pre)>/gi, '$& ')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/\s+/g, ' ')
    .trim()
}

/** Strip WordPress shortcodes like [jb_copy_box title="x"] … [/jb_copy_box]. */
export function stripShortcodes(text: string): string {
  return text.replace(/\[\/?[a-z_][\w-]*(?:\s[^\]]*)?\]/gi, ' ')
}

const WORD_RE = /[\p{L}\p{N}'‘’ʻʼ`-]+/gu

/** Unicode-aware word count (same rule as the theme's reading time). */
export function countWords(text: string): number {
  const m = text.match(WORD_RE)
  return m ? m.filter((w) => /[\p{L}\p{N}]/u.test(w)).length : 0
}

export function wordCountFromHtml(html: string): number {
  return countWords(stripShortcodes(stripTags(html)))
}

export function readingMinutes(words: number): number {
  return Math.max(1, Math.ceil(words / 200))
}

/** WordPress-style excerpt: first `words` words + "…". */
export function excerptFromHtml(html: string, words = 26): string {
  const text = stripShortcodes(stripTags(html)).replace(/\s+/g, ' ').trim()
  const parts = text.split(' ')
  if (parts.length <= words) return text
  return parts.slice(0, words).join(' ') + '…'
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  const at = cut.lastIndexOf(' ')
  return (at > max * 0.6 ? cut.slice(0, at) : cut).trimEnd() + '…'
}

const CYRILLIC: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k',
  л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: 'o', қ: 'q',
  ғ: 'g', ҳ: 'h',
}

/**
 * URL slug in the spirit of WordPress `sanitize_title()`:
 * lowercases, removes accents and apostrophes (oʻ → o), transliterates Cyrillic,
 * and joins words with hyphens.
 */
export function slugify(input: string, maxLength = 190): string {
  const lowered = decodeEntities(input || '').toLowerCase()
  let out = ''
  for (const ch of lowered) out += CYRILLIC[ch] ?? ch
  return out
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['‘’ʻʼ`´"“”«»]/g, '')
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '')
}
