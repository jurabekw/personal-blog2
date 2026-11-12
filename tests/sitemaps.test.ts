import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  postUrlEntries,
  termUrlEntries,
  urlset,
  sitemapFiles,
  sitemapIndexXml,
  isPostIndexable,
} from '../src/lib/seo/sitemaps'
import { buildFeedXml } from '../src/lib/seo/feed'
import { resolveSeo } from '../src/lib/seo/resolve'
import { searchLikePattern } from '../src/lib/data/search-pattern'
import { DEFAULT_SETTINGS, type AllSettings } from '../src/lib/settings-defaults'
import { DEFAULT_TRANSLIT_CONFIG as cfg, normalizeForSearch, transliterateText } from '../src/lib/translit'
import type { PostFull, TermRef } from '../src/lib/data/posts'

const SITE = 'https://www.jurabek.blog'

const settings = (over: (s: AllSettings) => void = () => {}): AllSettings => {
  const s: AllSettings = structuredClone(DEFAULT_SETTINGS)
  s.general.siteName = 'Jurabek Blog'
  s.general.tagline = 'Marketing haqida blog'
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
    category: term(), content: '<p>Shahar haqida</p>', template: 'default', status: 'publish',
    categories: [term()], tags: [], seo: {}, faq: [], authorId: 1, parentId: null, ...over,
  }) as PostFull

const LANGS = (path: string) => ({ 'uz-Latn': `${SITE}${path}`, 'uz-Cyrl': `${SITE}/kirill${path}`, 'x-default': `${SITE}${path}` })

const custom = post({ id: 8, slug: 'kanonik', path: '/kanonik/', seo: { canonical: 'https://example.com/original/' } })

test('latn entries carry uz-Latn/uz-Cyrl/x-default alternates and the urlset declares xmlns:xhtml', () => {
  const entries = postUrlEntries([post()], 'post', settings(), SITE, 'latn')
  assert.equal(entries.length, 1)
  assert.equal(entries[0].loc, `${SITE}/marketing-nima/`)
  assert.deepEqual(entries[0].alternates, LANGS('/marketing-nima/'))
  const xml = urlset(entries)
  assert.match(xml, /<urlset [^>]*xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/)
  assert.ok(xml.includes(`<xhtml:link rel="alternate" hreflang="uz-Latn" href="${SITE}/marketing-nima/" />`), xml)
  assert.ok(xml.includes(`<xhtml:link rel="alternate" hreflang="uz-Cyrl" href="${SITE}/kirill/marketing-nima/" />`), xml)
  assert.ok(xml.includes(`<xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/marketing-nima/" />`), xml)
})

test('kirill entries have /kirill/ locs and the same alternates as latn', () => {
  const latn = postUrlEntries([post()], 'post', settings(), SITE, 'latn')
  const cyrl = postUrlEntries([post()], 'post', settings(), SITE, 'cyrl')
  assert.equal(cyrl[0].loc, `${SITE}/kirill/marketing-nima/`)
  assert.deepEqual(cyrl[0].alternates, latn[0].alternates)
  assert.deepEqual(cyrl[0].lastmod, latn[0].lastmod)
})

test('sitemap alternates are exactly what the page <head> emits (same helper as resolveSeo)', () => {
  for (const script of ['latn', 'cyrl'] as const) {
    const r = resolveSeo({ kind: 'post', path: '/marketing-nima/', post: post(), script }, settings(), SITE)
    const e = postUrlEntries([post()], 'post', settings(), SITE, script)[0]
    assert.deepEqual(e.alternates, r.languages)
    assert.equal(e.loc, r.canonical)
  }
  const tr = resolveSeo({ kind: 'category', path: '/category/marketing/', term: term(), script: 'cyrl' }, settings(), SITE)
  const te = termUrlEntries([term()], [post()], 'category', settings(), SITE, 'cyrl')[0]
  assert.deepEqual(te.alternates, tr.languages)
  assert.equal(te.loc, tr.canonical)
})

test('yangi entries have no alternates, and there are none at all when indexNewLatin is off', () => {
  const on = postUrlEntries([post()], 'post', settings(), SITE, 'yangi')
  assert.equal(on.length, 1)
  assert.equal(on[0].loc, `${SITE}/yangi/marketing-nima/`)
  assert.equal(on[0].alternates, undefined)
  assert.ok(!urlset(on).includes('<xhtml:link'))
  const off = settings((s) => (s.alphabets.indexNewLatin = false))
  assert.deepEqual(postUrlEntries([post()], 'post', off, SITE, 'yangi'), [])
  assert.deepEqual(postUrlEntries([post()], 'page', off, SITE, 'yangi'), [])
  assert.deepEqual(termUrlEntries([term()], [post()], 'category', off, SITE, 'yangi'), [])
  // The switch does not touch Cyrillic.
  assert.equal(postUrlEntries([post()], 'post', off, SITE, 'cyrl').length, 1)
})

test('custom-canonical posts are left out of kirill and yangi sitemaps (latn unchanged)', () => {
  const s = settings()
  for (const script of ['latn', 'cyrl', 'yangi'] as const) {
    const locs = postUrlEntries([post(), custom], 'post', s, SITE, script).map((e) => e.loc)
    assert.equal(locs.length, 1, `${script}: ${locs.join(', ')}`)
  }
  // A canonical that only differs by trailing slash / query / scheme is the page itself.
  for (const canonical of [`${SITE}/marketing-nima`, `${SITE}/marketing-nima/?utm_source=x`, 'http://www.jurabek.blog/marketing-nima/', '/marketing-nima/']) {
    const p = post({ seo: { canonical } })
    const e = postUrlEntries([p], 'post', s, SITE, 'cyrl')
    assert.equal(e.length, 1, canonical)
    assert.deepEqual(e[0].alternates, LANGS('/marketing-nima/'), canonical)
  }
  // Noindex posts stay out everywhere.
  const noindex = post({ seo: { robotsIndex: 'noindex' } })
  for (const script of ['latn', 'cyrl', 'yangi'] as const) assert.deepEqual(postUrlEntries([noindex], 'post', s, SITE, script), [])
  assert.equal(isPostIndexable(custom, s, SITE, 'latn'), false)
  assert.equal(isPostIndexable(custom, s, SITE, 'cyrl'), false)
})

test('terms: custom-canonical terms keep their latn entry without alternates and leave the variant sitemaps', () => {
  const t = term({ id: 2, path: '/category/boshqa/', seo: { canonical: 'https://example.com/cat/' } })
  const latn = termUrlEntries([term(), t], [post()], 'category', settings(), SITE, 'latn')
  assert.deepEqual(latn.map((e) => e.loc), [`${SITE}/category/marketing/`, `${SITE}/category/boshqa/`])
  assert.deepEqual(latn[0].alternates, LANGS('/category/marketing/'))
  assert.equal(latn[1].alternates, undefined)
  const cyrl = termUrlEntries([term(), t], [post()], 'category', settings(), SITE, 'cyrl')
  assert.deepEqual(cyrl.map((e) => e.loc), [`${SITE}/kirill/category/marketing/`])
  // Child categories keep their full path.
  const child = term({ id: 3, slug: 'seo', path: '/category/marketing/seo/', parentId: 1 })
  assert.equal(termUrlEntries([child], [], 'category', settings(), SITE, 'cyrl')[0].loc, `${SITE}/kirill/category/marketing/seo/`)
  // Empty and noindex terms stay out.
  assert.deepEqual(termUrlEntries([term({ count: 0 })], [], 'category', settings(), SITE, 'cyrl'), [])
})

test('page sitemap: home and blog entries per alphabet', () => {
  const page = post({ id: 9, type: 'page', slug: 'men-haqimda', path: '/men-haqimda/' })
  const cyrl = postUrlEntries([page], 'page', settings(), SITE, 'cyrl', new Date('2026-02-01'))
  assert.deepEqual(cyrl.map((e) => e.loc), [`${SITE}/kirill/`, `${SITE}/kirill/blog/`, `${SITE}/kirill/men-haqimda/`])
  assert.deepEqual(cyrl[0].alternates, LANGS('/'))
  assert.deepEqual(cyrl[1].alternates, LANGS('/blog/'))
  const latn = postUrlEntries([page], 'page', settings(), SITE, 'latn', new Date('2026-02-01'))
  assert.deepEqual(latn.map((e) => e.loc), [`${SITE}/`, `${SITE}/blog/`, `${SITE}/men-haqimda/`])
  const yangi = postUrlEntries([page], 'page', settings(), SITE, 'yangi', new Date('2026-02-01'))
  assert.deepEqual(yangi.map((e) => e.loc), [`${SITE}/yangi/`, `${SITE}/yangi/blog/`, `${SITE}/yangi/men-haqimda/`])
  assert.ok(yangi.every((e) => !e.alternates))
})

test('the index lists 12 sitemaps (4 latn + 4 kirill + 4 yangi), or 8 when the yangi switch is off', () => {
  const all = sitemapFiles(settings()).map((f) => f.name)
  assert.deepEqual(all, [
    'post-sitemap.xml', 'page-sitemap.xml', 'category-sitemap.xml', 'post_tag-sitemap.xml',
    'kirill-post-sitemap.xml', 'kirill-page-sitemap.xml', 'kirill-category-sitemap.xml', 'kirill-post_tag-sitemap.xml',
    'yangi-post-sitemap.xml', 'yangi-page-sitemap.xml', 'yangi-category-sitemap.xml', 'yangi-post_tag-sitemap.xml',
  ])
  const off = sitemapFiles(settings((s) => (s.alphabets.indexNewLatin = false))).map((f) => f.name)
  assert.equal(off.length, 8)
  assert.ok(off.every((n) => !n.startsWith('yangi-')))
  const noTags = sitemapFiles(settings((s) => (s.seo.sitemaps.includeTags = false))).map((f) => f.name)
  assert.equal(noTags.length, 9)
  assert.ok(noTags.every((n) => !n.includes('post_tag')))
  const xml = sitemapIndexXml(
    all.map((name) => ({ name, entries: [{ lastmod: new Date('2026-01-02') }] })),
    SITE,
  )
  assert.equal((xml.match(/<sitemap>/g) ?? []).length, 12)
  assert.ok(xml.includes(`<loc>${SITE}/kirill-post-sitemap.xml</loc>`))
})

test('feed: <language> uz-Cyrl and Cyrillic items with /kirill/ links', () => {
  const s = settings()
  const xml = buildFeedXml([post()], s, SITE, 'cyrl')
  assert.match(xml, /<language>uz-Cyrl<\/language>/)
  assert.ok(xml.includes(`<link>${SITE}/kirill/marketing-nima/</link>`), xml)
  assert.ok(xml.includes(`<atom:link href="${SITE}/kirill/feed/"`), xml)
  assert.ok(xml.includes(`<link>${SITE}/kirill/</link>`), xml)
  assert.ok(xml.includes(`<title>${transliterateText('Marketing nima', 'cyrl', cfg)}</title>`), xml)
  assert.ok(xml.includes(`<title>${transliterateText('Jurabek Blog', 'cyrl', cfg)}</title>`), xml)
  assert.ok(xml.includes(transliterateText('Shahar haqida', 'cyrl', cfg)), xml)
  assert.ok(!xml.includes('Shahar haqida'))
  const yangi = buildFeedXml([post()], s, SITE, 'yangi')
  assert.match(yangi, /<language>uz-Latn<\/language>/)
  assert.ok(yangi.includes(`<link>${SITE}/yangi/marketing-nima/</link>`))
  assert.ok(yangi.includes('Şahar haqida'), yangi)
  // Latin keeps the configured language and root links.
  const latn = buildFeedXml([post()], s, SITE, 'latn')
  assert.match(latn, /<language>uz<\/language>/)
  assert.ok(latn.includes(`<link>${SITE}/marketing-nima/</link>`))
})

test('feed: rss before/after templates are resolved with alphabet links, then transliterated', () => {
  const s = settings((x) => (x.seo.rss.after = 'Manba: %%POSTLINK%%'))
  const xml = buildFeedXml([post()], s, SITE, 'cyrl')
  const expected = `<p>${transliterateText('Manba', 'cyrl', cfg)}: <a href="${SITE}/kirill/marketing-nima/">${transliterateText('Marketing nima', 'cyrl', cfg)}</a></p>`
  assert.ok(xml.includes(expected), xml)
  const latn = buildFeedXml([post()], s, SITE, 'latn')
  assert.ok(latn.includes(`<p>Manba: <a href="${SITE}/marketing-nima/">Marketing nima</a></p>`), latn)
})

test('feed: variants leave out custom-canonical and noindex posts', () => {
  const xml = buildFeedXml([post(), custom, post({ id: 10, path: '/yashirin/', seo: { robotsIndex: 'noindex' } })], settings(), SITE, 'cyrl')
  assert.equal((xml.match(/<item>/g) ?? []).length, 1)
})

test('search: queries in any alphabet become a current-Latin ILIKE pattern', () => {
  assert.equal(searchLikePattern('маркетинг'), '%marketing%')
  assert.equal(searchLikePattern('şahar'), '%shahar%')
  // Current-Latin lowercase text passes through unchanged.
  assert.equal(searchLikePattern('marketing'), '%marketing%')
  assert.equal(searchLikePattern('  sun iy intellekt '), '%sun iy intellekt%')
  // normalizeForSearch is the identity on lowercase current-Latin text (apostrophes aside).
  const latin = 'abcdefghijklmnopqrstuvwxyz shahar choy ng yoqimli 2026 - marketing'
  assert.equal(normalizeForSearch(latin), latin)
  assert.equal(searchLikePattern(latin), `%${latin}%`)
  // Upper case only changes case, which ILIKE ignores.
  assert.equal(searchLikePattern('Marketing NIMA'), '%marketing nima%')
  // LIKE wildcards typed by the user are literal.
  assert.equal(searchLikePattern('50%_x'), '%50\\%\\_x%')
  // Apostrophes match any apostrophe variant stored in the content.
  assert.equal(searchLikePattern("o'zbek"), '%o_zbek%')
  assert.equal(searchLikePattern('ўзбек'), '%o_zbek%')
})
