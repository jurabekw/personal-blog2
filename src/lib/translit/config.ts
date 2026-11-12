import { DEFAULT_EXCEPTIONS, DEFAULT_PROTECTED_WORDS, DEFAULT_TRANSLIT_CONFIG, makeTranslitConfig } from './defaults';
import type { AlphabetSettings, TranslitConfig } from './types';

let last: { key: string; cfg: TranslitConfig } | null = null;

/** Builds the active config from the alphabets settings. Admin-saved lists replace the built-in ones. */
export function getTranslitConfig(alphabets?: AlphabetSettings | null): TranslitConfig {
  const a = alphabets;
  if (!a) return DEFAULT_TRANSLIT_CONFIG;
  const key = JSON.stringify([a.exceptions, a.protectedWords]);
  if (last?.key === key) return last.cfg;
  const cfg = makeTranslitConfig(
    a.exceptions && Object.keys(a.exceptions).length ? a.exceptions : DEFAULT_EXCEPTIONS,
    Array.isArray(a.protectedWords) && a.protectedWords.length ? a.protectedWords : DEFAULT_PROTECTED_WORDS,
  );
  last = { key, cfg };
  return cfg;
}

export function indexNewLatin(alphabets?: AlphabetSettings | null): boolean {
  return alphabets?.indexNewLatin !== false;
}
