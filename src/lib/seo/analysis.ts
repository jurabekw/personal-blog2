/**
 * Yoast-style content analysis (isomorphic, no dependencies).
 * - SEO checks driven by the focus keyphrase.
 * - Readability checks (language-aware transition words for uz / ru / en).
 * Word matching is stem-tolerant ("marketing" matches "marketingni", "marketingning")
 * because Uzbek and Russian are inflected languages.
 */
import { decodeEntities, slugify, stripTags } from '@/lib/content/text'

export type Rating = 'good' | 'ok' | 'bad' | 'na'

export interface Check {
  id: string
  title: string
  rating: Rating
  /** Plain text; **bold** segments are rendered bold. */
  text: string
}

export interface AnalysisResult {
  checks: Check[]
  score: number
  rating: Rating
}

export interface AnalysisInput {
  html: string
  title: string
  /** Resolved SEO title (variables replaced). */
  seoTitle: string
  /** Resolved meta description (empty if none and no template). */
  metaDescription: string
  metaDescriptionIsCustom: boolean
  slug: string
  keyphrase: string
  siteHost: string
  /** How many OTHER posts/pages use the same focus keyphrase. */
  keyphraseUsedElsewhere?: number
  cornerstone?: boolean
  language?: 'uz' | 'ru' | 'en'
}

const SCORE: Record<Rating, number> = { good: 9, ok: 6, bad: 3, na: 0 }

/** Overall score thresholds (0–100) for the green / orange / red traffic light. */
export const GOOD_MIN = 76
export const OK_MIN = 55

/* ------------------------------------------------------------------ */
/* Text helpers                                                        */
/* ------------------------------------------------------------------ */

export function normalize(text: string): string {
  return decodeEntities(text)
    .toLowerCase()
    .replace(/[‘’ʻʼ`´]/g, "'")
    .replace(/[^\p{L}\p{N}'\s-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function tokens(text: string): string[] {
  const n = normalize(text)
  return n ? n.split(' ').filter((w) => /[\p{L}\p{N}]/u.test(w)) : []
}

const FUNCTION_WORDS: Record<string, Set<string>> = {
  uz: new Set(['va', 'bilan', 'uchun', 'ham', 'yoki', 'lekin', 'ammo', 'bu', 'shu', 'u', 'bir', 'esa', 'da', 'ni', 'ning', 'haqida', 'kabi', 'qanday', "o'z"]),
  ru: new Set(['и', 'в', 'на', 'с', 'по', 'для', 'как', 'что', 'это', 'или', 'не', 'из', 'к', 'у', 'о', 'от', 'за', 'а', 'же', 'ли']),
  en: new Set(['a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'is', 'are', 'how', 'what', 'why', 'your', 'my', 'at', 'by', 'from', 'it', 'this', 'that']),
}

function contentWords(keyphrase: string, lang: string): string[] {
  const all = tokens(keyphrase)
  const fw = FUNCTION_WORDS[lang] ?? FUNCTION_WORDS.en
  const filtered = all.filter((w) => !fw.has(w))
  return filtered.length ? filtered : all
}

/** Stem-tolerant word match: exact, or the token starts with the word and adds a short suffix. */
function wordMatches(token: string, word: string): boolean {
  if (token === word) return true
  if (word.length < 3) return false
  if (token.startsWith(word) && token.length - word.length <= 7) return true
  // Words ending in a vowel can lose it before a suffix (e.g. "sotuv" / "sotuvi").
  const stem = word.length > 5 ? word.slice(0, -1) : ''
  return Boolean(stem && token.startsWith(stem) && token.length - stem.length <= 7)
}

function containsAllWords(text: string, words: string[]): boolean {
  const t = tokens(text)
  return words.every((w) => t.some((tok) => wordMatches(tok, w)))
}

function containsSomeWords(text: string, words: string[]): number {
  const t = tokens(text)
  return words.filter((w) => t.some((tok) => wordMatches(tok, w))).length
}

/** Count occurrences of the keyphrase as a sequence (stem tolerant, function words allowed in between). */
function countPhrase(text: string, keyphrase: string, lang: string): number {
  const words = contentWords(keyphrase, lang)
  if (!words.length) return 0
  const t = tokens(text)
  const fw = FUNCTION_WORDS[lang] ?? FUNCTION_WORDS.en
  let count = 0
  for (let i = 0; i < t.length; i++) {
    if (!wordMatches(t[i], words[0])) continue
    let j = i + 1
    let k = 1
    let gap = 0
    while (k < words.length && j < t.length && gap <= 2) {
      if (wordMatches(t[j], words[k])) {
        k++
        gap = 0
      } else if (fw.has(t[j]) || gap < 1) {
        gap++
      } else break
      j++
    }
    if (k === words.length) {
      count++
      i = j - 1
    }
  }
  return count
}

function exactPhraseIndex(text: string, keyphrase: string, lang: string): number {
  const t = tokens(text)
  const words = contentWords(keyphrase, lang)
  for (let i = 0; i < t.length; i++) {
    if (words.every((w, k) => t[i + k] && wordMatches(t[i + k], w))) return i
  }
  return -1
}

interface Parsed {
  text: string
  words: number
  paragraphs: string[]
  firstParagraph: string
  headings: { level: number; text: string }[]
  images: { src: string; alt: string }[]
  links: { href: string; text: string; nofollow: boolean }[]
  hasH1: boolean
  blocks: string[]
  /** Text between subheadings. */
  sections: string[]
}

function attr(tag: string, name: string): string {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'))
  return m ? decodeEntities(m[2] ?? m[3] ?? '') : ''
}

export function parseHtml(html: string): Parsed {
  const clean = (html || '').replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
  const text = stripTags(clean)
  const paragraphs = [...clean.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => stripTags(m[1])).filter(Boolean)
  const headings = [...clean.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => ({ level: Number(m[1]), text: stripTags(m[2]) }))
  const images = [...clean.matchAll(/<img\b[^>]*>/gi)].map((m) => ({ src: attr(m[0], 'src'), alt: attr(m[0], 'alt') }))
  const links = [...clean.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((m) => ({
    href: attr(` ${m[1]}`, 'href'),
    text: stripTags(m[2]),
    nofollow: /nofollow/i.test(attr(` ${m[1]}`, 'rel')),
  }))
  const blocks = [...clean.matchAll(/<(p|li|h[1-6]|blockquote|td|th|figcaption)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((m) => stripTags(m[2]))
    .filter(Boolean)
  const sections = clean
    .split(/<h[2-6]\b[^>]*>[\s\S]*?<\/h[2-6]>/i)
    .map((s) => stripTags(s))
    .filter((s) => s.trim())
  return {
    text,
    words: tokens(text).length,
    paragraphs,
    firstParagraph: paragraphs[0] ?? blocks[0] ?? text.slice(0, 600),
    headings,
    images,
    links,
    hasH1: headings.some((h) => h.level === 1),
    blocks: blocks.length ? blocks : text ? [text] : [],
    sections,
  }
}

export function splitSentences(block: string): string[] {
  return block
    .split(/(?<=[.!?…])\s+(?=[\p{Lu}\p{N}“"«(])/u)
    .map((s) => s.trim())
    .filter((s) => tokens(s).length > 0)
}

/** Approximate pixel width of a Google desktop title (Arial 20px). */
export function titleWidth(title: string): number {
  let w = 0
  for (const ch of title) {
    if (/[ilj.,'’‘ʻ:;|!ı]/.test(ch)) w += 5
    else if (ch === ' ') w += 5.6
    else if (/[mwMW@]/.test(ch)) w += 16.5
    else if (/[A-Z]/.test(ch)) w += 13.3
    else if (/[0-9]/.test(ch)) w += 11.1
    else if (/[ftr]/.test(ch)) w += 6.4
    else if (/[Ѐ-ӿ]/.test(ch)) w += ch === ch.toUpperCase() ? 13.5 : 11
    else w += 10.6
  }
  return Math.round(w)
}

export const TITLE_MAX_PX = 600
export const META_MIN = 120
export const META_MAX = 156

function isInternal(href: string, host: string): boolean {
  if (!href || href.startsWith('#')) return false
  if (href.startsWith('/') && !href.startsWith('//')) return true
  try {
    const u = new URL(href)
    return u.hostname.replace(/^www\./, '') === host.replace(/^www\./, '')
  } catch {
    return false
  }
}

function result(checks: Check[]): AnalysisResult {
  const rated = checks.filter((c) => c.rating !== 'na')
  if (!rated.length) return { checks, score: 0, rating: 'na' }
  const score = Math.round((rated.reduce((s, c) => s + SCORE[c.rating], 0) / (rated.length * 9)) * 100)
  return { checks: sortChecks(checks), score, rating: score >= GOOD_MIN ? 'good' : score >= OK_MIN ? 'ok' : 'bad' }
}

function sortChecks(checks: Check[]): Check[] {
  const order: Record<Rating, number> = { bad: 0, ok: 1, good: 2, na: 3 }
  return [...checks].sort((a, b) => order[a.rating] - order[b.rating])
}

/* ------------------------------------------------------------------ */
/* SEO analysis                                                        */
/* ------------------------------------------------------------------ */

export function analyzeSeo(input: AnalysisInput): AnalysisResult {
  const lang = input.language ?? 'uz'
  const p = parseHtml(input.html)
  const kp = (input.keyphrase || '').trim()
  const checks: Check[] = []
  const minWords = input.cornerstone ? 900 : 300

  // Text length (always).
  {
    const w = p.words
    let rating: Rating = 'good'
    let text = `**Text length**: The text contains ${w} words. Good job!`
    if (w < minWords) {
      rating = w >= minWords * 0.66 ? 'ok' : 'bad'
      text = `**Text length**: The text contains ${w} words. This is ${w < minWords * 0.66 ? 'far ' : ''}below the recommended minimum of ${minWords} words${input.cornerstone ? ' for cornerstone content' : ''}. Add more content.`
    }
    checks.push({ id: 'textLength', title: 'Text length', rating, text })
  }

  // SEO title width.
  {
    const width = titleWidth(input.seoTitle)
    let rating: Rating = 'good'
    let text = '**SEO title width**: Good job!'
    if (!input.seoTitle.trim()) {
      rating = 'bad'
      text = '**SEO title width**: Please create an SEO title.'
    } else if (width > TITLE_MAX_PX) {
      rating = 'ok'
      text = `**SEO title width**: The SEO title is wider than the viewable limit (${width}px of ${TITLE_MAX_PX}px). Try to make it shorter.`
    } else if (width < 300) {
      rating = 'ok'
      text = '**SEO title width**: The SEO title is too short. Use the space to add keyphrase variations or create compelling call-to-action copy.'
    }
    checks.push({ id: 'titleWidth', title: 'SEO title width', rating, text })
  }

  // Meta description length.
  {
    const len = input.metaDescription.trim().length
    let rating: Rating = 'good'
    let text = '**Meta description length**: Well done!'
    if (!len) {
      rating = 'bad'
      text = '**Meta description length**: No meta description has been specified. Search engines will display copy from the page instead. Make sure to write one!'
    } else if (!input.metaDescriptionIsCustom) {
      rating = 'ok'
      text = `**Meta description length**: No custom meta description yet — the excerpt (${len} characters) is used. Write one to control what Google shows.`
    } else if (len < META_MIN) {
      rating = 'ok'
      text = `**Meta description length**: The meta description is too short (${len} characters). Up to ${META_MAX} characters are available. Use the space!`
    } else if (len > META_MAX) {
      rating = 'ok'
      text = `**Meta description length**: The meta description is over ${META_MAX} characters (${len}). To ensure the entire description will be visible, you should reduce its length!`
    }
    checks.push({ id: 'metaLength', title: 'Meta description length', rating, text })
  }

  // Links.
  const internal = p.links.filter((l) => isInternal(l.href, input.siteHost))
  const outbound = p.links.filter((l) => /^https?:\/\//i.test(l.href) && !isInternal(l.href, input.siteHost))
  checks.push(
    outbound.length
      ? outbound.every((l) => l.nofollow)
        ? { id: 'outbound', title: 'Outbound links', rating: 'ok', text: '**Outbound links**: All outbound links on this page are nofollowed. Add some normal links.' }
        : { id: 'outbound', title: 'Outbound links', rating: 'good', text: `**Outbound links**: Good job! (${outbound.length})` }
      : { id: 'outbound', title: 'Outbound links', rating: 'ok', text: '**Outbound links**: No outbound links appear in this page. Add some!' },
  )
  checks.push(
    internal.length
      ? { id: 'internal', title: 'Internal links', rating: 'good', text: `**Internal links**: You have enough internal links. Good job! (${internal.length})` }
      : { id: 'internal', title: 'Internal links', rating: 'bad', text: '**Internal links**: No internal links appear in this page, make sure to add some!' },
  )

  // Images.
  checks.push(
    p.images.length
      ? { id: 'images', title: 'Images', rating: 'good', text: `**Images**: Good job! (${p.images.length})` }
      : { id: 'images', title: 'Images', rating: 'bad', text: '**Images**: No images appear on this page. Add some!' },
  )

  if (p.hasH1) {
    checks.push({ id: 'singleH1', title: 'Single title', rating: 'bad', text: '**Single title**: H1s should only be used as your main title. Change the H1 in your text to a lower heading level (H2).' })
  }

  if (!kp) {
    checks.unshift({ id: 'keyphrase', title: 'Focus keyphrase', rating: 'bad', text: '**Focus keyphrase**: No focus keyphrase was set for this page. Set a keyphrase in order to calculate your SEO score.' })
    const r = result(checks)
    return { ...r, rating: 'na', score: 0 }
  }

  const words = contentWords(kp, lang)

  // Keyphrase length.
  {
    const n = words.length
    const rating: Rating = n <= 4 ? 'good' : n <= 8 ? 'ok' : 'bad'
    checks.push({
      id: 'keyphraseLength',
      title: 'Keyphrase length',
      rating,
      text: rating === 'good' ? '**Keyphrase length**: Good job!' : `**Keyphrase length**: The keyphrase contains ${n} content words. That's more than the recommended maximum of 4. Make it shorter!`,
    })
  }

  // Keyphrase in introduction.
  {
    const sentences = splitSentences(p.firstParagraph)
    const inSentence = sentences.some((s) => containsAllWords(s, words))
    const inPara = containsAllWords(p.firstParagraph, words)
    checks.push(
      inSentence
        ? { id: 'intro', title: 'Keyphrase in introduction', rating: 'good', text: '**Keyphrase in introduction**: Well done!' }
        : inPara
          ? { id: 'intro', title: 'Keyphrase in introduction', rating: 'ok', text: '**Keyphrase in introduction**: Your keyphrase or its synonyms appear in the first paragraph, but not within one sentence. Fix that!' }
          : { id: 'intro', title: 'Keyphrase in introduction', rating: 'bad', text: '**Keyphrase in introduction**: Your keyphrase or its synonyms do not appear in the first paragraph. Make sure the topic is clear immediately.' },
    )
  }

  // Keyphrase density.
  {
    const count = countPhrase(p.text, kp, lang)
    const density = p.words ? (count * Math.max(1, words.length) * 100) / p.words : 0
    const recommendedMin = Math.max(1, Math.round((p.words * 0.005) / Math.max(1, words.length)))
    const recommendedMax = Math.max(2, Math.floor((p.words * 0.03) / Math.max(1, words.length)))
    let rating: Rating = 'good'
    let text = `**Keyphrase density**: The keyphrase was found ${count} time${count === 1 ? '' : 's'}. This is great!`
    if (count === 0) {
      rating = 'bad'
      text = '**Keyphrase density**: The keyphrase was found 0 times. That\'s less than the recommended minimum. Focus on your keyphrase!'
    } else if (count < recommendedMin) {
      rating = 'ok'
      text = `**Keyphrase density**: The keyphrase was found ${count} time${count === 1 ? '' : 's'}. That's less than the recommended minimum of ${recommendedMin} times for a text of this length. Focus on your keyphrase!`
    } else if (count > recommendedMax && density > 3) {
      rating = 'bad'
      text = `**Keyphrase density**: The keyphrase was found ${count} times. That's more than the recommended maximum of ${recommendedMax} times for a text of this length. Don't overoptimize!`
    }
    checks.push({ id: 'density', title: 'Keyphrase density', rating, text })
  }

  // Keyphrase in meta description.
  {
    const count = countPhrase(input.metaDescription, kp, lang)
    const all = containsAllWords(input.metaDescription, words)
    checks.push(
      count >= 1 && count <= 2
        ? { id: 'metaKeyphrase', title: 'Keyphrase in meta description', rating: 'good', text: '**Keyphrase in meta description**: Keyphrase or synonym appear in the meta description. Well done!' }
        : count > 2
          ? { id: 'metaKeyphrase', title: 'Keyphrase in meta description', rating: 'bad', text: `**Keyphrase in meta description**: The meta description contains the keyphrase ${count} times, which is over the advised maximum of 2 times. Limit that!` }
          : all
            ? { id: 'metaKeyphrase', title: 'Keyphrase in meta description', rating: 'good', text: '**Keyphrase in meta description**: All words of the keyphrase appear in the meta description. Well done!' }
            : { id: 'metaKeyphrase', title: 'Keyphrase in meta description', rating: 'bad', text: '**Keyphrase in meta description**: The meta description has been specified, but it does not contain the keyphrase. Fix that!' },
    )
  }

  // Keyphrase in SEO title.
  {
    const idx = exactPhraseIndex(input.seoTitle, kp, lang)
    const all = containsAllWords(input.seoTitle, words)
    checks.push(
      idx === 0
        ? { id: 'titleKeyphrase', title: 'Keyphrase in SEO title', rating: 'good', text: '**Keyphrase in SEO title**: The exact match of the focus keyphrase appears at the beginning of the SEO title. Good job!' }
        : idx > 0
          ? { id: 'titleKeyphrase', title: 'Keyphrase in SEO title', rating: 'ok', text: '**Keyphrase in SEO title**: The exact match of the focus keyphrase appears in the SEO title, but not at the beginning. Move it to the beginning for the best results.' }
          : all
            ? { id: 'titleKeyphrase', title: 'Keyphrase in SEO title', rating: 'ok', text: '**Keyphrase in SEO title**: Does not contain the exact match. Try to write the exact match of your keyphrase in the SEO title and put it at the beginning of the title.' }
            : { id: 'titleKeyphrase', title: 'Keyphrase in SEO title', rating: 'bad', text: '**Keyphrase in SEO title**: Not all the words from your keyphrase appear in the SEO title. For the best SEO results write the exact match of your keyphrase in the SEO title, and put the keyphrase at the beginning of the title.' },
    )
  }

  // Keyphrase in slug.
  {
    const slugWords = slugify(input.slug).split('-')
    const kw = words.map((w) => slugify(w)).filter(Boolean)
    const found = kw.filter((w) => slugWords.some((s) => wordMatches(s, w))).length
    checks.push(
      kw.length && found / kw.length > 0.5
        ? { id: 'slug', title: 'Keyphrase in slug', rating: 'good', text: '**Keyphrase in slug**: Great work!' }
        : { id: 'slug', title: 'Keyphrase in slug', rating: found ? 'ok' : 'bad', text: '**Keyphrase in slug**: (Part of) your keyphrase does not appear in the slug. Change that!' },
    )
  }

  // Keyphrase in subheadings.
  {
    const subs = p.headings.filter((h) => h.level === 2 || h.level === 3)
    if (subs.length) {
      const hits = subs.filter((h) => containsAllWords(h.text, words)).length
      const pct = hits / subs.length
      checks.push(
        hits === 0
          ? { id: 'subheadings', title: 'Keyphrase in subheading', rating: 'ok', text: '**Keyphrase in subheading**: Use more keyphrases or synonyms in your H2 and H3 subheadings!' }
          : pct > 0.75 && subs.length > 1
            ? { id: 'subheadings', title: 'Keyphrase in subheading', rating: 'ok', text: `**Keyphrase in subheading**: More than 75% of your H2 and H3 subheadings reflect the topic of your copy. That's too much. Don't over-optimize!` }
            : { id: 'subheadings', title: 'Keyphrase in subheading', rating: 'good', text: `**Keyphrase in subheading**: ${hits} of your ${subs.length} H2/H3 subheadings reflect the topic of your copy. Good job!` },
      )
    }
  }

  // Image keyphrase (alt text).
  if (p.images.length) {
    const withKp = p.images.filter((i) => containsSomeWords(i.alt, words) === words.length).length
    const withAlt = p.images.filter((i) => i.alt.trim()).length
    checks.push(
      withKp > 0
        ? { id: 'imageKeyphrase', title: 'Image keyphrase', rating: 'good', text: `**Image keyphrase**: Good job! ${withKp} image alt attribute${withKp === 1 ? '' : 's'} contain${withKp === 1 ? 's' : ''} the keyphrase.` }
        : withAlt
          ? { id: 'imageKeyphrase', title: 'Image keyphrase', rating: 'ok', text: '**Image keyphrase**: Images on this page do not have alt attributes that reflect the topic of your text. Add your keyphrase or synonyms to the alt tags of relevant images!' }
          : { id: 'imageKeyphrase', title: 'Image keyphrase', rating: 'ok', text: '**Image keyphrase**: Images on this page do not have alt attributes. Add alt text that describes the image and includes your keyphrase where relevant.' },
    )
  }

  // Competing links (anchor text = keyphrase).
  {
    const competing = p.links.filter((l) => l.text && containsAllWords(l.text, words) && contentWords(l.text, lang).length <= words.length + 2)
    if (competing.length) {
      checks.push({ id: 'competingLinks', title: 'Competing links', rating: 'ok', text: "**Competing links**: You're linking to another page with the words you want this page to rank for. Don't do that!" })
    }
  }

  // Previously used keyphrase.
  {
    const used = input.keyphraseUsedElsewhere ?? 0
    checks.push(
      used === 0
        ? { id: 'usedBefore', title: 'Previously used keyphrase', rating: 'good', text: "**Previously used keyphrase**: You've not used this keyphrase before, very good." }
        : used === 1
          ? { id: 'usedBefore', title: 'Previously used keyphrase', rating: 'ok', text: "**Previously used keyphrase**: You've used this keyphrase once before. Do not use your focus keyphrase more than once." }
          : { id: 'usedBefore', title: 'Previously used keyphrase', rating: 'bad', text: `**Previously used keyphrase**: You've used this keyphrase ${used} times before. Do not use your focus keyphrase more than once.` },
    )
  }

  return result(checks)
}

/* ------------------------------------------------------------------ */
/* Readability                                                         */
/* ------------------------------------------------------------------ */

const TRANSITIONS: Record<string, string[]> = {
  uz: [
    'shuning uchun', 'chunki', 'biroq', 'lekin', 'ammo', 'masalan', 'birinchidan', 'ikkinchidan', 'uchinchidan', 'natijada',
    'bundan tashqari', 'shu bilan birga', 'aksincha', 'xulosa qilib aytganda', 'xulosa qilib', 'boshqacha aytganda', 'avvalo',
    'avvalambor', 'keyin', "so'ng", "so'ngra", 'nihoyat', 'shunday qilib', 'demak', 'umuman olganda', 'qisqasi', 'xususan',
    'ayniqsa', 'shuningdek', 'hatto', 'holbuki', 'garchi', 'vaholanki', 'binobarin', 'zero', 'negaki', 'sababi', 'oqibatda',
    'buning natijasida', 'misol uchun', 'jumladan', 'birinchi navbatda', 'eng muhimi', 'asosan', 'odatda', 'albatta', 'aslida',
    'darhaqiqat', 'qolaversa', 'shu sababli', 'shu tufayli', 'buning uchun', 'bunga qaramay', 'shunga qaramay', 'shu bois',
    'bir tomondan', 'ikkinchi tomondan', 'xuddi shunday', "o'z navbatida", 'boshqa tomondan', 'yana', 'agar',
  ],
  ru: [
    'однако', 'поэтому', 'потому что', 'например', 'во-первых', 'во-вторых', 'в-третьих', 'кроме того', 'также', 'таким образом',
    'в результате', 'итак', 'следовательно', 'в итоге', 'тем не менее', 'наконец', 'зато', 'вместе с тем', 'впрочем',
    'в частности', 'более того', 'значит', 'так как', 'поскольку', 'хотя', 'прежде всего', 'в целом', 'другими словами',
    'иначе говоря', 'с одной стороны', 'с другой стороны', 'в то же время', 'кстати', 'сначала', 'затем', 'потом', 'однако же',
  ],
  en: [
    'accordingly', 'additionally', 'also', 'besides', 'consequently', 'finally', 'first', 'firstly', 'furthermore', 'hence',
    'however', 'indeed', 'instead', 'likewise', 'meanwhile', 'moreover', 'namely', 'nevertheless', 'next', 'nonetheless',
    'otherwise', 'second', 'secondly', 'similarly', 'still', 'subsequently', 'then', 'therefore', 'thus', 'for example',
    'for instance', 'in addition', 'in conclusion', 'in fact', 'as a result', 'on the other hand', 'because', 'although',
    'since', 'so that', 'in other words', 'to sum up', 'above all', 'after all', 'in short', 'in particular', 'especially',
  ],
}

export function analyzeReadability(input: { html: string; language?: 'uz' | 'ru' | 'en' }): AnalysisResult {
  const lang = input.language ?? 'uz'
  const p = parseHtml(input.html)
  const checks: Check[] = []

  if (p.words < 50) {
    checks.push({ id: 'textPresence', title: 'Not enough content', rating: 'bad', text: '**Not enough content**: Please add some content to enable a good analysis.' })
    return result(checks)
  }

  // Subheading distribution.
  {
    const subs = p.headings.filter((h) => h.level >= 2)
    const long = p.sections.map((s) => tokens(s).length).filter((n) => n > 300)
    if (!subs.length) {
      checks.push(
        p.words > 300
          ? { id: 'subheadingDistribution', title: 'Subheading distribution', rating: 'bad', text: '**Subheading distribution**: You are not using any subheadings, although your text is rather long. Try and add some subheadings.' }
          : { id: 'subheadingDistribution', title: 'Subheading distribution', rating: 'good', text: '**Subheading distribution**: You are not using any subheadings, but your text is short enough and probably doesn\'t need them.' },
      )
    } else if (long.length) {
      const worst = Math.max(...long)
      checks.push({
        id: 'subheadingDistribution',
        title: 'Subheading distribution',
        rating: worst > 350 ? 'bad' : 'ok',
        text: `**Subheading distribution**: ${long.length} section${long.length === 1 ? ' of your text is' : 's of your text are'} longer than 300 words and ${long.length === 1 ? 'is' : 'are'} not separated by any subheadings. Add subheadings to improve readability.`,
      })
    } else {
      checks.push({ id: 'subheadingDistribution', title: 'Subheading distribution', rating: 'good', text: '**Subheading distribution**: Great job!' })
    }
  }

  // Paragraph length.
  {
    const lengths = p.paragraphs.map((x) => tokens(x).length)
    const tooLong = lengths.filter((n) => n > 150)
    checks.push(
      tooLong.length
        ? {
            id: 'paragraphLength',
            title: 'Paragraph length',
            rating: Math.max(...tooLong) > 200 ? 'bad' : 'ok',
            text: `**Paragraph length**: ${tooLong.length} of the paragraphs contain${tooLong.length === 1 ? 's' : ''} more than the recommended maximum of 150 words. Shorten your paragraphs!`,
          }
        : { id: 'paragraphLength', title: 'Paragraph length', rating: 'good', text: '**Paragraph length**: There are no paragraphs that are too long. Great job!' },
    )
  }

  const sentences = p.blocks.flatMap(splitSentences)

  // Sentence length.
  {
    const long = sentences.filter((s) => tokens(s).length > 20).length
    const pct = sentences.length ? (long / sentences.length) * 100 : 0
    checks.push(
      pct <= 25
        ? { id: 'sentenceLength', title: 'Sentence length', rating: 'good', text: '**Sentence length**: Great!' }
        : {
            id: 'sentenceLength',
            title: 'Sentence length',
            rating: pct <= 30 ? 'ok' : 'bad',
            text: `**Sentence length**: ${pct.toFixed(1)}% of the sentences contain more than 20 words, which is more than the recommended maximum of 25%. Try to shorten the sentences.`,
          },
    )
  }

  // Consecutive sentences starting with the same word.
  {
    let streaks = 0
    for (const block of p.blocks) {
      const firsts = splitSentences(block).map((s) => tokens(s)[0] ?? '')
      let run = 1
      for (let i = 1; i < firsts.length; i++) {
        if (firsts[i] && firsts[i] === firsts[i - 1]) {
          run++
          if (run === 3) streaks++
        } else run = 1
      }
    }
    checks.push(
      streaks
        ? { id: 'consecutive', title: 'Consecutive sentences', rating: 'bad', text: `**Consecutive sentences**: The text contains ${streaks} instance${streaks === 1 ? '' : 's'} where 3 or more consecutive sentences start with the same word. Mix things up!` }
        : { id: 'consecutive', title: 'Consecutive sentences', rating: 'good', text: '**Consecutive sentences**: There is enough variety in your sentences. That\'s great!' },
    )
  }

  // Transition words.
  {
    const list = TRANSITIONS[lang] ?? TRANSITIONS.en
    const withTw = sentences.filter((s) => {
      const n = ` ${normalize(s)} `
      return list.some((w) => n.includes(` ${w} `))
    }).length
    const pct = sentences.length ? (withTw / sentences.length) * 100 : 0
    checks.push(
      pct >= 30
        ? { id: 'transitions', title: 'Transition words', rating: 'good', text: `**Transition words**: Well done! (${pct.toFixed(0)}% of sentences)` }
        : {
            id: 'transitions',
            title: 'Transition words',
            rating: pct >= 20 ? 'ok' : 'bad',
            text: `**Transition words**: Only ${pct.toFixed(1)}% of the sentences contain transition words (e.g. ${list.slice(0, 4).join(', ')}), which is not enough. Use more of them.`,
          },
    )
  }

  return result(checks)
}

/** Rating for a stored 0–100 score (null = not analysed / no keyphrase). */
export function ratingFromScore(score: number | null | undefined): Rating {
  if (score === null || score === undefined || score <= 0) return 'na'
  return score >= GOOD_MIN ? 'good' : score >= OK_MIN ? 'ok' : 'bad'
}
