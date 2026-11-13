import type { Script, TranslitConfig } from './types';

/** Every apostrophe-like character people type for oʻ, gʻ and the tutuq belgisi. */
export const APOS_CLASS = "'‘’ʻʼ`";
const APOS_RE = /['‘’ʻʼ`]/g;

/**
 * A word: letters/digits, optional internal apostrophes, and a trailing apostrophe
 * only when it completes oʻ/gʻ (bog', tog'). Quotes around words are left alone.
 */
const WORD_RE = /[\p{L}\p{N}]+(?:['‘’ʻʼ`][\p{L}\p{N}]+)*(?:(?<=[oOgG])['‘’ʻʼ`](?![\p{L}\p{N}]))?/gu;

const CYR_LETTERS: Record<string, string> = {
  a: 'а', b: 'б', c: 'ц', d: 'д', f: 'ф', g: 'г', h: 'ҳ', i: 'и', j: 'ж', k: 'к', l: 'л',
  m: 'м', n: 'н', o: 'о', p: 'п', q: 'қ', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в', w: 'в',
  x: 'х', y: 'й', z: 'з',
};
const Y_VOWELS: Record<string, string> = { e: 'е', o: 'ё', u: 'ю', a: 'я' };
const CYR_VOWELS = 'аеёиоуўэюя';

function normApos(s: string): string {
  return s.replace(APOS_RE, "'");
}

function hasLetters(s: string): boolean {
  return /\p{L}/u.test(s);
}

function isAllCaps(word: string): boolean {
  return hasLetters(word) && word === word.toUpperCase() && word !== word.toLowerCase();
}

/** Uzbek all-caps abbreviation ending in the Sh/Ch digraph: AQSh, BMTCh. */
const UZ_ABBR_RE = /^\p{Lu}+(?:Sh|Ch)$/u;

function shouldKeep(word: string, cfg: TranslitConfig): boolean {
  const lower = word.toLowerCase();
  if (cfg.protectedWords.some((p) => p.toLowerCase() === lower)) return true;
  if (isAllCaps(word)) {
    // ALL-CAPS: an acronym only with a digit (GA4, B2B) or, for 2+ letters, without any vowel (HTML, BMT);
    // JUDA, BEPUL, YANGI are Uzbek words and single capitals are initials (M. Karimov, B, V, G).
    // Protected acronyms (SEO, KPI, FAQ…) are kept above.
    if (/\p{N}/u.test(word)) return true;
    if (word.replace(/[^\p{L}]/gu, '').length >= 2 && !/[aeiou]/i.test(word)) return true;
  }
  // Internal capital letter (iPhone, YouTube, LinkedIn) → foreign brand; AQSh, BMTCh are Uzbek abbreviations.
  if (/\p{Ll}/u.test(word) && /.\p{Lu}/u.test(word) && !UZ_ABBR_RE.test(word)) return true;
  // English -tion words (optimization, conversion rate is "konversiya" in Uzbek).
  if (/tions?$/i.test(word)) return true;
  // Letters the Uzbek Latin alphabet doesn't use.
  if (/w/i.test(word) || /c(?!h)/i.test(word)) return true;
  // Already non-Latin (e.g. Cyrillic quoted in a Latin post).
  if (/[^\p{Script=Latin}\p{N}'‘’ʻʼ`]/u.test(word)) return true;
  return false;
}

function applyCase(source: string, out: string): string {
  if (UZ_ABBR_RE.test(source)) return out.toUpperCase();
  if (isAllCaps(source) && source.replace(APOS_RE, '').length > 1) return out.toUpperCase();
  const first = source.charAt(0);
  if (first !== first.toLowerCase()) return out.charAt(0).toUpperCase() + out.slice(1);
  return out;
}

/** Lowercase current-Latin → Cyrillic by rules. `prev` is the Cyrillic text already emitted for this word. */
function cyrRules(s: string, prev = ''): string {
  let out = prev;
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    const n = s[i + 1];
    if ((c === 'o' || c === 'g') && n === "'") {
      out += c === 'o' ? 'ў' : 'ғ';
      i += 2;
      continue;
    }
    // -tsiya / -tsion loanwords: integratsiya → интеграция, investitsion → инвестицион (not bare ts: aytsa → айтса).
    if (c === 't' && n === 's' && s[i + 2] === 'i' && (s.startsWith('ya', i + 3) || s.startsWith('on', i + 3))) {
      out += 'ц';
      i += 2;
      continue;
    }
    if (c === 's' && n === 'h') { out += 'ш'; i += 2; continue; }
    if (c === 'c' && n === 'h') { out += 'ч'; i += 2; continue; }
    if (c === 'y' && n && Y_VOWELS[n]) {
      // yoʻl → йўл: the o belongs to oʻ, so y stays й.
      if (n === 'o' && s[i + 2] === "'") { out += 'й'; i += 1; continue; }
      out += Y_VOWELS[n];
      i += 2;
      continue;
    }
    if (c === 'e') {
      const last = out.charAt(out.length - 1);
      out += out.length === 0 || CYR_VOWELS.includes(last) ? 'э' : 'е';
      i += 1;
      continue;
    }
    if (c === "'") {
      // Is'hoq: the apostrophe only separates s and h.
      out += s[i - 1] === 's' && n === 'h' ? '' : 'ъ';
      i += 1;
      continue;
    }
    out += CYR_LETTERS[c] ?? c;
    i += 1;
  }
  return out.slice(prev.length);
}

function wordToCyrillic(word: string, cfg: TranslitConfig): string {
  const lw = normApos(word).toLowerCase();
  let out: string;
  if (cfg.exceptions[lw]) {
    out = cfg.exceptions[lw];
  } else {
    let stem = '';
    for (const key of Object.keys(cfg.exceptions)) {
      if (key.length >= 4 && key.length > stem.length && lw.startsWith(key)) stem = key;
    }
    if (stem) {
      const head = cfg.exceptions[stem];
      out = head + cyrRules(lw.slice(stem.length), head);
    } else {
      out = cyrRules(lw);
    }
  }
  return applyCase(word, out);
}

function wordToNewLatin(word: string): string {
  const w = normApos(word);
  let out = '';
  let i = 0;
  while (i < w.length) {
    const c = w[i];
    const lc = c.toLowerCase();
    const n = w[i + 1];
    const ln = n?.toLowerCase();
    const up = c !== lc;
    if ((lc === 'o' || lc === 'g') && n === "'") {
      const ch = lc === 'o' ? 'ö' : 'ğ';
      out += up ? ch.toUpperCase() : ch;
      i += 2;
      continue;
    }
    if ((lc === 's' || lc === 'c') && ln === 'h') {
      const ch = lc === 's' ? 'ş' : 'ç';
      out += up ? ch.toUpperCase() : ch;
      i += 2;
      continue;
    }
    if (c === "'") {
      // Is'hoq → Ishoq: once sh is ş, s+h needs no separator.
      out += w[i - 1]?.toLowerCase() === 's' && ln === 'h' ? '' : 'ʼ';
      i += 1;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

/**
 * Spans that are never transliterated: URLs, e-mail addresses, @handles and dotted names
 * (jurabek.blog, linkedin.com/in/…, Next.js). A dotted name needs a last part of 2+ characters
 * starting with a lowercase letter, so "yaxshi. Keyin", "yaxshi.Keyin", "h.k." and "1.5-versiya"
 * are still text (a missing space before a lowercase word, "tugadi.keyin", is taken as a name).
 */
const PROTECT_RE = new RegExp(
  [
    String.raw`(?<![\p{L}\p{N}])(?:https?:\/\/|www\.)[^\s<>"'«»“”‘’]+`,
    String.raw`(?<![\p{L}\p{N}._%+-])[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+`,
    String.raw`(?<![\p{L}\p{N}_@])@[A-Za-z0-9_](?:[A-Za-z0-9_.]*[A-Za-z0-9_])?`,
    String.raw`(?<![\p{L}\p{N}'‘’ʻʼ\x60.@-])[\p{L}\p{N}_-]+(?:\.[\p{L}\p{N}_-]+)+(?:\/[^\s<>"'«»“”‘’]*)?`,
  ].join('|'),
  'gu',
);

function protectedSpan(match: string): string {
  // Sentence punctuation after a URL/name is not part of it; keep a ")" only when it closes a "(" inside.
  let span = match.replace(/[.,;:!?]+$/u, '');
  while (span.endsWith(')') && (span.match(/\(/g) || []).length < (span.match(/\)/g) || []).length) {
    span = span.slice(0, -1).replace(/[.,;:!?]+$/u, '');
  }
  if (/^(?:https?:\/\/|www\.)/i.test(span) || span.includes('@')) return span;
  const host = span.split('/')[0];
  const last = host.slice(host.lastIndexOf('.') + 1);
  return last.length >= 2 && /^\p{Ll}/u.test(last) ? span : '';
}

/** Uzbek suffixes accepted after a protected word without an apostrophe (Googleda, Yandexdan). */
const SUFFIXES = new Set([
  'da', 'dan', 'ga', 'ka', 'qa', 'ni', 'ning', 'niki', 'dagi', 'lar', 'lari', 'larga', 'larda', 'lardan',
  'larni', 'larning', 'cha', 'chi', 'day', 'dek', 'siz', 'li', 'lik',
]);

/**
 * Protected word + Uzbek suffix (Google'da, Googleda, Instagram’da, Meta'ning): the stem stays as
 * typed, only the suffix is transliterated. With an apostrophe any letters count as a suffix;
 * without one the suffix must be a known one and the stem must be typed like the protected word
 * (so "itlar" is not IT + lar).
 */
function splitProtected(word: string, cfg: TranslitConfig): [string, string, string] | null {
  const lower = word.toLowerCase();
  let best: [string, string, string] | null = null;
  for (const p of cfg.protectedWords) {
    if (p.length >= word.length || (best && p.length <= best[0].length)) continue;
    if (!lower.startsWith(p.toLowerCase())) continue;
    const m = /^(['‘’ʻʼ`]?)(\p{L}+)$/u.exec(word.slice(p.length));
    if (!m) continue;
    const stem = word.slice(0, p.length);
    if (!m[1] && (stem !== p || !SUFFIXES.has(m[2].toLowerCase()))) continue;
    best = [stem, m[1], m[2]];
  }
  return best;
}

type WordFn = (word: string) => string;
type SuffixFn = (suffix: string, stem: string) => string;

export interface TextOptions {
  /** Text of a link to another site: a run of capitalized words with a brand in it is a source title. */
  source?: boolean;
}

interface Mapper {
  cfg: TranslitConfig;
  fn: WordFn;
  suffixFn: SuffixFn;
  /** Cyrillic drops the apostrophe between an Uzbek stem and its suffix (Ta'lim'ning → Таълимнинг). */
  dropSuffixApostrophe: boolean;
}

/** Hyphenated all-caps acronym of 1-2 letter parts (E-E-A-T): stays Latin, so single letters in it are not initials. */
const HYPHEN_ACRONYM = String.raw`(?<![\p{L}\p{N}-])[A-Z]{1,2}(?:-[A-Z]{1,2})+(?![\p{L}\p{N}-])`;
const PLAIN_RE = new RegExp(`${HYPHEN_ACRONYM}|${WORD_RE.source}`, 'gu');
const HYPHEN_ACRONYM_FULL = /^[A-Z]{1,2}(?:-[A-Z]{1,2})+$/;

/** Suffixes written after an apostrophe behind a name: Haines’ning, Market’da, Central’dagi. */
const APOS_SUFFIXES = new Set([
  ...SUFFIXES, 'dagi', 'dagilar', 'si', 'sini', 'sining', 'siga', 'sida', 'sidan', 'mi', 'dir', 'ingiz',
  'ingizni', 'ingizning', 'ingizga', 'ingizda', 'imiz', 'lardagi', 'gacha', 'dek',
]);

/**
 * Word = stem + apostrophe + Uzbek suffix (Haines’ning, Ta'lim'ning). `foreign` when the stem reads as
 * a name to keep: 3+ letters, no apostrophe of its own, not an oʻ/gʻ ending (bogʻda, Togʻda).
 */
function splitAposSuffix(word: string): { stem: string; apos: string; suffix: string; foreign: boolean } | null {
  const m = /^(.+?)(['‘’ʻʼ`])(\p{L}+)$/u.exec(word);
  if (!m) return null;
  // Split at the last apostrophe: Ta'lim'ning → Ta'lim + ning.
  const at = Math.max(...[...APOS_CLASS].map((c) => word.lastIndexOf(c)));
  const stem = word.slice(0, at);
  const apos = word[at];
  const suffix = word.slice(at + 1);
  if (!/^\p{L}+$/u.test(suffix) || !APOS_SUFFIXES.has(suffix.toLowerCase())) return null;
  const letters = stem.replace(/[^\p{L}]/gu, '');
  if (letters.length < 2) return null;
  const ogEnd = /[oOgG]$/.test(stem) && (apos === '‘' || apos === 'ʻ' || apos === '`' || /^\p{Ll}/u.test(stem));
  const foreign = letters.length >= 3 && !/['‘’ʻʼ`]/.test(stem) && !ogEnd;
  if (ogEnd) return null;
  return { stem, apos, suffix, foreign };
}

/** Lowercase English words that join the parts of a title: Principles of Marketing, Bain & Company. */
const JOINERS = new Set(['of', 'to', 'and', 'the', 'for', 'in', 'on', 'a', 'an', 'with', 'by', 'at']);
const UZ_ENDING_RE = /(?:da|dan|ga|ni|ning|dagi|lar|lari|larni|larga|larda|si|sini|ida|idan|iga|ini|imiz|ingiz)$/;

/**
 * Can this word continue a name started by a brand (Google ›Skillshop‹, Meta Ads ›Manager’dagi‹)?
 * Capitalized, and not Uzbek-looking: no oʻ/gʻ, no q, no bare Uzbek case ending (Oʻzbekistonda, Qidiruv).
 */
function isNameWord(word: string): boolean {
  if (/^\p{N}/u.test(word)) return true;
  if (!/^\p{Lu}/u.test(word) || word.length < 2) return false;
  const apos = splitAposSuffix(word);
  const stem = apos ? apos.stem : word;
  if (/[oOgG]['‘’ʻʼ`]/.test(stem) || /q/i.test(stem.replace(/^\p{Lu}+(?:Sh|Ch)$/u, ''))) return false;
  if (UZ_ABBR_RE.test(stem)) return false;
  if (!apos && stem.length > 4 && UZ_ENDING_RE.test(stem)) return false;
  return true;
}

interface Token {
  word: string;
  index: number;
  out: string;
  /** Left in Latin because it is a name (brand, acronym, foreign spelling). */
  kept: boolean;
  /** A bare kept name that may start a run of capitalized names. */
  starter: boolean;
}

function keepName(word: string, m: Mapper): string {
  const apos = splitAposSuffix(word);
  if (apos && !HYPHEN_ACRONYM_FULL.test(word)) return apos.stem + apos.apos + m.suffixFn(apos.suffix, apos.stem);
  return word;
}

function classify(word: string, index: number, m: Mapper): Token {
  const t = (out: string, kept: boolean, starter = false): Token => ({ word, index, out, kept, starter });
  if (HYPHEN_ACRONYM_FULL.test(word)) return t(word, true);
  const split = splitProtected(word, m.cfg);
  // A name with a suffix may still head a title: FTC’ning ›Advertising and Marketing Basics‹.
  if (split) return t(split[0] + split[1] + m.suffixFn(split[2], split[0]), true, true);
  const apos = splitAposSuffix(word);
  if (apos) {
    if (apos.foreign && (/^\p{Lu}/u.test(apos.stem) || shouldKeep(apos.stem, m.cfg))) {
      return t(apos.stem + apos.apos + m.suffixFn(apos.suffix, apos.stem), true, true);
    }
    if (m.dropSuffixApostrophe && !shouldKeep(apos.stem, m.cfg)) return t(m.fn(apos.stem + apos.suffix), false);
  }
  if (shouldKeep(word, m.cfg)) return t(word, true, /\p{Lu}/u.test(word) && word.length > 1);
  return t(m.fn(word), false);
}

/** Gap between two words of one name: a space, or " & " (Bain & Company). */
function isNameGap(gap: string, source: boolean): boolean {
  return gap === ' ' || gap === ' & ' || gap === ` ${AMP} ` || (source && gap === ': ');
}

function mapPlain(text: string, m: Mapper, opts: TextOptions): string {
  const matches = [...text.matchAll(PLAIN_RE)];
  if (matches.length === 0) return text;
  const tokens = matches.map((x) => classify(x[0], x.index ?? 0, m));
  const gapBefore = (i: number) =>
    text.slice(tokens[i - 1].index + tokens[i - 1].word.length, tokens[i].index);
  const keep = (i: number) => {
    tokens[i].out = keepName(tokens[i].word, m);
    tokens[i].kept = true;
  };

  if (opts.source) {
    // A source title: a run of capitalized words (with joiners) that holds a name stays as written.
    let i = 0;
    while (i < tokens.length) {
      if (!isNameWord(tokens[i].word)) { i++; continue; }
      let j = i;
      while (j + 1 < tokens.length && isNameGap(gapBefore(j + 1), true)) {
        const next = tokens[j + 1].word;
        if (isNameWord(next)) { j++; continue; }
        if (JOINERS.has(next) && j + 2 < tokens.length && gapBefore(j + 2) === ' ' && isNameWord(tokens[j + 2].word)) { j += 2; continue; }
        break;
      }
      const words = tokens.slice(i, j + 1).filter((tk) => /\p{L}/u.test(tk.word));
      if (j > i && words.some((tk) => tk.kept)) for (let k = i; k <= j; k++) keep(k);
      i = j + 1;
    }
  }

  // A brand starts a name: Google ›Skillshop‹, Meta ›Ads Manager‹, Principles ›of Marketing‹.
  for (let i = 0; i < tokens.length; i++) {
    if (!tokens[i].starter) continue;
    let j = i;
    while (j + 1 < tokens.length && isNameGap(gapBefore(j + 1), false)) {
      const next = tokens[j + 1];
      if (isNameWord(next.word)) {
        keep(j + 1);
        j++;
        if (splitAposSuffix(next.word) || splitProtected(next.word, m.cfg)) break;
        continue;
      }
      if (JOINERS.has(next.word) && j + 2 < tokens.length && gapBefore(j + 2) === ' ' && isNameWord(tokens[j + 2].word)) {
        keep(j + 1);
        j++;
        continue;
      }
      break;
    }
    i = j;
  }

  let out = '';
  let last = 0;
  for (const tk of tokens) {
    out += text.slice(last, tk.index) + tk.out;
    last = tk.index + tk.word.length;
  }
  return out + text.slice(last);
}

/** Stand-in for a decoded &amp; so "Bain &amp; Company" is read as one name. */
export const AMP = '';

const phraseCache = new WeakMap<TranslitConfig, RegExp | null>();

/** Protected entries with a space ("This Is Marketing", "Uzum Market") are kept as exact phrases. */
function phraseRe(cfg: TranslitConfig): RegExp | null {
  if (phraseCache.has(cfg)) return phraseCache.get(cfg) ?? null;
  const phrases = cfg.protectedWords
    .filter((p) => /\s/.test(p))
    .sort((a, b) => b.length - a.length)
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'));
  const re = phrases.length
    ? new RegExp(String.raw`(?<![\p{L}\p{N}])(?:${phrases.join('|')})(?![\p{L}\p{N}])`, 'gu')
    : null;
  phraseCache.set(cfg, re);
  return re;
}

function mapWords(text: string, m: Mapper, opts: TextOptions = {}): string {
  if (!text) return text;
  const spans: [number, string][] = [];
  for (const x of text.matchAll(PROTECT_RE)) {
    const span = protectedSpan(x[0]);
    if (span) spans.push([x.index ?? 0, span]);
  }
  const pre = phraseRe(m.cfg);
  if (pre) for (const x of text.matchAll(pre)) spans.push([x.index ?? 0, x[0]]);
  spans.sort((a, b) => a[0] - b[0]);
  let out = '';
  let last = 0;
  for (const [at, span] of spans) {
    if (at < last) continue;
    out += mapPlain(text.slice(last, at), m, opts) + span;
    last = at + span.length;
  }
  return out + mapPlain(text.slice(last), m, opts);
}

/** A suffix after a Latin stem, transliterated as the continuation of a word (e → е after a consonant). */
function suffixToCyrillic(suffix: string, stem: string): string {
  const prev = /[aeiouy]$/i.test(stem) ? 'а' : 'б';
  return applyCase(suffix, cyrRules(normApos(suffix).toLowerCase(), prev));
}

export function toCyrillic(text: string, cfg: TranslitConfig, opts: TextOptions = {}): string {
  return mapWords(
    text,
    { cfg, fn: (w) => wordToCyrillic(w, cfg), suffixFn: suffixToCyrillic, dropSuffixApostrophe: true },
    opts,
  );
}

export function toNewLatin(text: string, cfg: TranslitConfig, opts: TextOptions = {}): string {
  return mapWords(
    text,
    { cfg, fn: wordToNewLatin, suffixFn: (suffix) => wordToNewLatin(suffix), dropSuffixApostrophe: false },
    opts,
  );
}

export function transliterateText(text: string, script: Script, cfg: TranslitConfig, opts: TextOptions = {}): string {
  if (script === 'cyrl') return toCyrillic(text, cfg, opts);
  if (script === 'yangi') return toNewLatin(text, cfg, opts);
  return text;
}
