import Link from 'next/link'
import type { Metadata } from 'next'
import { replaceVars } from '@/lib/seo/templates'
import { t } from '@/lib/i18n'
import { getSettings } from '@/lib/data/settings'
import type { Script } from '@/lib/alphabet'

export async function metadataNotFound(_script: Script): Promise<Metadata> {
  // SEO strings stay as resolved today; per-alphabet SEO is handled separately.
  const s = await getSettings()
  return {
    title: { absolute: replaceVars(s.seo.titles.notFound, { sitename: s.general.siteName, sep: s.seo.separator }) },
    robots: { index: false, follow: true },
  }
}

/** 404.php (`script` is taken now so the alphabet trees share one call shape; UI text follows later). */
export function NotFoundView(_props: { script: Script }) {
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
