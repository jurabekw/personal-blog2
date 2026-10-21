import Link from 'next/link'
import { adminListPosts, adminStatusCounts, adminTerms, type ListStatus } from '@/lib/data/admin'
import { PostsTable } from './PostsTable'

const PER_PAGE = 20

export async function PostListScreen({
  type,
  searchParams,
}: {
  type: 'post' | 'page'
  searchParams: Record<string, string | string[] | undefined>
}) {
  const sp = (k: string) => {
    const v = searchParams[k]
    return (Array.isArray(v) ? v[0] : v) ?? ''
  }
  const status = (['all', 'publish', 'scheduled', 'draft', 'pending', 'trash', 'cornerstone'].includes(sp('status')) ? sp('status') : 'all') as ListStatus
  const page = Math.max(1, Number(sp('paged')) || 1)
  const q = sp('s')
  const cat = Number(sp('cat')) || undefined
  const seo = (['good', 'ok', 'bad', 'na'].includes(sp('seo')) ? sp('seo') : undefined) as 'good' | 'ok' | 'bad' | 'na' | undefined
  const [counts, list, categories] = await Promise.all([
    adminStatusCounts(type),
    adminListPosts({ type, status, search: q, categoryId: cat, seo, page, perPage: PER_PAGE }),
    type === 'post' ? adminTerms('category') : Promise.resolve([]),
  ])
  const base = type === 'post' ? '/admin/posts/' : '/admin/pages/'
  const pages = Math.max(1, Math.ceil(list.total / PER_PAGE))
  const link = (params: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams()
    const merged = { status: status === 'all' ? undefined : status, s: q || undefined, cat, seo, ...params }
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== '' && v !== 'all') u.set(k, String(v))
    const s = u.toString()
    return s ? `${base}?${s}` : base
  }
  const statuses: { id: ListStatus; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'publish', label: 'Published', count: counts.publish },
    { id: 'scheduled', label: 'Scheduled', count: counts.scheduled },
    { id: 'draft', label: 'Drafts', count: counts.draft },
    { id: 'pending', label: 'Pending', count: counts.pending },
    { id: 'cornerstone', label: 'Cornerstone content', count: counts.cornerstone },
    { id: 'trash', label: 'Trash', count: counts.trash },
  ]

  return (
    <>
      <div className="wpa-head">
        <h1>{type === 'post' ? 'Posts' : 'Pages'}</h1>
        <Link className="wpa-btn" href={`${base}new/`}>
          Add New {type === 'post' ? 'Post' : 'Page'}
        </Link>
      </div>

      <ul className="wpa-subsubsub">
        {statuses
          .filter((s) => s.id === 'all' || s.count > 0)
          .map((s) => (
            <li key={s.id}>
              <Link href={link({ status: s.id, paged: undefined })} className={status === s.id ? 'is-current' : undefined}>
                {s.label} <span className="count">({s.count})</span>
              </Link>
            </li>
          ))}
      </ul>

      <form className="wpa-tablenav" action={base} method="get">
        <div className="wpa-tablenav__left">
          {status !== 'all' ? <input type="hidden" name="status" value={status} /> : null}
          {type === 'post' ? (
            <select className="wpa-select wpa-input--sm" style={{ width: 'auto' }} name="cat" defaultValue={cat ?? ''} aria-label="Filter by category">
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : null}
          <select className="wpa-select wpa-input--sm" style={{ width: 'auto' }} name="seo" defaultValue={seo ?? ''} aria-label="Filter by SEO score">
            <option value="">All SEO Scores</option>
            <option value="good">SEO: Good</option>
            <option value="ok">SEO: OK</option>
            <option value="bad">SEO: Needs improvement</option>
            <option value="na">SEO: No focus keyphrase</option>
          </select>
          <button className="wpa-btn wpa-btn--sm" type="submit">
            Filter
          </button>
        </div>
        <div className="wpa-tablenav__right">
          <input className="wpa-input wpa-input--sm" type="search" name="s" defaultValue={q} placeholder={`Search ${type === 'post' ? 'posts' : 'pages'}`} style={{ width: 220 }} />
          <button className="wpa-btn wpa-btn--sm" type="submit">
            Search
          </button>
        </div>
      </form>

      <PostsTable rows={list.rows} type={type} status={status} trashCount={counts.trash} />

      <div className="wpa-tablenav">
        <span className="wpa-muted">{list.total} item{list.total === 1 ? '' : 's'}</span>
        {pages > 1 ? (
          <div className="wpa-pager">
            {page > 1 ? (
              <Link className="wpa-btn wpa-btn--sm" href={link({ paged: page - 1 })}>
                ‹
              </Link>
            ) : null}
            <span>
              {page} of {pages}
            </span>
            {page < pages ? (
              <Link className="wpa-btn wpa-btn--sm" href={link({ paged: page + 1 })}>
                ›
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  )
}
