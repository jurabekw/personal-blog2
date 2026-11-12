'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { MenuItem } from '@/lib/types'
import { stripScript, type Script } from '@/lib/script'
import { t } from '@/lib/ui-strings'
import { Brand } from './Brand'
import { AlphabetSwitcher } from './AlphabetSwitcher'

/** Header UI text, transliterated on the server for the page's alphabet. */
export type HeaderStrings = Pick<typeof t, 'mainMenu' | 'openMenu' | 'darkModeOn' | 'lightModeOn' | 'alphabets'>

interface HeaderProps {
  siteName: string
  tagline: string
  logoUrl: string
  menu: MenuItem[]
  ctaText: string
  ctaUrl: string
  script: Script
  /** Defaults to the Latin strings. */
  strings?: HeaderStrings
  homeHref?: string
}

/** Compares paths without the alphabet prefix, so /kirill/ is not "current" on every /kirill/… page. */
function isCurrent(pathname: string, url: string): boolean {
  if (/^https?:\/\//.test(url)) return false
  const clean = (p: string) => (p.endsWith('/') ? p : p + '/')
  const page = stripScript(pathname).path
  const target = url === '' ? '/' : stripScript(url).path
  if (target === '/' || target === '') return page === '/'
  return clean(page).startsWith(clean(target))
}

function MenuLinks({ items, pathname, home, depth = 0 }: { items: MenuItem[]; pathname: string; home: string; depth?: number }) {
  return (
    <ul className={depth ? 'sub-menu' : undefined}>
      {items.map((item) => {
        const current = isCurrent(pathname, item.url)
        const external = /^https?:\/\//.test(item.url)
        return (
          <li key={item.id} className={current ? 'current-menu-item' : undefined}>
            {external ? (
              <a href={item.url} target={item.newTab ? '_blank' : undefined} rel={item.newTab ? 'noopener noreferrer' : undefined}>
                {item.label}
              </a>
            ) : (
              <Link href={item.url || home} aria-current={current && pathname === item.url ? 'page' : undefined}>
                {item.label}
              </Link>
            )}
            {item.children?.length && depth < 1 ? <MenuLinks items={item.children} pathname={pathname} home={home} depth={depth + 1} /> : null}
          </li>
        )
      })}
    </ul>
  )
}

export function ThemeToggle({ strings = t }: { strings?: Pick<HeaderStrings, 'darkModeOn' | 'lightModeOn'> }) {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.getAttribute('data-theme') === 'dark')
  }, [])

  const toggle = () => {
    const next = !dark
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    try {
      localStorage.setItem('jb-theme', next ? 'dark' : 'light')
    } catch {
      /* storage unavailable */
    }
    setDark(next)
  }

  return (
    <button
      className="jb-theme-toggle"
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? strings.lightModeOn : strings.darkModeOn}
      onClick={toggle}
      suppressHydrationWarning
    >
      <span className="jb-theme-toggle__track" aria-hidden="true">
        <svg className="jb-theme-toggle__icon jb-theme-toggle__icon--sun" viewBox="0 0 24 24" focusable="false">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
        </svg>
        <svg className="jb-theme-toggle__icon jb-theme-toggle__icon--moon" viewBox="0 0 24 24" focusable="false">
          <path d="M20.4 15.2A8.6 8.6 0 0 1 8.8 3.6 8.6 8.6 0 1 0 20.4 15.2Z" />
        </svg>
        <span className="jb-theme-toggle__thumb" />
      </span>
    </button>
  )
}

export function Header({ siteName, tagline, logoUrl, menu, ctaText, ctaUrl, script, strings = t, homeHref = '/' }: HeaderProps) {
  const pathname = usePathname() || '/'
  const [open, setOpen] = useState(false)

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className="jb-header">
      <div className="jb-shell jb-header__inner">
        <Brand siteName={siteName} tagline={tagline} logoUrl={logoUrl} href={homeHref} />

        {menu.length ? (
          <nav className="jb-nav" aria-label={strings.mainMenu}>
            <MenuLinks items={menu} pathname={pathname} home={homeHref} />
          </nav>
        ) : null}

        <div className="jb-header__actions">
          <AlphabetSwitcher
            script={script}
            path={pathname}
            label={strings.alphabets}
            className={menu.length ? 'jb-alphabets--desktop' : undefined}
          />
          <ThemeToggle strings={strings} />
          {ctaText && ctaUrl ? (
            <a className="jb-btn jb-btn--primary" href={ctaUrl}>
              {ctaText}
            </a>
          ) : null}
          {menu.length ? (
            <button
              className="jb-menu-toggle"
              type="button"
              aria-expanded={open}
              aria-controls="jb-mobile-nav"
              aria-label={strings.openMenu}
              onClick={() => setOpen((v) => !v)}
            >
              <span aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      {menu.length ? (
        <div id="jb-mobile-nav" className={`jb-mobile-nav${open ? ' is-open' : ''}`}>
          <div className="jb-shell">
            <MenuLinks items={menu} pathname={pathname} home={homeHref} />
            <AlphabetSwitcher script={script} path={pathname} label={strings.alphabets} className="jb-alphabets--mobile" />
          </div>
        </div>
      ) : null}
    </header>
  )
}
