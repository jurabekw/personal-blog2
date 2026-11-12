import { transliterateText } from '@/lib/translit'
import type { Script, TranslitConfig } from '@/lib/translit'

import { t, type UiStrings } from '@/lib/ui-strings'

export { t, type UiStrings }

const tCache = new Map<string, UiStrings>()

/** The UI string table in the requested script (strings and function results transliterated). */
export function getT(script: Script, cfg: TranslitConfig): UiStrings {
  if (script === 'latn') return t
  const key = `${script}|${cfg.version}`
  const hit = tCache.get(key)
  if (hit) return hit
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(t)) {
    if (typeof v === 'string') out[k] = transliterateText(v, script, cfg)
    else if (typeof v === 'function') {
      const fn = v as (...args: unknown[]) => string
      out[k] = (...args: unknown[]) => transliterateText(fn(...args), script, cfg)
    } else out[k] = v
  }
  const res = out as UiStrings
  tCache.set(key, res)
  return res
}
