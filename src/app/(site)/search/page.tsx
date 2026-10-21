import type { Metadata } from 'next'
import { getSettings } from '@/lib/data/settings'
import { listPublishedPosts } from '@/lib/data/posts'
import { metadataFor } from '@/lib/seo/page'
import { t } from '@/lib/i18n'
import { NoResults, PostRow, SearchForm } from '@/components/site/parts'
import { Sidebar } from '@/components/site/Sidebar'

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? ''
}

export async function generateMetadata({ searchParams }: PageProps<'/search'>): Promise<Metadata> {
  const q = first((await searchParams).q).slice(0, 100)
  return metadataFor({ kind: 'search', path: '/search/', search: q })
}

/** search.php (never indexed; results are dynamic). */
export default async function SearchPage({ searchParams }: PageProps<'/search'>) {
  const sp = await searchParams
  const q = first(sp.q).trim().slice(0, 100)
  const page = Math.max(1, Number(first(sp.page)) || 1)
  const settings = await getSettings()
  const perPage = Math.max(1, settings.reading.postsPerPage)
  const { items, total } = q ? await listPublishedPosts({ search: q, page, perPage }) : { items: [], total: 0 }
  const pages = Math.max(1, Math.ceil(total / perPage))
  const { language, timezone } = settings.general

  return (
    <main className="jb-main" id="jb-main">
      <div className="jb-shell">
        <header className="jb-page-header">
          <h1>{t.searchFor(q)}</h1>
          <SearchForm defaultValue={q} />
        </header>
        <div className="jb-layout jb-layout--sidebar">
          <div>
            {items.length ? (
              <>
                <div className="jb-list">
                  {items.map((p) => (
                    <PostRow key={p.id} post={p} language={language} timezone={timezone} />
                  ))}
                </div>
                {pages > 1 ? (
                  <nav className="jb-pagination" aria-label={t.pages}>
                    <ul className="page-numbers">
                      {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                        <li key={n}>
                          {n === page ? (
                            <span className="page-numbers current" aria-current="page">{n}</span>
                          ) : (
                            <a className="page-numbers" href={`/search/?q=${encodeURIComponent(q)}&page=${n}`}>{n}</a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </nav>
                ) : null}
              </>
            ) : (
              <NoResults />
            )}
          </div>
          <Sidebar />
        </div>
      </div>
    </main>
  )
}
