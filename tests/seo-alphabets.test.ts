import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveSeo, toMetadata } from '../src/lib/seo/resolve'
import { buildGraph } from '../src/lib/seo/schema'
import { localizePost, localizeSettings } from '../src/lib/localize'
import { DEFAULT_SETTINGS, type AllSettings } from '../src/lib/settings-defaults'
import { DEFAULT_TRANSLIT_CONFIG as cfg, transliterateText } from '../src/lib/translit'
import type { PostFull, TermRef } from '../src/lib/data/posts'

const SITE = 'https://www.jurabek.blog'

const settings = (over: (s: AllSettings) => void = () => {}): AllSettings => {
  const s: AllSettings = structuredClone(DEFAULT_SETTINGS)
  s.general.siteName = 'Jurabek Blog'
  s.general.tagline = 'Marketing haqida blog'
  s.seo.schema.articleType = 'BlogPosting'
  over(s)
  return s
}

const term = (over: Partial<TermRef> = {}): TermRef => ({
  id: 1, taxonomy: 'category', name: 'Marketing', slug: 'marketing', path: '/category/marketing/',
  parentId: null, description: 'Marketing haqida maqolalar', count: 3, seo: {}, ...over,
})

const post = (over: Partial<PostFull> = {}): PostFull =>
  ({
    id: 7, type: 'post', title: 'Marketing nima', slug: 'marketing-nima', path: '/marketing-nima/',
    excerpt: 'Qisqa matn', hasManualExcerpt: true,
    publishedAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-02'),
    wordCount: 10, readingMinutes: 1, sticky: false, image: null,
    category: term(), content: '<p>Salom</p>', template: 'default', status: 'publish',
    categories: [term()], tags: [], seo: {}, faq: [], authorId: 1, parentId: null, ...over,
  }) as PostFull

const LANGS = (path: string) => ({ 'uz-Latn': `${SITE}${path}`, 'uz-Cyrl': `${SITE}/kirill${path}`, 'x-default': `${SITE}${path}` })

function meta(input: Parameters<typeof resolveSeo>[0], s = settings()) {
  const r = resolveSeo(input, s, SITE)
  return { r, m: toMetadata(r, s, { post: input.post, siteUrl: SITE }) }
}

test('cyrl post: self canonical under /kirill/ and uz-Latn/uz-Cyrl/x-default alternates', () => {
  const { m } = meta({ kind: 'post', path: '/marketing-nima/', post: post(), script: 'cyrl' })
  assert.equal(m.alternates?.canonical, `${SITE}/kirill/marketing-nima/`)
  assert.deepEqual(m.alternates?.languages, LANGS('/marketing-nima/'))
  assert.equal(m.openGraph?.url, `${SITE}/kirill/marketing-nima/`)
})

test('latn post: canonical unchanged and gains the same alternates', () => {
  const { m } = meta({ kind: 'post', path: '/marketing-nima/', post: post(), script: 'latn' })
  assert.equal(m.alternates?.canonical, `${SITE}/marketing-nima/`)
  assert.deepEqual(m.alternates?.languages, LANGS('/marketing-nima/'))
})

test('latn output without script equals latn (default)', () => {
  const a = meta({ kind: 'post', path: '/marketing-nima/', post: post() })
  const b = meta({ kind: 'post', path: '/marketing-nima/', post: post(), script: 'latn' })
  assert.deepEqual(a.m, b.m)
  assert.equal(a.r.title, 'Marketing nima - Jurabek Blog')
})

test('yangi post: self canonical, no languages, indexable unless the admin switch is off', () => {
  const { m } = meta({ kind: 'post', path: '/marketing-nima/', post: post(), script: 'yangi' })
  assert.equal(m.alternates?.canonical, `${SITE}/yangi/marketing-nima/`)
  assert.equal(m.alternates?.languages, undefined)
  assert.equal((m.robots as { index?: boolean }).index, true)
  const off = meta({ kind: 'post', path: '/marketing-nima/', post: post(), script: 'yangi' }, settings((s) => (s.alphabets.indexNewLatin = false)))
  assert.equal((off.m.robots as { index?: boolean }).index, false)
  assert.equal((off.m.robots as { follow?: boolean }).follow, true)
  // The switch only affects /yangi/.
  const cy = meta({ kind: 'post', path: '/marketing-nima/', post: post(), script: 'cyrl' }, settings((s) => (s.alphabets.indexNewLatin = false)))
  assert.equal((cy.m.robots as { index?: boolean }).index, true)
})

test('variant of custom-canonical post is noindex', () => {
  const p = post({ seo: { canonical: 'https://example.com/original/' } })
  const latn = meta({ kind: 'post', path: '/marketing-nima/', post: p, script: 'latn' })
  assert.equal(latn.m.alternates?.canonical, 'https://example.com/original/')
  assert.equal(latn.m.alternates?.languages, undefined)
  assert.equal((latn.m.robots as { index?: boolean }).index, true)
  for (const script of ['cyrl', 'yangi'] as const) {
    const v = meta({ kind: 'post', path: '/marketing-nima/', post: p, script })
    assert.equal(v.m.alternates?.canonical, `${SITE}/${script === 'cyrl' ? 'kirill' : 'yangi'}/marketing-nima/`)
    assert.equal(v.m.alternates?.languages, undefined)
    assert.equal((v.m.robots as { index?: boolean }).index, false)
    assert.equal((v.m.robots as { follow?: boolean }).follow, true)
  }
})

test('a canonical that points at the page itself is not treated as custom', () => {
  const p = post({ seo: { canonical: `${SITE}/marketing-nima/` } })
  const v = meta({ kind: 'post', path: '/marketing-nima/', post: p, script: 'cyrl' })
  assert.equal((v.m.robots as { index?: boolean }).index, true)
  assert.deepEqual(v.m.alternates?.languages, LANGS('/marketing-nima/'))
})

test('title template output is Cyrillic and the %%sep%% separator is unchanged', () => {
  const s = settings((x) => (x.seo.separator = '|'))
  const { r, m } = meta({ kind: 'post', path: '/marketing-nima/', post: post(), script: 'cyrl' }, s)
  const expected = `${transliterateText('Marketing nima', 'cyrl', cfg)} | ${transliterateText('Jurabek Blog', 'cyrl', cfg)}`
  assert.equal(r.title, expected)
  assert.match(r.title, /[Ѐ-ӿ]/)
  assert.deepEqual(m.title, { absolute: expected })
  assert.equal(m.openGraph?.title, expected)
  assert.equal((m.twitter as { title?: string }).title, expected)
  assert.equal(m.openGraph?.siteName, transliterateText('Jurabek Blog', 'cyrl', cfg))
  // og:locale stays as configured.
  assert.equal((m.openGraph as { locale?: string }).locale, 'uz_UZ')
  // Static template text is transliterated too.
  const nf = meta({ kind: 'notFound', path: '/', script: 'cyrl' }, s)
  assert.equal(nf.r.title, `${transliterateText('Sahifa topilmadi', 'cyrl', cfg)} | ${transliterateText('Jurabek Blog', 'cyrl', cfg)}`)
  assert.equal((nf.m.robots as { index?: boolean }).index, false)
  assert.equal(nf.m.alternates?.canonical, undefined)
  assert.equal(nf.m.alternates?.languages, undefined)
})

test('description is transliterated for variants', () => {
  const { r } = meta({ kind: 'post', path: '/marketing-nima/', post: post({ excerpt: 'Qisqa matn' }), script: 'cyrl' })
  assert.equal(r.description, transliterateText('Qisqa matn', 'cyrl', cfg))
})

test('JSON-LD: inLanguage uz-Cyrl and BlogPosting @id under /kirill/', () => {
  const raw = settings()
  const r = resolveSeo({ kind: 'post', path: '/marketing-nima/', post: post(), script: 'cyrl' }, raw, SITE)
  const s = localizeSettings(raw, 'cyrl', cfg, SITE)
  const p = localizePost(post(), 'cyrl', cfg)
  const g = buildGraph({ settings: s, siteUrl: SITE, seo: r, url: r.url, post: p, crumbs: [{ label: 'Bosh sahifa', href: '/' }, { label: 'Blog', href: '/blog/' }, { label: p.title }] }) as { '@graph': Record<string, unknown>[] }
  const nodes = g['@graph']
  const article = nodes.find((n) => n['@type'] === 'BlogPosting')!
  assert.ok(String(article['@id']).startsWith(`${SITE}/kirill/`), String(article['@id']))
  assert.equal(article.inLanguage, 'uz-Cyrl')
  const page = nodes.find((n) => n['@id'] === `${SITE}/kirill/marketing-nima/`)!
  assert.equal(page.inLanguage, 'uz-Cyrl')
  assert.equal(page.url, `${SITE}/kirill/marketing-nima/`)
  assert.equal(page.name, r.title)
  const site = nodes.find((n) => n['@type'] === 'WebSite')!
  assert.equal(site.inLanguage, 'uz-Cyrl')
  assert.equal(site['@id'], `${SITE}/kirill/#website`)
  assert.equal(site.url, `${SITE}/kirill/`)
  assert.equal(site.name, transliterateText('Jurabek Blog', 'cyrl', cfg))
  const crumbs = nodes.find((n) => n['@type'] === 'BreadcrumbList')! as { itemListElement: { item?: string }[] }
  assert.deepEqual(crumbs.itemListElement.map((i) => i.item), [`${SITE}/kirill/`, `${SITE}/kirill/blog/`, undefined])
  const person = nodes.find((n) => n['@type'] === 'Person')!
  assert.equal(person.jobTitle, transliterateText('Marketing mutaxassisi', 'cyrl', cfg))
  assert.equal(person.name, transliterateText('Jurabek', 'cyrl', cfg))
  assert.equal((site.potentialAction as { target: { urlTemplate: string } }[])[0].target.urlTemplate, `${SITE}/kirill/search/?q={search_term_string}`)
})

test('JSON-LD on latn keeps inLanguage from settings (unchanged)', () => {
  const s = settings()
  const r = resolveSeo({ kind: 'post', path: '/marketing-nima/', post: post(), script: 'latn' }, s, SITE)
  const g = buildGraph({ settings: s, siteUrl: SITE, seo: r, url: r.url, post: post() }) as { '@graph': Record<string, unknown>[] }
  const article = g['@graph'].find((n) => n['@type'] === 'BlogPosting')!
  assert.equal(article.inLanguage, 'uz')
  assert.equal(article['@id'], `${SITE}/marketing-nima/#article`)
  assert.equal(g['@graph'].find((n) => n['@type'] === 'WebSite')!['@id'], `${SITE}/#website`)
})

test('paged archive keeps the page number in canonical and hreflang', () => {
  const { m } = meta({ kind: 'blog', path: '/blog/', page: 2, pageTotal: 3, script: 'cyrl' })
  assert.equal(m.alternates?.canonical, `${SITE}/kirill/blog/page/2/`)
  assert.deepEqual(m.alternates?.languages, LANGS('/blog/page/2/'))
  const t = meta({ kind: 'category', path: '/category/marketing/', term: term(), page: 2, pageTotal: 2, script: 'cyrl' })
  assert.equal(t.m.alternates?.canonical, `${SITE}/kirill/category/marketing/page/2/`)
  assert.deepEqual(t.m.alternates?.languages, LANGS('/category/marketing/page/2/'))
})

test('existing noindex rules apply to every alphabet; noindex pages list no alternates', () => {
  const s = settings((x) => (x.reading.discourageSearchEngines = true))
  for (const script of ['latn', 'cyrl', 'yangi'] as const) {
    const { m } = meta({ kind: 'home', path: '/', script }, s)
    assert.equal((m.robots as { index?: boolean }).index, false)
    assert.equal(m.alternates?.languages, undefined)
  }
  const np = meta({ kind: 'post', path: '/marketing-nima/', post: post({ seo: { robotsIndex: 'noindex' } }), script: 'cyrl' })
  assert.equal((np.m.robots as { index?: boolean }).index, false)
  const search = meta({ kind: 'search', path: '/search/', search: 'shahar', script: 'cyrl' })
  assert.equal((search.m.robots as { index?: boolean }).index, false)
  assert.equal(search.m.alternates?.canonical, undefined)
})

test('feed alternate points at the alphabet feed', () => {
  const types = (script: 'latn' | 'cyrl' | 'yangi') =>
    (meta({ kind: 'home', path: '/', script }).m.alternates?.types as Record<string, { url: string }[]>)['application/rss+xml'][0].url
  assert.equal(types('latn'), '/feed/')
  assert.equal(types('cyrl'), '/kirill/feed/')
  assert.equal(types('yangi'), '/yangi/feed/')
})

test('custom-canonical detection normalizes the URL (slash, query, hash, scheme, relative)', () => {
  for (const canonical of [
    `${SITE}/marketing-nima`,
    `${SITE}/marketing-nima/?utm_source=x`,
    `${SITE}/marketing-nima/#top`,
    'http://www.jurabek.blog/marketing-nima/',
    'https://jurabek.blog/marketing-nima/',
    'HTTPS://WWW.Jurabek.Blog/marketing-nima/',
    '/marketing-nima/',
    'marketing-nima',
  ]) {
    const p = post({ seo: { canonical } })
    const v = meta({ kind: 'post', path: '/marketing-nima/', post: p, script: 'cyrl' })
    assert.equal((v.m.robots as { index?: boolean }).index, true, canonical)
    assert.deepEqual(v.m.alternates?.languages, LANGS('/marketing-nima/'), canonical)
  }
  for (const canonical of ['https://example.com/x/', 'https://example.com/marketing-nima/', `${SITE}/boshqa/`, 'https://www.jurabek.blog.evil.com/marketing-nima/']) {
    const v = meta({ kind: 'post', path: '/marketing-nima/', post: post({ seo: { canonical } }), script: 'cyrl' })
    assert.equal((v.m.robots as { index?: boolean }).index, false, canonical)
    assert.equal(v.m.alternates?.languages, undefined, canonical)
  }
})

test('the Latin canonical tag itself is unchanged by the normalized comparison', () => {
  for (const canonical of [`${SITE}/marketing-nima`, `${SITE}/marketing-nima/?utm_source=x`, 'http://www.jurabek.blog/marketing-nima/', 'https://example.com/x/']) {
    const latn = meta({ kind: 'post', path: '/marketing-nima/', post: post({ seo: { canonical } }), script: 'latn' })
    assert.equal(latn.m.alternates?.canonical, canonical)
  }
})

test('og:image: variants pass the alphabet to /og, Latin URLs are unchanged', () => {
  const latn = resolveSeo({ kind: 'post', path: '/marketing-nima/', post: post(), script: 'latn' }, settings(), SITE)
  assert.equal(latn.ogImage.url, `${SITE}/og/?title=Marketing+nima&label=Marketing`)
  const cy = resolveSeo({ kind: 'post', path: '/marketing-nima/', post: post(), script: 'cyrl' }, settings(), SITE)
  assert.equal(cy.ogImage.url, `${SITE}/og/?title=Marketing+nima&label=Marketing&script=cyrl`)
  assert.equal(cy.twitterImage, cy.ogImage.url)
  const ya = resolveSeo({ kind: 'home', path: '/', script: 'yangi' }, settings(), SITE)
  assert.equal(ya.ogImage.url, `${SITE}/og/?title=Jurabek+Blog&script=yangi`)
  // Uploaded images are not touched.
  const img = resolveSeo({ kind: 'post', path: '/marketing-nima/', post: post({ seo: { ogImage: '/uploads/a.png' } }), script: 'cyrl' }, settings(), SITE)
  assert.equal(img.ogImage.url, `${SITE}/uploads/a.png`)
})
