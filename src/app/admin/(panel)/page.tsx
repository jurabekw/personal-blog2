import Link from 'next/link'
import type { Metadata } from 'next'
import { and, desc, eq, gt, lte, ne, sql } from 'drizzle-orm'
import { getDb, schema } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { getSettings, resolveSiteUrl } from '@/lib/data/settings'
import { storageKind } from '@/lib/storage'
import { QuickDraft } from '@/components/admin/QuickDraft'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function Dashboard() {
  const user = await requireUser()
  const settings = await getSettings()
  const siteUrl = resolveSiteUrl(settings)
  const db = getDb()
  const { posts, terms, media, redirects } = schema
  const now = new Date()
  const [[c], [tc], [mc], [rc], recent, scheduled, drafts] = await Promise.all([
    db
      .select({
        posts: sql<number>`count(*) filter (where ${posts.type}='post' and ${posts.status}='publish')`.mapWith(Number),
        pages: sql<number>`count(*) filter (where ${posts.type}='page' and ${posts.status}='publish')`.mapWith(Number),
        drafts: sql<number>`count(*) filter (where ${posts.status} in ('draft','pending'))`.mapWith(Number),
        good: sql<number>`count(*) filter (where ${posts.status}<>'trash' and ${posts.seoScore} >= 76)`.mapWith(Number),
        ok: sql<number>`count(*) filter (where ${posts.status}<>'trash' and ${posts.seoScore} between 55 and 75)`.mapWith(Number),
        bad: sql<number>`count(*) filter (where ${posts.status}<>'trash' and ${posts.seoScore} between 1 and 54)`.mapWith(Number),
        na: sql<number>`count(*) filter (where ${posts.status}<>'trash' and ${posts.seoScore} is null)`.mapWith(Number),
        words: sql<number>`coalesce(sum(${posts.wordCount}) filter (where ${posts.status}='publish'),0)`.mapWith(Number),
      })
      .from(posts),
    db.select({ n: sql<number>`count(*) filter (where ${terms.taxonomy}='category')`.mapWith(Number), t: sql<number>`count(*) filter (where ${terms.taxonomy}='tag')`.mapWith(Number) }).from(terms),
    db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(media),
    db.select({ n: sql<number>`count(*)`.mapWith(Number), hits: sql<number>`coalesce(sum(${redirects.hits}),0)`.mapWith(Number) }).from(redirects),
    db.select({ id: posts.id, title: posts.title, slug: posts.slug, publishedAt: posts.publishedAt }).from(posts).where(and(eq(posts.type, 'post'), eq(posts.status, 'publish'), lte(posts.publishedAt, now))).orderBy(desc(posts.publishedAt)).limit(5),
    db.select({ id: posts.id, title: posts.title, publishedAt: posts.publishedAt }).from(posts).where(and(eq(posts.status, 'publish'), gt(posts.publishedAt, now))).orderBy(posts.publishedAt).limit(5),
    db.select({ id: posts.id, title: posts.title, type: posts.type, updatedAt: posts.updatedAt }).from(posts).where(and(ne(posts.status, 'trash'), sql`${posts.status} in ('draft','pending')`)).orderBy(desc(posts.updatedAt)).limit(5),
  ])
  const scored = c.good + c.ok + c.bad + c.na
  const health: { ok: boolean; text: React.ReactNode }[] = [
    { ok: !settings.reading.discourageSearchEngines, text: <>Search engines are {settings.reading.discourageSearchEngines ? <b>blocked</b> : 'allowed'} to index the site (Settings → Reading).</> },
    { ok: storageKind() === 'blob', text: storageKind() === 'blob' ? 'Media storage: Vercel Blob is connected.' : storageKind() === 'local' ? 'Media storage: local folder (development only). Connect a Vercel Blob store before going live.' : <>Media uploads are <b>disabled</b>: connect a Vercel Blob store to this project.</> },
    { ok: Boolean(settings.general.siteUrl || process.env.NEXT_PUBLIC_SITE_URL), text: <>Site URL: <code>{siteUrl}</code> (used in canonical URLs and sitemaps).</> },
    { ok: Boolean(settings.seo.analytics.ga4 || settings.seo.analytics.gtm || settings.seo.analytics.yandexMetrica), text: 'Analytics (GA4 / GTM / Yandex Metrica) — set in SEO → Settings → Integrations.' },
    { ok: Boolean(settings.seo.verification.google), text: 'Google Search Console verification code — SEO → Settings → Webmaster tools.' },
    { ok: c.na === 0 || scored === 0, text: `${c.na} item${c.na === 1 ? '' : 's'} without a focus keyphrase.` },
  ]

  return (
    <>
      <div className="wpa-head">
        <h1>Dashboard</h1>
      </div>
      <p className="wpa-desc">Welcome back, {user.name}. Your site is static and served from Vercel&apos;s edge — every save refreshes the affected pages instantly.</p>

      <div className="wpa-grid wpa-grid--4">
        {[
          { n: c.posts, l: 'Published posts', href: '/admin/posts/?status=publish' },
          { n: c.pages, l: 'Pages', href: '/admin/pages/' },
          { n: c.drafts, l: 'Drafts & pending', href: '/admin/posts/?status=draft' },
          { n: mc.n, l: 'Media files', href: '/admin/media/' },
        ].map((s) => (
          <Link key={s.l} href={s.href} className="wpa-box" style={{ textDecoration: 'none', marginBottom: 0 }}>
            <div className="wpa-stat">
              <span className="wpa-stat__num">{s.n}</span>
              <span className="wpa-stat__label">{s.l}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="wpa-grid wpa-grid--2 wpa-mt">
        <div>
          <div className="wpa-box">
            <div className="wpa-box__head"><h2>SEO overview</h2><Link href="/admin/seo/tools/">Bulk editor →</Link></div>
            <div className="wpa-box__body">
              {scored ? (
                <>
                  <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', background: '#f0f0f1' }}>
                    {[['good', c.good, '#1cca59'], ['ok', c.ok, '#ee7c1b'], ['bad', c.bad, '#dc3232'], ['na', c.na, '#a7aaad']].map(([k, n, color]) =>
                      Number(n) ? <span key={String(k)} style={{ width: `${(Number(n) / scored) * 100}%`, background: String(color) }} /> : null,
                    )}
                  </div>
                  <ul className="wpa-list wpa-mt">
                    <li><span><span className="wpa-dot wpa-dot--good" /> Good SEO score</span><Link href="/admin/posts/?seo=good">{c.good}</Link></li>
                    <li><span><span className="wpa-dot wpa-dot--ok" /> OK SEO score</span><Link href="/admin/posts/?seo=ok">{c.ok}</Link></li>
                    <li><span><span className="wpa-dot wpa-dot--bad" /> Needs improvement</span><Link href="/admin/posts/?seo=bad">{c.bad}</Link></li>
                    <li><span><span className="wpa-dot wpa-dot--na" /> No focus keyphrase</span><Link href="/admin/posts/?seo=na">{c.na}</Link></li>
                  </ul>
                </>
              ) : (
                <p className="wpa-empty">No content yet. <Link href="/admin/import/">Import from WordPress</Link> or <Link href="/admin/posts/new/">write your first post</Link>.</p>
              )}
            </div>
          </div>

          <div className="wpa-box">
            <div className="wpa-box__head"><h2>Site health</h2></div>
            <div className="wpa-box__body">
              <ul className="wpa-list">
                {health.map((h, i) => (
                  <li key={i} style={{ justifyContent: 'flex-start' }}>
                    <span className={`wpa-dot wpa-dot--${h.ok ? 'good' : 'ok'}`} />
                    <span>{h.text}</span>
                  </li>
                ))}
              </ul>
              <p className="wpa-help wpa-mt">
                Quick links: <a href="/sitemap_index.xml" target="_blank">sitemap</a> · <a href="/robots.txt" target="_blank">robots.txt</a> · <a href="/feed/" target="_blank">RSS</a> · <a href="/llms.txt" target="_blank">llms.txt</a> · {rc.n} redirects ({rc.hits} hits) · {tc.n} categories, {tc.t} tags · {c.words.toLocaleString()} words published
              </p>
            </div>
          </div>
        </div>

        <div>
          <div className="wpa-box">
            <div className="wpa-box__head"><h2>Activity</h2></div>
            <div className="wpa-box__body">
              {scheduled.length ? (
                <>
                  <h3 className="wpa-muted" style={{ fontSize: 12, textTransform: 'uppercase' }}>Publishing soon</h3>
                  <ul className="wpa-list wpa-mb">
                    {scheduled.map((p) => (
                      <li key={p.id}><Link href={`/admin/posts/${p.id}/`}>{p.title || '(no title)'}</Link><span className="wpa-muted">{p.publishedAt?.toLocaleString('en-GB', { timeZone: settings.general.timezone })}</span></li>
                    ))}
                  </ul>
                </>
              ) : null}
              <h3 className="wpa-muted" style={{ fontSize: 12, textTransform: 'uppercase' }}>Recently published</h3>
              {recent.length ? (
                <ul className="wpa-list wpa-mb">
                  {recent.map((p) => (
                    <li key={p.id}><Link href={`/admin/posts/${p.id}/`}>{p.title}</Link><a className="wpa-muted" href={`/${p.slug}/`} target="_blank">view</a></li>
                  ))}
                </ul>
              ) : <p className="wpa-muted">Nothing yet.</p>}
              {drafts.length ? (
                <>
                  <h3 className="wpa-muted" style={{ fontSize: 12, textTransform: 'uppercase' }}>Drafts</h3>
                  <ul className="wpa-list">
                    {drafts.map((p) => (
                      <li key={p.id}><Link href={`/admin/${p.type === 'page' ? 'pages' : 'posts'}/${p.id}/`}>{p.title || '(no title)'}</Link><span className="wpa-muted">{p.updatedAt.toLocaleDateString('en-GB')}</span></li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          </div>
          <div className="wpa-box">
            <div className="wpa-box__head"><h2>Quick Draft</h2></div>
            <div className="wpa-box__body"><QuickDraft /></div>
          </div>
        </div>
      </div>
    </>
  )
}
