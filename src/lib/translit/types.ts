export type Script = 'latn' | 'cyrl' | 'yangi';

export interface TranslitConfig {
  /** Current-Latin word or stem (lowercase) → Cyrillic replacement (lowercase). */
  exceptions: Record<string, string>;
  /** Words that always stay in Latin (matched case-insensitively). */
  protectedWords: string[];
  /** Short hash of exceptions + protectedWords; part of every cache key. */
  version: string;
}

/** The `alphabets` settings group (added to site settings in a later task). */
export interface AlphabetSettings {
  exceptions: Record<string, string>;
  protectedWords: string[];
  indexNewLatin: boolean;
}
