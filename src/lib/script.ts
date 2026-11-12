import type { Script } from '@/lib/translit/types'

export type { Script }

export const SCRIPTS = ['latn', 'cyrl', 'yangi'] as const

export const SCRIPT_PREFIX: Record<Script, string> = { latn: '', cyrl: '/kirill', yangi: '/yangi' }
export const HTML_LANG: Record<Script, string> = { latn: 'uz-Latn', cyrl: 'uz-Cyrl', yangi: 'uz-Latn' }
export const SCRIPT_LABEL: Record<Script, string> = { latn: "O'zbek", cyrl: 'Ўзбек', yangi: 'Özbek' }

export function isScript(v: unknown): v is Script {
  return typeof v === 'string' && (SCRIPTS as readonly string[]).includes(v)
}

/** Top-level segments that are never script-prefixed. */
const SKIP_SEGMENTS = ['admin', 'api', 'uploads', 'wp-content', 'og', 'fonts', 'images']

function hasScriptPrefix(path: string): boolean {
  return (['/kirill', '/yangi'] as const).some((p) => path === p || path.startsWith(p + '/'))
}

function isSkipped(path: string): boolean {
  if (SKIP_SEGMENTS.some((s) => path === `/${s}` || path.startsWith(`/${s}/`))) return true
  const last = path.slice(path.lastIndexOf('/') + 1)
  return /\.[a-z0-9]+$/i.test(last) // static file with an extension
}

/**
 * Adds the script prefix to a site link. External URLs, anchors, mailto/tel, assets and
 * system routes are returned unchanged; already-prefixed paths are returned unchanged.
 * Absolute URLs on `siteUrl` come back site-relative.
 */
export function withScript(script: Script, href: string, siteUrl?: string): string {
  if (!href) return href
  let rel = href
  if (/^https?:\/\//i.test(href)) {
    const origin = siteUrl?.replace(/\/+$/, '')
    if (!origin || !href.startsWith(origin)) return href
    const rest = href.slice(origin.length)
    if (rest !== '' && !/^[/?#]/.test(rest)) return href // e.g. https://www.jurabek.blog.evil.com
    rel = rest === '' ? '/' : rest[0] === '/' ? rest : `/${rest}`
  } else if (!rel.startsWith('/') || rel.startsWith('//')) {
    return href
  }
  if (script === 'latn') return rel
  const cut = rel.search(/[?#]/)
  const path = cut === -1 ? rel : rel.slice(0, cut)
  const suffix = cut === -1 ? '' : rel.slice(cut)
  if (hasScriptPrefix(path) || isSkipped(path)) return rel
  return SCRIPT_PREFIX[script] + path + suffix
}

/** Splits a request pathname into its script and the unprefixed path. */
export function stripScript(pathname: string): { script: Script; path: string } {
  for (const script of ['cyrl', 'yangi'] as const) {
    const p = SCRIPT_PREFIX[script]
    if (pathname === p) return { script, path: '/' }
    if (pathname.startsWith(p + '/')) return { script, path: pathname.slice(p.length) }
  }
  return { script: 'latn', path: pathname }
}

/** Equivalent paths in every script for an unprefixed path. */
export function alternatePaths(path: string): { latn: string; cyrl: string; yangi: string } {
  const base = stripScript(path).path
  return {
    latn: base,
    cyrl: SCRIPT_PREFIX.cyrl + base,
    yangi: SCRIPT_PREFIX.yangi + base,
  }
}
