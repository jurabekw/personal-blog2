import type { PostFull, PostSummary, TermRef } from '@/lib/data/posts'
import type { AllSettings } from '@/lib/settings-defaults'
import type { MenuItem } from '@/lib/types'
import { transliterateHtml, transliterateText } from '@/lib/translit'
import type { Script, TranslitConfig } from '@/lib/translit'
import { withScript } from '@/lib/script'

/** Transliterates plain text but leaves %%variable%% tokens untouched. */
function tx(text: string, script: Script, cfg: TranslitConfig): string {
  if (!text) return text
  if (!text.includes('%%')) return transliterateText(text, script, cfg)
  return text
    .split(/(%%[a-z_]+%%)/i)
    .map((part) => (/^%%[a-z_]+%%$/i.test(part) ? part : transliterateText(part, script, cfg)))
    .join('')
}

const html = (v: string, script: Script, cfg: TranslitConfig) => (v ? transliterateHtml(v, script, cfg) : v)

/** Applies `tx` to the listed string fields of `o` (only those that are non-empty strings). */
function mapFields<T extends object>(o: T, keys: readonly (keyof T)[], script: Script, cfg: TranslitConfig): T {
  const out = { ...o }
  for (const k of keys) {
    const v = o[k]
    if (typeof v === 'string') (out as Record<keyof T, unknown>)[k] = tx(v, script, cfg)
  }
  return out
}

const TERM_SEO_KEYS = ['title', 'metaDescription', 'breadcrumbTitle', 'ogTitle', 'ogDescription', 'twitterTitle', 'twitterDescription'] as const
const POST_SEO_KEYS = TERM_SEO_KEYS

export function localizeTerm(term: TermRef, script: Script, cfg: TranslitConfig): TermRef {
  if (script === 'latn') return term
  return {
    ...term,
    name: tx(term.name, script, cfg),
    description: tx(term.description, script, cfg),
    seo: mapFields(term.seo ?? {}, TERM_SEO_KEYS, script, cfg),
  }
}

const MEMO_MAX = 1000
const memo = new Map<string, unknown>()

/** Cheap fingerprint of text that is embedded in a post but changes without bumping post.updatedAt. */
function embeddedFingerprint(p: PostSummary | PostFull): string {
  const termFp = (t: TermRef | null | undefined) =>
    t ? [t.name, t.description, JSON.stringify(t.seo ?? {})].join('\u0001') : ''
  const full = 'content' in p ? (p as PostFull) : null
  return [
    full ? `f${full.content.length}` : 's', // list-shaped posts carry content ''
    p.image?.alt ?? '',
    termFp(p.category),
    full ? full.categories?.map(termFp).join('\u0002') : '',
    full ? full.tags?.map(termFp).join('\u0002') : '',
  ].join('\u0003')
}

export function localizePost<T extends PostSummary | PostFull>(p: T, script: Script, cfg: TranslitConfig): T {
  if (script === 'latn') return p
  const key = `${p.id}|${p.updatedAt.getTime()}|${script}|${cfg.version}|${embeddedFingerprint(p)}`
  const hit = memo.get(key)
  if (hit) return hit as T

  const out: PostSummary = {
    ...p,
    title: tx(p.title, script, cfg),
    excerpt: tx(p.excerpt, script, cfg),
    image: p.image ? { ...p.image, alt: tx(p.image.alt, script, cfg) } : p.image,
    category: p.category ? localizeTerm(p.category, script, cfg) : p.category,
  }
  if ('content' in p) {
    const f = p as PostFull
    const o = out as PostFull
    o.content = html(f.content, script, cfg)
    o.categories = (f.categories ?? []).map((c) => localizeTerm(c, script, cfg))
    o.tags = (f.tags ?? []).map((c) => localizeTerm(c, script, cfg))
    o.seo = mapFields(f.seo ?? {}, POST_SEO_KEYS, script, cfg)
    o.faq = (f.faq ?? []).map((q) => ({
      question: tx(q.question, script, cfg),
      answer: html(q.answer, script, cfg),
    }))
  }

  if (memo.size >= MEMO_MAX) {
    const oldest = memo.keys().next().value
    if (oldest !== undefined) memo.delete(oldest)
  }
  memo.set(key, out)
  return out as T
}

function localizeMenu(items: MenuItem[], script: Script, cfg: TranslitConfig, siteUrl: string): MenuItem[] {
  return items.map((m) => ({
    ...m,
    label: tx(m.label, script, cfg),
    url: withScript(script, m.url, siteUrl),
    ...(m.children ? { children: localizeMenu(m.children, script, cfg, siteUrl) } : {}),
  }))
}

export function localizeSettings(s: AllSettings, script: Script, cfg: TranslitConfig, siteUrl = ''): AllSettings {
  if (script === 'latn') return s
  const a = s.appearance
  return {
    ...s,
    general: mapFields(s.general, ['siteName', 'tagline'], script, cfg),
    appearance: {
      ...mapFields(a, ['headerCtaText', 'blogTitle', 'blogIntro', 'footerText', 'footerLinksTitle'], script, cfg),
      homeContent: html(a.homeContent, script, cfg),
      author: mapFields(a.author, ['name', 'role', 'bio'], script, cfg),
      hero: mapFields(a.hero, ['badge', 'title', 'text'], script, cfg),
      sidebar: {
        about: mapFields(a.sidebar.about, ['title'], script, cfg),
        blogNav: mapFields(a.sidebar.blogNav, ['title'], script, cfg),
        toc: mapFields(a.sidebar.toc, ['title'], script, cfg),
      },
    },
    menus: {
      primary: localizeMenu(s.menus.primary, script, cfg, siteUrl),
      footer: localizeMenu(s.menus.footer, script, cfg, siteUrl),
    },
    seo: {
      ...s.seo,
      breadcrumbs: mapFields(s.seo.breadcrumbs, ['homeLabel'], script, cfg),
      // Displayed in JSON-LD (Person / Organization); URLs and image paths stay as they are.
      siteRepresentation: mapFields(
        s.seo.siteRepresentation,
        ['personName', 'personDescription', 'personJobTitle', 'orgName', 'orgAlternateName'],
        script,
        cfg,
      ),
    },
  }
}
