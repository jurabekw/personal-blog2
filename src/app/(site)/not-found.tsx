import Link from 'next/link'
import type { Metadata } from 'next'
import { getSettings } from '@/lib/data/settings'
import { replaceVars } from '@/lib/seo/templates'
import { t } from '@/lib/i18n'

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings()
  return {
    title: { absolute: replaceVars(s.seo.titles.notFound, { sitename: s.general.siteName, sep: s.seo.separator }) },
    robots: { index: false, follow: true },
  }
}

/** 404.php */
export default function NotFound() {
  return (
    <main id="jb-main" className="jb-main jb-404">
      <div className="jb-shell">
        <section className="jb-404__panel" aria-labelledby="jb-404-title">
          <span className="jb-404__eyebrow">{t.error404}</span>
          <p className="jb-404__number" aria-hidden="true">
            404
          </p>
          <h1 id="jb-404-title">{t.notFoundTitle}</h1>
          <p className="jb-404__text">{t.notFoundText}</p>
          <div className="jb-404__actions">
            <Link className="jb-btn jb-btn--primary" href="/">
              {t.backHome}
            </Link>
            <Link className="jb-btn jb-btn--secondary" href="/blog/">
              {t.allPosts}
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
