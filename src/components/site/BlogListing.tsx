import { notFound } from 'next/navigation'
import { getTaxonomies, listPublishedPosts } from '@/lib/data/posts'
import { seoFor } from '@/lib/seo/page'
import { buildGraph } from '@/lib/seo/schema'
import { getTranslitConfig } from '@/lib/translit'
import type { Script } from '@/lib/script'
import { localizer, uiFor } from '@/lib/alphabet'
import { CategoryChips, JsonLd, NoResults, Pagination, PostRow } from './parts'
import { Sidebar } from './Sidebar'

/** home.php — the posts page with category chips and pagination. */
export async function BlogListing({ page, script }: { page: number; script: Script }) {
  const base = await seoFor({ kind: 'blog', path: '/blog/', script })
  const perPage = Math.max(1, base.settings.reading.postsPerPage)
  const [list, tax] = await Promise.all([listPublishedPosts({ page, perPage }), getTaxonomies()])
  const { total } = list
  const pages = Math.max(1, Math.ceil(total / perPage))
  if (page > pages) notFound()
  const { siteUrl, resolved, url } = await seoFor({ kind: 'blog', path: '/blog/', page, pageTotal: pages, script })
  const cfg = getTranslitConfig(base.settings.alphabets)
  const L = localizer(script, cfg, siteUrl)
  const ui = uiFor(script, cfg, siteUrl)
  const { t } = ui
  const settings = L.settings(base.settings)
  const items = L.posts(list.items)
  const { appearance, general } = settings

  return (
    <main id="jb-main" className="jb-main">
      <JsonLd
        data={buildGraph({
          settings,
          siteUrl,
          seo: resolved,
          url,
          pageType: 'CollectionPage',
          crumbs: [{ label: settings.seo.breadcrumbs.homeLabel, href: '/' }, { label: appearance.blogTitle }],
          listing: items,
        })}
      />
      <div className="jb-shell">
        <header className="jb-page-header">
          <h1>{page > 1 ? `${appearance.blogTitle} — ${t.pageOf(page, pages)}` : appearance.blogTitle}</h1>
          {appearance.blogIntro ? <p className="jb-lead">{appearance.blogIntro}</p> : null}
        </header>

        <CategoryChips categories={L.terms(tax.categories)} activeAll allHref="/blog/" ui={ui} />

        <div className="jb-layout jb-layout--sidebar">
          <div>
            {items.length ? (
              <>
                <div className="jb-list">
                  {items.map((p, i) => (
                    <PostRow key={p.id} post={p} language={general.language} timezone={general.timezone} priority={i === 0} ui={ui} />
                  ))}
                </div>
                <Pagination current={page} total={pages} base="/blog/" ui={ui} />
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
