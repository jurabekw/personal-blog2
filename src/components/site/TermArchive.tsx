import type { Metadata } from 'next'
import { notFound, permanentRedirect, redirect } from 'next/navigation'
import { categoryWithDescendants, getTaxonomies, listPublishedPosts, type TermRef } from '@/lib/data/posts'
import { findRedirect } from '@/lib/data/redirects'
import { getSettings } from '@/lib/data/settings'
import { metadataFor, seoFor } from '@/lib/seo/page'
import { buildGraph } from '@/lib/seo/schema'
import { getTranslitConfig } from '@/lib/translit'
import type { Script } from '@/lib/script'
import { localizer, redirectHref, scriptHref, uiFor } from '@/lib/alphabet'
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

export async function termMetadata(taxonomy: Taxonomy, segments: string[], script: Script): Promise<Metadata> {
  const { term, page } = await parse(taxonomy, segments)
  if (!term) return { robots: { index: false } }
  const settings = await getSettings()
  const { pages } = await totals(term, Math.max(1, settings.reading.postsPerPage))
  return metadataFor({ kind: taxonomy, path: term.path, term, page, pageTotal: pages, script })
}

/** archive.php */
export async function TermArchive({ taxonomy, segments, script }: { taxonomy: Taxonomy; segments: string[]; script: Script }) {
  const { term: source, page, requested, feed } = await parse(taxonomy, segments)
  if (!source) {
    const match = await findRedirect(requested)
    if (match && match.target && match.statusCode !== 410) {
      const target = await redirectHref(script, match.target)
      if (match.statusCode === 301 || match.statusCode === 308) permanentRedirect(target)
      redirect(target)
    }
    notFound()
  }
  const inTree = (href: string) => scriptHref(script, href)
  if (feed) permanentRedirect(inTree(source.path))
  // WordPress accepts /category/child/ — send it to the canonical /category/parent/child/.
  if (requested !== source.path) permanentRedirect(inTree(page > 1 ? `${source.path}page/${page}/` : source.path))
  if (page === 1 && segments.includes('page')) permanentRedirect(inTree(source.path))

  const rawSettings = await getSettings()
  const perPage = Math.max(1, rawSettings.reading.postsPerPage)
  const { ids, pages } = await totals(source, perPage)
  if (page > pages) notFound()

  const list = await listPublishedPosts({
    page,
    perPage,
    categoryIds: taxonomy === 'category' ? ids : undefined,
    tagId: taxonomy === 'tag' ? source.id : undefined,
  })
  const { siteUrl, resolved, url } = await seoFor({ kind: taxonomy, path: source.path, term: source, page, pageTotal: pages, script })
  const cfg = getTranslitConfig(rawSettings.alphabets)
  const L = localizer(script, cfg, siteUrl)
  const ui = uiFor(script, cfg, siteUrl)
  const { t } = ui
  const settings = L.settings(rawSettings)
  const term = L.term(source)
  const items = L.posts(list.items)
  const { total } = list
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
    for (const p of L.terms(parents)) graphCrumbs.push({ label: p.name, href: p.path })
  }
  crumbs.push({ label: term.name })
  graphCrumbs.push({ label: term.seo.breadcrumbTitle || term.name })

  return (
    <main className="jb-main" id="jb-main">
      <JsonLd data={buildGraph({ settings, siteUrl, seo: resolved, url, pageType: 'CollectionPage', crumbs: graphCrumbs, listing: items })} />
      <div className="jb-shell">
        {seo.breadcrumbs.enabled ? <Breadcrumb items={crumbs} separator={seo.breadcrumbs.separator} ui={ui} /> : null}
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
                    <PostRow key={p.id} post={p} language={general.language} timezone={general.timezone} priority={i === 0} ui={ui} />
                  ))}
                </div>
                <Pagination current={page} total={pages} base={term.path} ui={ui} />
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
