import { SCRIPTS, SCRIPT_LABEL, alternatePaths, stripScript, type Script } from '@/lib/script'

export interface SwitcherLink {
  script: Script
  label: string
  href: string
  active: boolean
}

/**
 * Links to the current page in every alphabet (O'zbek · Ўзбек · Özbek).
 * Query strings are dropped, except `q` on the search page.
 */
export function switcherLinks(script: Script, pathname: string, search = ''): SwitcherLink[] {
  const { path } = stripScript(pathname || '/')
  const base = path.endsWith('/') ? path : `${path}/`
  const alt = alternatePaths(base)
  let query = ''
  if (base === '/search/' && search) {
    const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('q')
    if (q) query = `?q=${encodeURIComponent(q)}`
  }
  return SCRIPTS.map((s) => ({ script: s, label: SCRIPT_LABEL[s], href: alt[s] + query, active: s === script }))
}
