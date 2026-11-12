import { test } from 'node:test'
import assert from 'node:assert/strict'
import { localizePost, localizeTerm, localizeSettings } from '../src/lib/localize'
import { getT } from '../src/lib/i18n'
import { formatDate } from '../src/lib/format'
import { DEFAULT_SETTINGS } from '../src/lib/settings-defaults'
import { DEFAULT_TRANSLIT_CONFIG as cfg, transliterateText } from '../src/lib/translit'
import type { PostFull, TermRef } from '../src/lib/data/posts'

const term = (over: Partial<TermRef> = {}): TermRef => ({
  id: 1, taxonomy: 'category', name: 'Marketing', slug: 'marketing', path: '/category/marketing/',
  parentId: null, description: 'Ish haqida', count: 3,
  seo: { title: 'Ish %%sep%% %%sitename%%', canonical: 'https://x.uz/a', focusKeyphrase: 'ish' }, ...over,
})

const post = (over: Partial<PostFull> = {}): PostFull =>
  ({
    id: 7, type: 'post', title: 'Yangi maqola', slug: 'yangi-maqola', path: '/yangi-maqola/',
    excerpt: 'Qisqa matn', hasManualExcerpt: true,
    publishedAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-02'),
    wordCount: 10, readingMinutes: 1, sticky: false,
    image: { id: 2, url: '/uploads/a.jpg', width: 1, height: 1, alt: 'Rasm tavsifi' },
    category: term(), content: '<p>Salom dunyo <a href="/blog/">blog</a></p>', template: 'default', status: 'publish',
    categories: [term()], tags: [term({ id: 2, taxonomy: 'tag', name: 'Savol', slug: 'savol' })],
    seo: { title: 'Yangi %%title%% %%sep%%', metaDescription: 'Tavsif', canonical: 'https://x.uz/y', focusKeyphrase: 'maqola', breadcrumbTitle: 'Maqola', ogTitle: 'Og sarlavha', twitterDescription: 'Tw tavsif' },
    faq: [{ question: 'Nima?', answer: '<p>Shunday</p>' }],
    authorId: 1, parentId: null, ...over,
  }) as PostFull

test('latn returns the same object', () => {
  const p = post()
  assert.equal(localizePost(p, 'latn', cfg), p)
  assert.equal(localizeTerm(term(), 'latn', cfg).name, 'Marketing')
  assert.equal(localizeSettings(DEFAULT_SETTINGS, 'latn', cfg, ''), DEFAULT_SETTINGS)
})

test('localizePost converts text and keeps identifiers, without mutating', () => {
  const p = post()
  const snapshot = JSON.stringify(p)
  const r = localizePost(p, 'cyrl', cfg)
  assert.equal(JSON.stringify(p), snapshot)
  assert.notEqual(r, p)
  assert.equal(r.title, transliterateText('Yangi maqola', 'cyrl', cfg))
  assert.notEqual(r.title, p.title)
  assert.ok(r.content.includes('href="/blog/"'))
  assert.notEqual(r.content, p.content)
  assert.notEqual(r.faq[0].question, 'Nima?')
  assert.ok(r.faq[0].answer.startsWith('<p>'))
  assert.notEqual(r.image!.alt, 'Rasm tavsifi')
  assert.equal(r.image!.url, '/uploads/a.jpg')
  assert.equal(r.path, '/yangi-maqola/')
  assert.equal(r.slug, 'yangi-maqola')
  assert.equal(r.id, 7)
  assert.equal(r.publishedAt, p.publishedAt)
  assert.equal(r.seo.canonical, 'https://x.uz/y')
  assert.equal(r.seo.focusKeyphrase, 'maqola')
  assert.notEqual(r.seo.metaDescription, 'Tavsif')
  assert.notEqual(r.seo.ogTitle, 'Og sarlavha')
  assert.notEqual(r.seo.twitterDescription, 'Tw tavsif')
  assert.notEqual(r.seo.breadcrumbTitle, 'Maqola')
  assert.notEqual(r.category!.name, 'Marketing')
  assert.equal(r.category!.slug, 'marketing')
  assert.notEqual(r.tags[0].name, 'Savol')
  assert.equal(r.categories[0].path, '/category/marketing/')
})

test('%%var%% tokens survive in SEO titles', () => {
  const r = localizePost(post(), 'cyrl', cfg)
  assert.ok(r.seo.title!.includes('%%title%%'))
  assert.ok(r.seo.title!.includes('%%sep%%'))
  assert.ok(!/yangi/i.test(r.seo.title!.replace(/%%[a-z_]+%%/g, '')))
  const t = localizeTerm(term(), 'yangi', cfg)
  assert.ok(t.seo.title!.includes('%%sitename%%'))
})

test('localizeTerm converts name/description, keeps slug/path/count', () => {
  const r = localizeTerm(term(), 'cyrl', cfg)
  assert.equal(r.name, transliterateText('Marketing', 'cyrl', cfg))
  assert.equal(r.slug, 'marketing')
  assert.equal(r.path, '/category/marketing/')
  assert.equal(r.count, 3)
  assert.equal(r.seo.canonical, 'https://x.uz/a')
})

test('memo returns same object for same id+updatedAt+script+version', () => {
  const a = localizePost(post(), 'cyrl', cfg)
  const b = localizePost(post(), 'cyrl', cfg)
  assert.equal(a, b)
  const c = localizePost(post({ updatedAt: new Date('2026-02-01') }), 'cyrl', cfg)
  assert.notEqual(a, c)
  assert.notEqual(localizePost(post(), 'yangi', cfg), a)
})

test('localizeSettings: menus, texts; leaves non-visible fields', () => {
  const r = localizeSettings(DEFAULT_SETTINGS, 'cyrl', cfg, 'https://www.jurabek.blog')
  const blog = r.menus.primary.find((m) => m.id === 'blog')!
  assert.equal(blog.url, '/kirill/blog/')
  assert.equal(blog.label, transliterateText('Blog', 'cyrl', cfg))
  assert.equal(r.menus.primary[0].url, '/kirill/')
  assert.equal(r.general.tagline, transliterateText('Marketing mutaxassisi', 'cyrl', cfg))
  assert.notEqual(r.appearance.author.bio, DEFAULT_SETTINGS.appearance.author.bio)
  assert.equal(r.appearance.primaryColor, '#1cca59')
  assert.equal(r.appearance.author.socials[0].url, 'https://t.me/jurabeekkd')
  assert.equal(r.appearance.author.aboutUrl, '/men-haqimda/')
  assert.equal(r.seo.titles.search, DEFAULT_SETTINGS.seo.titles.search)
  assert.notEqual(r.seo.breadcrumbs.homeLabel, 'Bosh sahifa')
  assert.equal(r.alphabets, DEFAULT_SETTINGS.alphabets)
  assert.equal(DEFAULT_SETTINGS.menus.primary[1].url, '/blog/')
})

test('getT', () => {
  assert.equal(getT('cyrl', cfg).readingTime(5), '5 дақиқа ўқиш')
  assert.equal(getT('yangi', cfg).share, 'Postni ulaşing')
  assert.equal(getT('cyrl', cfg), getT('cyrl', cfg))
  assert.equal(getT('latn', cfg).share, 'Postni ulashing')
})

test('formatDate transliterates when script is given', () => {
  const d = new Date('2026-10-02T10:00:00Z')
  assert.equal(formatDate(d, 'uz', 'Asia/Tashkent'), 'Oktabr 2, 2026')
  assert.equal(formatDate(d, 'uz', 'Asia/Tashkent', 'latn'), 'Oktabr 2, 2026')
  assert.equal(formatDate(d, 'uz', 'Asia/Tashkent', 'cyrl'), transliterateText('Oktabr 2, 2026', 'cyrl', cfg))
})
