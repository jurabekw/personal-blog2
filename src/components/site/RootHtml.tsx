import type { Metadata, Viewport } from 'next'
import { getSettings, resolveSiteUrl } from '@/lib/data/settings'

/** Applies the saved / system colour scheme before first paint (same as the theme's header.php). */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('jb-theme');if(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)t='dark';if(t==='dark')document.documentElement.setAttribute('data-theme','dark');}catch(e){}}());`

/** Site-wide head metadata shared by every root layout (public trees and admin). */
export async function rootMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  const siteUrl = resolveSiteUrl(settings)
  const v = settings.seo.verification
  const other: Record<string, string> = {}
  if (v.bing) other['msvalidate.01'] = v.bing
  if (v.baidu) other['baidu-site-verification'] = v.baidu
  if (v.pinterest) other['p:domain_verify'] = v.pinterest
  return {
    metadataBase: new URL(siteUrl),
    applicationName: settings.general.siteName,
    icons: settings.general.faviconUrl
      ? { icon: settings.general.faviconUrl, apple: settings.general.faviconUrl }
      : { icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }, { url: '/favicon.ico', sizes: '48x48' }], apple: '/apple-touch-icon.png' },
    verification: {
      google: v.google || undefined,
      yandex: v.yandex || undefined,
      other: Object.keys(other).length ? other : undefined,
    },
    alternates: {
      types: { 'application/rss+xml': [{ url: '/feed/', title: `${settings.general.siteName} » Feed` }] },
    },
    formatDetection: { telephone: false },
  }
}

export const rootViewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1512' },
  ],
}

/** The <html> document shell used by every root layout. */
export function RootHtml({ lang, children }: { lang: string; children: React.ReactNode }) {
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script
          // Inline + synchronous so the theme applies before first paint; inert on client navigations.
          type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
