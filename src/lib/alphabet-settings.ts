import type { AlphabetSettings } from '@/lib/translit/types'
import { DEFAULT_EXCEPTIONS, DEFAULT_PROTECTED_WORDS, makeTranslitConfig } from '@/lib/translit/defaults'

export const MAX_EXCEPTIONS = 2000
export const MAX_PROTECTED_WORDS = 1000
const MAX_LEN = 100

export type AlphabetSettingsResult =
  | { ok: true; value: AlphabetSettings }
  | { ok: false; error: string; field: 'exceptions' | 'protectedWords'; row?: number }

/** One current-Latin word: letters/digits with optional apostrophes (oʻ, gʻ, tutuq belgisi). */
const KEY_RE = /^[\p{Script=Latin}\p{N}']+$/u
/** Uzbek/Russian Cyrillic letters only (а–я incl. ъ ь, plus ё ў қ ғ ҳ). */
const VALUE_RE = /^[а-яёўқғҳ]+$/u

/**
 * Validates the Settings → Alifbolar form.
 * Fields: repeated `exceptionKey` / `exceptionValue`, `protectedWords` (one per line), `indexNewLatin` (checkbox).
 * `clean` runs on every raw key, value and word first (the server action passes `sanitizePlain`).
 */
export function parseAlphabetSettings(formData: FormData, clean: (s: string) => string = (s) => s): AlphabetSettingsResult {
  const str = (v: FormDataEntryValue | null | undefined) => (typeof v === 'string' ? clean(v) : '')
  const keys = formData.getAll('exceptionKey')
  const values = formData.getAll('exceptionValue')
  const rows = Math.max(keys.length, values.length)

  const exceptions: Record<string, string> = {}
  let count = 0
  for (let i = 0; i < rows; i++) {
    const row = i + 1
    const key = str(keys[i]).trim().toLowerCase().replace(/[‘’ʻʼ`]/g, "'")
    const value = str(values[i]).trim().toLowerCase()
    if (!key && !value) continue
    if (!key) return { ok: false, field: 'exceptions', row, error: `${row}-qator: lotincha soʻz kiritilmagan.` }
    if (!value) return { ok: false, field: 'exceptions', row, error: `${row}-qator: “${key}” uchun kirillcha yozuv kiritilmagan.` }
    if (key.length > MAX_LEN || !KEY_RE.test(key)) {
      return { ok: false, field: 'exceptions', row, error: `${row}-qator: “${key}” bitta lotincha soʻz boʻlishi kerak.` }
    }
    if (value.length > MAX_LEN || !VALUE_RE.test(value)) {
      return { ok: false, field: 'exceptions', row, error: `${row}-qator: “${value}” faqat kirill harflaridan iborat boʻlishi kerak.` }
    }
    if (Object.hasOwn(exceptions, key)) return { ok: false, field: 'exceptions', row, error: `${row}-qator: “${key}” ikki marta kiritilgan.` }
    if (++count > MAX_EXCEPTIONS) return { ok: false, field: 'exceptions', error: `Istisnolar ${MAX_EXCEPTIONS} tadan oshmasligi kerak.` }
    exceptions[key] = value
  }

  const protectedWords: string[] = []
  const seen = new Set<string>()
  const lines = str(formData.get('protectedWords')).split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    // An entry with spaces is an exact phrase ("This Is Marketing"); inner whitespace becomes one space.
    const word = lines[i].trim().replace(/\s+/gu, ' ')
    if (!word || seen.has(word.toLowerCase())) continue
    if (word.length > MAX_LEN) return { ok: false, field: 'protectedWords', error: `“${word.slice(0, 30)}…” juda uzun (${MAX_LEN} belgidan oshmasin).` }
    seen.add(word.toLowerCase())
    protectedWords.push(word)
  }
  if (protectedWords.length > MAX_PROTECTED_WORDS) {
    return { ok: false, field: 'protectedWords', error: `Himoyalangan soʻzlar ${MAX_PROTECTED_WORDS} tadan oshmasligi kerak.` }
  }

  const index = formData.get('indexNewLatin')
  // Lists equal to the built-in ones are stored empty, so later built-in improvements still apply.
  return {
    ok: true,
    value: {
      exceptions: sameExceptions(exceptions) ? {} : exceptions,
      protectedWords: sameWords(protectedWords) ? [] : protectedWords,
      indexNewLatin: index === 'on' || index === 'true' || index === '1',
    },
  }
}

const DEFAULTS = makeTranslitConfig(DEFAULT_EXCEPTIONS, DEFAULT_PROTECTED_WORDS)

function sameExceptions(e: Record<string, string>): boolean {
  const keys = Object.keys(e)
  return keys.length === Object.keys(DEFAULTS.exceptions).length && keys.every((k) => DEFAULTS.exceptions[k] === e[k])
}

function sameWords(words: string[]): boolean {
  const set = new Set(DEFAULTS.protectedWords)
  return words.length === set.size && words.every((w) => set.has(w))
}
