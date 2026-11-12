import { getSettings, resolveSiteUrl } from '@/lib/data/settings'
import { getTranslitConfig, type TranslitConfig } from '@/lib/translit'
import { localizePost, localizeSettings, localizeTerm } from '@/lib/localize'
import { withScript, type Script } from '@/lib/script'
import type { AllSettings } from '@/lib/settings-defaults'
import type { PostFull, PostSummary, TermRef } from '@/lib/data/posts'

export type { Script }

/** Per-request alphabet context: the transliteration config and localized settings. */
export async function alphabetContext(script: Script) {
  const raw = await getSettings()
  const siteUrl = resolveSiteUrl(raw)
  const cfg = getTranslitConfig(raw.alphabets)
  return { raw, siteUrl, cfg, settings: localizeSettings(raw, script, cfg, siteUrl) }
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
