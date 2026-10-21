'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  ExternalLink,
  FileText,
  Gauge,
  Image as ImageIcon,
  Import,
  LayoutDashboard,
  LogOut,
  Menu,
  Palette,
  Pin,
  Settings,
  User,
  Users,
} from 'lucide-react'
import { logoutAction } from '@/app/admin/_actions/auth'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number }>
  match?: string[]
  sub?: { href: string; label: string; exact?: boolean }[]
  cap?: 'admin' | 'editor'
}

const NAV: (NavItem | 'sep')[] = [
  { href: '/admin/', label: 'Dashboard', icon: LayoutDashboard },
  'sep',
  {
    href: '/admin/posts/',
    label: 'Posts',
    icon: Pin,
    match: ['/admin/posts', '/admin/categories', '/admin/tags'],
    sub: [
      { href: '/admin/posts/', label: 'All Posts', exact: true },
      { href: '/admin/posts/new/', label: 'Add New Post' },
      { href: '/admin/categories/', label: 'Categories' },
      { href: '/admin/tags/', label: 'Tags' },
    ],
  },
  { href: '/admin/media/', label: 'Media', icon: ImageIcon },
  {
    href: '/admin/pages/',
    label: 'Pages',
    icon: FileText,
    sub: [
      { href: '/admin/pages/', label: 'All Pages', exact: true },
      { href: '/admin/pages/new/', label: 'Add New Page' },
    ],
  },
  'sep',
  {
    href: '/admin/appearance/',
    label: 'Appearance',
    icon: Palette,
    match: ['/admin/appearance', '/admin/menus'],
    cap: 'admin',
    sub: [
      { href: '/admin/appearance/', label: 'Customize' },
      { href: '/admin/menus/', label: 'Menus' },
    ],
  },
  {
    href: '/admin/seo/',
    label: 'SEO',
    icon: Gauge,
    cap: 'editor',
    sub: [
      { href: '/admin/seo/', label: 'Settings', exact: true },
      { href: '/admin/seo/redirects/', label: 'Redirects' },
      { href: '/admin/seo/tools/', label: 'Tools' },
    ],
  },
  {
    href: '/admin/users/',
    label: 'Users',
    icon: Users,
    match: ['/admin/users', '/admin/profile'],
    sub: [
      { href: '/admin/users/', label: 'All Users' },
      { href: '/admin/profile/', label: 'Profile' },
    ],
  },
  {
    href: '/admin/settings/',
    label: 'Settings',
    icon: Settings,
    cap: 'admin',
    sub: [
      { href: '/admin/settings/', label: 'General', exact: true },
      { href: '/admin/settings/?tab=reading', label: 'Reading' },
    ],
  },
  { href: '/admin/import/', label: 'Import', icon: Import, cap: 'admin' },
]

export function AdminShell({
  children,
  siteName,
  user,
}: {
  children: React.ReactNode
  siteName: string
  user: { name: string; email: string; role: string }
}) {
  const pathname = usePathname() || '/admin/'
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [pathname])

  const allowed = (item: NavItem) =>
    !item.cap || user.role === 'administrator' || (item.cap === 'editor' && user.role === 'editor')

  const isActive = (item: NavItem) => {
    const roots = item.match ?? [item.href.replace(/\/$/, '')]
    if (item.href === '/admin/') return pathname === '/admin/' || pathname === '/admin'
    return roots.some((r) => pathname.startsWith(r))
  }

  return (
    <div className={`wpa-shell${open ? ' is-menu-open' : ''}`}>
      <div className="wpa-topbar">
        <button className="wpa-menu-btn" type="button" onClick={() => setOpen((v) => !v)} aria-label="Menu">
          <Menu size={18} />
        </button>
        <a className="wpa-topbar__brand" href="/" target="_blank" rel="noreferrer">
          <span className="wpa-topbar__mark">{Array.from(siteName)[0]}</span>
          {siteName}
          <ExternalLink size={13} />
        </a>
        <Link href="/admin/posts/new/">+ New post</Link>
        <span className="wpa-topbar__spacer" />
        <Link href="/admin/profile/">
          <User size={15} /> {user.name}
        </Link>
        <form action={logoutAction}>
          <button type="submit">
            <LogOut size={15} /> Log out
          </button>
        </form>
      </div>

      <aside className="wpa-side" aria-label="Admin menu">
        <nav>
          <ul className="wpa-side__group">
            {NAV.map((entry, i) => {
              let item = entry
              if (item === 'sep') return <li key={`sep${i}`} className="wpa-side__sep" aria-hidden="true" />
              if (!allowed(item)) return null
              if (item.label === 'Users' && user.role !== 'administrator') {
                item = { ...item, label: 'Profile', href: '/admin/profile/', sub: undefined }
              }
              const active = isActive(item)
              const Icon = item.icon
              return (
                <li key={item.href}>
                  <Link className={`wpa-side__link${active ? ' is-active' : ''}`} href={item.href}>
                    <Icon size={18} />
                    {item.label}
                  </Link>
                  {active && item.sub ? (
                    <ul className="wpa-side__sub">
                      {item.sub.map((s) => {
                        const subActive = s.exact ? pathname === s.href.split('?')[0] : pathname.startsWith(s.href.split('?')[0])
                        return (
                          <li key={s.href}>
                            <Link href={s.href} className={subActive ? 'is-active' : undefined}>
                              {s.label}
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>

      <main className="wpa-main">
        <div className="wpa-main__inner">{children}</div>
      </main>
    </div>
  )
}
