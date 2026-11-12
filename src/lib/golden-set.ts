/** Pure helpers for scripts/golden-set.ts (sentence extraction and CSV output). */
import sanitizeHtml from 'sanitize-html'

export const MIN_WORDS = 4

/** Strips HTML (including script/style bodies) to single-spaced plain text. */
export function htmlToText(html: string): string {
  // Tags become spaces so adjacent blocks (</p><p>, <br>, <li>) don't glue words together.
  const spaced = html.replace(/<\/?[a-zA-Z][^>]*>/g, (tag) => ` ${tag} `)
  const text = sanitizeHtml(spaced, { allowedTags: [], allowedAttributes: {}, disallowedTagsMode: 'discard' })
  return text
    .replace(/&nbsp;| /g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/** Splits text on sentence-ending punctuation followed by whitespace; drops sentences under MIN_WORDS words. */
export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.split(' ').filter(Boolean).length >= MIN_WORDS)
}

/** Round-robin over posts (in the given order) until `count` sentences are collected. Deterministic. */
export function pickSentences(
  posts: { slug: string; sentences: string[] }[],
  count: number,
): { slug: string; text: string }[] {
  const out: { slug: string; text: string }[] = []
  for (let i = 0; out.length < count; i++) {
    let any = false
    for (const p of posts) {
      if (i < p.sentences.length) {
        any = true
        out.push({ slug: p.slug, text: p.sentences[i] })
        if (out.length >= count) break
      }
    }
    if (!any) break
  }
  return out
}

/** RFC 4180 field quoting. */
export function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function csvRow(fields: string[]): string {
  return fields.map(csvField).join(',')
}
