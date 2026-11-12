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
  // Internal capital letter (iPhone, YouTube, LinkedIn) → foreign brand.
  if (/\p{Ll}/u.test(word) && /.\p{Lu}/u.test(word)) return true;
  // Letters the Uzbek Latin alphabet doesn't use.
  if (/w/i.test(word) || /c(?!h)/i.test(word)) return true;
  // Already non-Latin (e.g. Cyrillic quoted in a Latin post).
  if (/[^\p{Script=Latin}\p{N}'‘’ʻʼ`]/u.test(word)) return true;
  return false;
}

function applyCase(source: string, out: string): string {
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

/** Hyphenated all-caps acronym of 1-2 letter parts (E-E-A-T): stays Latin, so single letters in it are not initials. */
const HYPHEN_ACRONYM = String.raw`(?<![\p{L}\p{N}-])[A-Z]{1,2}(?:-[A-Z]{1,2})+(?![\p{L}\p{N}-])`;
const PLAIN_RE = new RegExp(`${HYPHEN_ACRONYM}|${WORD_RE.source}`, 'gu');
const HYPHEN_ACRONYM_FULL = /^[A-Z]{1,2}(?:-[A-Z]{1,2})+$/;

function mapPlain(text: string, cfg: TranslitConfig, fn: WordFn, suffixFn: (suffix: string, stem: string) => string): string {
  return text.replace(PLAIN_RE, (word) => {
    if (HYPHEN_ACRONYM_FULL.test(word)) return word;
    const split = splitProtected(word, cfg);
    if (split) return split[0] + split[1] + suffixFn(split[2], split[0]);
    return shouldKeep(word, cfg) ? word : fn(word);
  });
}

function mapWords(text: string, cfg: TranslitConfig, fn: WordFn, suffixFn: (suffix: string, stem: string) => string): string {
  if (!text) return text;
  let out = '';
  let last = 0;
  for (const m of text.matchAll(PROTECT_RE)) {
    const span = protectedSpan(m[0]);
    if (!span) continue;
    const at = m.index ?? 0;
    if (at < last) continue;
    out += mapPlain(text.slice(last, at), cfg, fn, suffixFn) + span;
    last = at + span.length;
  }
  return out + mapPlain(text.slice(last), cfg, fn, suffixFn);
}

/** A suffix after a Latin stem, transliterated as the continuation of a word (e → е after a consonant). */
function suffixToCyrillic(suffix: string, stem: string): string {
  const prev = /[aeiouy]$/i.test(stem) ? 'а' : 'б';
  return applyCase(suffix, cyrRules(normApos(suffix).toLowerCase(), prev));
}

export function toCyrillic(text: string, cfg: TranslitConfig): string {
  return mapWords(text, cfg, (w) => wordToCyrillic(w, cfg), suffixToCyrillic);
}

export function toNewLatin(text: string, cfg: TranslitConfig): string {
  return mapWords(text, cfg, wordToNewLatin, (suffix) => wordToNewLatin(suffix));
}

export function transliterateText(text: string, script: Script, cfg: TranslitConfig): string {
  if (script === 'cyrl') return toCyrillic(text, cfg);
  if (script === 'yangi') return toNewLatin(text, cfg);
  return text;
}
