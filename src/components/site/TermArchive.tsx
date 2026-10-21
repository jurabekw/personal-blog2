import type { Metadata } from 'next'
import { notFound, permanentRedirect, redirect } from 'next/navigation'
import { categoryWithDescendants, getTaxonomies, listPublishedPosts, type TermRef } from '@/lib/data/posts'
import { findRedirect } from '@/lib/data/redirects'
import { getSettings } from '@/lib/data/settings'
import { metadataFor, seoFor } from '@/lib/seo/page'
import { buildGraph } from '@/lib/seo/schema'
import { t } from '@/lib/i18n'
import { Breadcrumb, JsonLd, NoResults, Pagination, PostRow, type Crumb } from './parts'
import { Sidebar } from './Sidebar'

type Taxonomy = 'category' | 'tag'

interface Parsed {
  term: TermRef | null
  page: number
  requested: string
  feed: boolean
}

async function parse(taxonomy: Taxonomy, segments: string[]): Promise<Parsed> {
  const segs = segments.map((s) => {
    try {
      return decodeURIComponent(s)
    } catch {
      return s
    }
  })
  let page = 1
  if (segs.length >= 3 && segs[segs.length - 2] === 'page' && /^\d+$/.test(segs[segs.length - 1])) {
    page = Number(segs.pop())
    segs.pop()
  }
  let feed = false
  if (segs[segs.length - 1] === 'feed') {
    feed = true
    segs.pop()
  }
  const slug = segs[segs.length - 1] ?? ''
  const tax = await getTaxonomies()
  const list = taxonomy === 'tag' ? tax.tags : tax.categories
  const term = list.find((x) => x.slug === slug) ?? null
  return { term, page, requested: `/${taxonomy}/${segs.join('/')}/`, feed }
}

async function totals(term: TermRef, perPage: number) {
  const ids = term.taxonomy === 'category' ? await categoryWithDescendants(term.id) : []
  const { total } = await listPublishedPosts({
    perPage: 1,
    categoryIds: term.taxonomy === 'category' ? ids : undefined,
    tagId: term.taxonomy === 'tag' ? term.id : undefined,
  })
  return { ids, pages: Math.max(1, Math.ceil(total / perPage)) }
}

export async function termMetadata(taxonomy: Taxonomy, segments: string[]): Promise<Metadata> {
  const { term, page } = await parse(taxonomy, segments)
  if (!term) return { robots: { index: false } }
  const settings = await getSettings()
  const { pages } = await totals(term, Math.max(1, settings.reading.postsPerPage))
  return metadataFor({ kind: taxonomy, path: term.path, term, page, pageTotal: pages })
}

/** archive.php */
export async function TermArchive({ taxonomy, segments }: { taxonomy: Taxonomy; segments: string[] }) {
  const { term, page, requested, feed } = await parse(taxonomy, segments)
  if (!term) {
    const match = await findRedirect(requested)
    if (match && match.target && match.statusCode !== 410) {
      if (match.statusCode === 301 || match.statusCode === 308) permanentRedirect(match.target)
      redirect(match.target)
    }
    notFound()
  }
  if (feed) permanentRedirect(term.path)
  // WordPress accepts /category/child/ — send it to the canonical /category/parent/child/.
  if (requested !== term.path) permanentRedirect(page > 1 ? `${term.path}page/${page}/` : term.path)
  if (page === 1 && segments.includes('page')) permanentRedirect(term.path)

  const settings = await getSettings()
  const perPage = Math.max(1, settings.reading.postsPerPage)
  const { ids, pages } = await totals(term, perPage)
  if (page > pages) notFound()

  const { items, total } = await listPublishedPosts({
    page,
    perPage,
    categoryIds: taxonomy === 'category' ? ids : undefined,
    tagId: taxonomy === 'tag' ? term.id : undefined,
  })
  const { siteUrl, resolved, url } = await seoFor({ kind: taxonomy, path: term.path, term, page, pageTotal: pages })
  const { general, seo, appearance } = settings

  const crumbs: Crumb[] = [{ label: seo.breadcrumbs.homeLabel, href: '/' }]
  if (seo.breadcrumbs.showBlog) crumbs.push({ label: appearance.blogTitle, href: '/blog/' })
  const graphCrumbs = [...crumbs]
  if (taxonomy === 'category') {
    const tax = await getTaxonomies()
    const parents: TermRef[] = []
    let cur = term.parentId ? tax.byId.get(term.parentId) : undefined
    while (cur && parents.length < 10) {
      parents.unshift(cur)
      cur = cur.parentId ? tax.byId.get(cur.parentId) : undefined
    }
    for (const p of parents) graphCrumbs.push({ label: p.name, href: p.path })
  }
  crumbs.push({ label: term.name })
  graphCrumbs.push({ label: term.seo.breadcrumbTitle || term.name })

  return (
    <main className="jb-main" id="jb-main">
      <JsonLd data={buildGraph({ settings, siteUrl, seo: resolved, url, pageType: 'CollectionPage', crumbs: graphCrumbs, listing: items })} />
      <div className="jb-shell">
        {seo.breadcrumbs.enabled ? <Breadcrumb items={crumbs} separator={seo.breadcrumbs.separator} /> : null}
        <header className="jb-page-header">
          <h1>{page > 1 ? `${term.name} — ${t.pageOf(page, pages)}` : term.name}</h1>
          {term.description ? <div className="jb-lead">{term.description}</div> : null}
          <p className="jb-lead">{t.postsCount(total)}</p>
        </header>

        <div className="jb-layout jb-layout--sidebar">
          <div>
            {items.length ? (
              <>
                <div className="jb-list">
                  {items.map((p, i) => (
                    <PostRow key={p.id} post={p} language={general.language} timezone={general.timezone} priority={i === 0} />
                  ))}
                </div>
                <Pagination current={page} total={pages} base={term.path} />
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
