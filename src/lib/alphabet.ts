import { cache } from 'react'
import { getSettings, resolveSiteUrl } from '@/lib/data/settings'
import { getTranslitConfig, type TranslitConfig } from '@/lib/translit'
import { localizePost, localizeSettings, localizeTerm } from '@/lib/localize'
import { withScript, type Script } from '@/lib/script'
import { getT, type UiStrings } from '@/lib/i18n'
import type { AllSettings } from '@/lib/settings-defaults'
import type { PostFull, PostSummary, TermRef } from '@/lib/data/posts'

export type { Script }

/** Per-request alphabet context: the transliteration config and localized settings (memoized per request). */
export const alphabetContext = cache(async (script: Script) => {
  const raw = await getSettings()
  const siteUrl = resolveSiteUrl(raw)
  const cfg = getTranslitConfig(raw.alphabets)
  return { raw, siteUrl, cfg, settings: localizeSettings(raw, script, cfg, siteUrl), ui: uiFor(script, cfg, siteUrl) }
})

/** What chrome components need to render in an alphabet: UI strings, config and a link mapper. */
export interface Ui {
  script: Script
  t: UiStrings
  cfg: TranslitConfig
  siteUrl: string
  /** Internal link in this alphabet's tree (identity for latn, so Latin markup never changes). */
  href: (href: string) => string
}

export function uiFor(script: Script, cfg: TranslitConfig, siteUrl: string): Ui {
  return { script, t: getT(script, cfg), cfg, siteUrl, href: (h) => scriptHref(script, h, siteUrl) }
}

/** Localizes already-loaded data for `script` (identity for latn). Never mutates its inputs. */
export function localizer(script: Script, cfg: TranslitConfig, siteUrl: string) {
  return {
    post: <T extends PostSummary | PostFull>(p: T): T => localizePost(p, script, cfg),
    posts: <T extends PostSummary>(ps: T[]): T[] => (script === 'latn' ? ps : ps.map((p) => localizePost(p, script, cfg))),
    term: (t: TermRef): TermRef => localizeTerm(t, script, cfg),
    terms: (ts: TermRef[]): TermRef[] => (script === 'latn' ? ts : ts.map((t) => localizeTerm(t, script, cfg))),
    settings: (s: AllSettings): AllSettings => localizeSettings(s, script, cfg, siteUrl),
  }
}

/**
 * Redirect target inside the current alphabet's tree. Latin targets are returned untouched,
 * so the Latin site behaves exactly as before.
 */
export function scriptHref(script: Script, href: string, siteUrl?: string): string {
  return script === 'latn' ? href : withScript(script, href, siteUrl)
}

/**
 * Managed-redirect / canonicalisation target inside the current alphabet's tree. Absolute
 * same-site targets stay in the alphabet too. Latin targets are returned untouched.
 */
export async function redirectHref(script: Script, href: string): Promise<string> {
  if (script === 'latn') return href
  return scriptHref(script, href, resolveSiteUrl(await getSettings()))
}
