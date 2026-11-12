import type { Script, TranslitConfig } from './types.js';

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

/** Mostly-uppercase input (e.g. an ALL CAPS heading): short caps words are words, not acronyms. */
function isCapsText(text: string): boolean {
  const letters = text.match(/\p{L}/gu) || [];
  if (letters.length === 0) return false;
  const upper = letters.filter((l) => l !== l.toLowerCase() && l === l.toUpperCase()).length;
  return upper / letters.length > 0.6;
}

function shouldKeep(word: string, cfg: TranslitConfig, capsText: boolean): boolean {
  const lower = word.toLowerCase();
  if (cfg.protectedWords.some((p) => p.toLowerCase() === lower)) return true;
  if (/\p{N}/u.test(word) && /\p{L}/u.test(word) && !/^\p{N}+$/u.test(word) && isAllCaps(word)) return true;
  if (!capsText && isAllCaps(word) && word.replace(APOS_RE, '').length >= 2 && word.replace(APOS_RE, '').length <= 5) {
    return true;
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

function mapWords(text: string, cfg: TranslitConfig, fn: (word: string) => string): string {
  if (!text) return text;
  const capsText = isCapsText(text);
  return text.replace(WORD_RE, (word) => (shouldKeep(word, cfg, capsText) ? word : fn(word)));
}

export function toCyrillic(text: string, cfg: TranslitConfig): string {
  return mapWords(text, cfg, (w) => wordToCyrillic(w, cfg));
}

export function toNewLatin(text: string, cfg: TranslitConfig): string {
  return mapWords(text, cfg, wordToNewLatin);
}

export function transliterateText(text: string, script: Script, cfg: TranslitConfig): string {
  if (script === 'cyrl') return toCyrillic(text, cfg);
  if (script === 'yangi') return toNewLatin(text, cfg);
  return text;
}
