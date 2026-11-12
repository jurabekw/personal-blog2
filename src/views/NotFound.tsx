import Link from 'next/link'
import type { Metadata } from 'next'
import { replaceVars } from '@/lib/seo/templates'
import { getSettings } from '@/lib/data/settings'
import { alphabetContext, uiFor, type Script, type Ui } from '@/lib/alphabet'
import { DEFAULT_TRANSLIT_CONFIG } from '@/lib/translit'

export async function metadataNotFound(_script: Script): Promise<Metadata> {
  // SEO strings stay as resolved today; per-alphabet SEO is handled separately.
  const s = await getSettings()
  return {
    title: { absolute: replaceVars(s.seo.titles.notFound, { sitename: s.general.siteName, sep: s.seo.separator }) },
    robots: { index: false, follow: true },
  }
}

/** 404.php. Latin renders synchronously (no settings needed), exactly as before. */
export function NotFoundView({ script }: { script: Script }) {
  if (script === 'latn') return <NotFoundBody ui={uiFor('latn', DEFAULT_TRANSLIT_CONFIG, '')} />
  return <VariantNotFound script={script} />
}

async function VariantNotFound({ script }: { script: Script }) {
  const { ui } = await alphabetContext(script)
  return <NotFoundBody ui={ui} />
}

function NotFoundBody({ ui }: { ui: Ui }) {
  const { t, href } = ui
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
            <Link className="jb-btn jb-btn--primary" href={href('/')}>
              {t.backHome}
            </Link>
            <Link className="jb-btn jb-btn--secondary" href={href('/blog/')}>
              {t.allPosts}
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
