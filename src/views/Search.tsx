import type { Metadata } from 'next'
import { listPublishedPosts } from '@/lib/data/posts'
import { metadataFor } from '@/lib/seo/page'
import { NoResults, PostRow, SearchForm } from '@/components/site/parts'
import { Sidebar } from '@/components/site/Sidebar'
import { alphabetContext, localizer, type Script } from '@/lib/alphabet'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? ''
}

export async function metadataSearch(script: Script, { searchParams }: Props): Promise<Metadata> {
  const q = first((await searchParams).q).slice(0, 100)
  return metadataFor({ kind: 'search', path: '/search/', search: q, script })
}

/** search.php (never indexed; results are dynamic). */
export async function renderSearch(script: Script, { searchParams }: Props) {
  const sp = await searchParams
  const q = first(sp.q).trim().slice(0, 100)
  const page = Math.max(1, Number(first(sp.page)) || 1)
  const { settings, siteUrl, cfg, ui } = await alphabetContext(script)
  const { t, href } = ui
  const perPage = Math.max(1, settings.reading.postsPerPage)
  const found = q ? await listPublishedPosts({ search: q, page, perPage }) : { items: [], total: 0 }
  const items = localizer(script, cfg, siteUrl).posts(found.items)
  const pages = Math.max(1, Math.ceil(found.total / perPage))
  const { language, timezone } = settings.general

  return (
    <main className="jb-main" id="jb-main">
      <div className="jb-shell">
        <header className="jb-page-header">
          <h1>{t.searchFor(q)}</h1>
          <SearchForm defaultValue={q} ui={ui} />
        </header>
        <div className="jb-layout jb-layout--sidebar">
          <div>
            {items.length ? (
              <>
                <div className="jb-list">
                  {items.map((p) => (
                    <PostRow key={p.id} post={p} language={language} timezone={timezone} ui={ui} />
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
                            <a className="page-numbers" href={href(`/search/?q=${encodeURIComponent(q)}&page=${n}`)}>{n}</a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </nav>
                ) : null}
              </>
            ) : (
              <NoResults ui={ui} />
            )}
          </div>
          <Sidebar script={script} />
        </div>
      </div>
    </main>
  )
}
