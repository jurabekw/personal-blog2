'use client'

import { useEffect, useState } from 'react'
import { HTML_LANG, type Script } from '@/lib/script'
import { switcherLinks } from '@/lib/switcher'

type Gtag = (command: 'event', name: string, params: Record<string, string>) => void

function remember(from: Script, to: Script) {
  document.cookie = `jb_script=${to}; Max-Age=31536000; Path=/; SameSite=Lax`
  const gtag = (window as unknown as { gtag?: Gtag }).gtag
  if (typeof gtag === 'function') gtag('event', 'switch_alphabet', { from, to })
}

/**
 * O'zbek · Ўзбек · Özbek — plain links (crawlable) to the same page in each alphabet.
 * `path` is the current pathname (with or without an alphabet prefix).
 */
export function AlphabetSwitcher({
  script,
  path,
  label,
  className,
}: {
  script: Script
  path: string
  label?: string
  className?: string
}) {
  // Search results keep their query; read it after hydration so static pages stay static.
  const [search, setSearch] = useState('')
  useEffect(() => {
    setSearch(window.location.search)
  }, [path])

  return (
    <nav className={`jb-alphabets${className ? ` ${className}` : ''}`} aria-label={label}>
      <ul>
        {switcherLinks(script, path, search).map((l) => (
          <li key={l.script}>
            <a
              className={`jb-alphabets__link${l.active ? ' is-active' : ''}`}
              href={l.href}
              // Özbek (new Latin) shares uz-Latn with O'zbek and has no hreflang alternate of its own.
              hrefLang={l.script === 'yangi' ? undefined : HTML_LANG[l.script]}
              lang={HTML_LANG[l.script]}
              aria-current={l.active ? 'true' : undefined}
              onClick={() => remember(script, l.script)}
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
