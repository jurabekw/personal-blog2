import { SCRIPT_PREFIX, withScript, type Script } from '@/lib/script'

const A_HREF = /(<a\b[^>]*?\shref\s*=\s*)("([^"]*)"|'([^']*)')/gi

/**
 * Keeps in-content links inside the page's alphabet: same-site `<a href>` values (root-relative,
 * or absolute on `siteUrl`) get the alphabet prefix. External links, anchors, assets, system
 * routes and already-prefixed links are left exactly as written. Identity for latn.
 */
export function scriptContentLinks(html: string, script: Script, siteUrl?: string): string {
  if (script === 'latn' || !html) return html
  const prefix = SCRIPT_PREFIX[script] + '/'
  return html.replace(A_HREF, (match, head: string, quoted: string, dq?: string, sq?: string) => {
    const href = dq ?? sq ?? ''
    const out = withScript(script, href, siteUrl)
    if (out === href || !out.startsWith(prefix)) return match
    const q = quoted[0]
    return `${head}${q}${out}${q}`
  })
}
