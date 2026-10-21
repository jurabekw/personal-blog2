import { notFound } from 'next/navigation'
import { getTaxonomies, listPublishedPosts } from '@/lib/data/posts'
import { seoFor } from '@/lib/seo/page'
import { buildGraph } from '@/lib/seo/schema'
import { t } from '@/lib/i18n'
import { CategoryChips, JsonLd, NoResults, Pagination, PostRow } from './parts'
import { Sidebar } from './Sidebar'

/** home.php — the posts page with category chips and pagination. */
export async function BlogListing({ page }: { page: number }) {
  const base = await seoFor({ kind: 'blog', path: '/blog/' })
  const { settings } = base
  const perPage = Math.max(1, settings.reading.postsPerPage)
  const [{ items, total }, tax] = await Promise.all([listPublishedPosts({ page, perPage }), getTaxonomies()])
  const pages = Math.max(1, Math.ceil(total / perPage))
  if (page > pages) notFound()
  const { siteUrl, resolved, url } = await seoFor({ kind: 'blog', path: '/blog/', page, pageTotal: pages })
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

        <CategoryChips categories={tax.categories} activeAll allHref="/blog/" />

        <div className="jb-layout jb-layout--sidebar">
          <div>
            {items.length ? (
              <>
                <div className="jb-list">
                  {items.map((p, i) => (
                    <PostRow key={p.id} post={p} language={general.language} timezone={general.timezone} priority={i === 0} />
                  ))}
                </div>
                <Pagination current={page} total={pages} base="/blog/" />
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
