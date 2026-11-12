import { expect, test } from 'vitest';
import { buildHeadTags, renderHeadTags, type HeadTag, type PageMeta } from './head.js';
import type { Post } from '../../types.js';

const p: Post = {
  id: 'p1', title: 'Маркетинг нима', slug: 'marketing-nima', excerpt: 'Тавсиф', content: '',
  status: 'published', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z',
  publishedAt: '2026-01-01T00:00:00Z', readingTimeMinutes: 1, wordCount: 10, category: 'Маркетинг',
  tags: [], isFeatured: false, faqs: [{ id: 'q', question: 'Савол?', answer: 'Жавоб.' }],
};

const base: PageMeta = {
  script: 'latn', path: '/', title: '', description: 'Tavsif', type: 'website',
  indexNewLatin: true, siteTitle: 'Jurabek', authorName: 'Jurabek',
};

const find = (tags: HeadTag[], tag: string, rel: string) =>
  tags.find((t) => t.tag === tag && (t.attrs.rel === rel || t.attrs.name === rel || t.attrs.property === rel))!.attrs;
const alternates = (tags: HeadTag[]) =>
  tags.filter((t) => t.attrs.rel === 'alternate' && t.attrs.hreflang).map((t) => [t.attrs.hreflang, t.attrs.href]);
const robots = (tags: HeadTag[]) => find(tags, 'meta', 'robots').content;
const titleOf = (tags: HeadTag[]) => tags.find((t) => t.tag === 'title')!.text;
const jsonLd = (tags: HeadTag[]) => JSON.parse(tags.find((t) => t.tag === 'script')!.text!);

test('cyrillic post has self canonical and reciprocal hreflang', () => {
  const tags = buildHeadTags({ ...base, script: 'cyrl', path: '/blog/marketing-nima' }, true);
  expect(find(tags, 'link', 'canonical').href).toBe('https://www.jurabek.blog/kirill/blog/marketing-nima');
  expect(alternates(tags)).toEqual([
    ['uz-Latn', 'https://www.jurabek.blog/blog/marketing-nima'],
    ['uz-Cyrl', 'https://www.jurabek.blog/kirill/blog/marketing-nima'],
    ['x-default', 'https://www.jurabek.blog/blog/marketing-nima'],
  ]);
});

test('latin home lists the same hreflang group', () => {
  const tags = buildHeadTags({ ...base, script: 'latn', path: '/' }, true);
  expect(alternates(tags)).toEqual([
    ['uz-Latn', 'https://www.jurabek.blog/'],
    ['uz-Cyrl', 'https://www.jurabek.blog/kirill/'],
    ['x-default', 'https://www.jurabek.blog/'],
  ]);
  expect(robots(tags)).toBe('index, follow');
});

test('yangi page: self canonical, indexable, no hreflang', () => {
  const tags = buildHeadTags({ ...base, script: 'yangi', path: '/' }, true);
  expect(find(tags, 'link', 'canonical').href).toBe('https://www.jurabek.blog/yangi/');
  expect(alternates(tags)).toEqual([]);
  expect(robots(tags)).toBe('index, follow');
});

test('yangi noindex when indexNewLatin=false', () => {
  expect(robots(buildHeadTags({ ...base, script: 'yangi', indexNewLatin: false }, true))).toBe('noindex, follow');
});

test('explicit noindex wins', () => {
  expect(robots(buildHeadTags({ ...base, noindex: true }, true))).toBe('noindex, follow');
});

test('alphabets disabled: no hreflang', () => {
  expect(alternates(buildHeadTags({ ...base, script: 'latn' }, false))).toEqual([]);
});

test('canonical strips query and trailing slash', () => {
  const tags = buildHeadTags({ ...base, script: 'latn', path: '/blog/Marketing-Nima/?utm=1' }, true);
  expect(find(tags, 'link', 'canonical').href).toBe('https://www.jurabek.blog/blog/marketing-nima');
  expect(find(tags, 'meta', 'og:url').content).toBe('https://www.jurabek.blog/blog/marketing-nima');
});

test('post uses seoTitle/seoDescription, json-ld has inLanguage', () => {
  const tags = buildHeadTags(
    { ...base, script: 'cyrl', path: '/blog/marketing-nima', type: 'article', title: p.title,
      post: { ...p, seoTitle: 'СЕО сарлавҳа', seoDescription: 'СЕО тавсиф' } },
    true,
  );
  expect(titleOf(tags)).toBe('СЕО сарлавҳа — Jurabek');
  expect(find(tags, 'meta', 'description').content).toBe('СЕО тавсиф');
  const ld = jsonLd(tags);
  expect(ld['@graph'][0]['@type']).toBe('BlogPosting');
  expect(ld['@graph'][0].inLanguage).toBe('uz-Cyrl');
  expect(ld['@graph'][0].mainEntityOfPage['@id']).toBe('https://www.jurabek.blog/kirill/blog/marketing-nima');
  expect(ld['@graph'][1]['@type']).toBe('FAQPage');
});

test('website json-ld uses real origin and in-alphabet search target', () => {
  const ld = jsonLd(buildHeadTags({ ...base, script: 'yangi', path: '/' }, true));
  expect(ld.url).toBe('https://www.jurabek.blog/yangi/');
  expect(ld.inLanguage).toBe('uz-Latn');
  expect(ld.potentialAction.target).toBe('https://www.jurabek.blog/yangi/blog?search={search_term_string}');
});

test('og locale and title default', () => {
  const tags = buildHeadTags(base, true);
  expect(find(tags, 'meta', 'og:locale').content).toBe('uz_UZ');
  expect(titleOf(tags)).toBe('Jurabek');
});

test('renderHeadTags escapes', () => {
  expect(renderHeadTags([{ tag: 'title', attrs: {}, text: 'A & "B"' }])).toBe('<title>A &amp; &quot;B&quot;</title>');
  expect(renderHeadTags([{ tag: 'meta', attrs: { name: 'description', content: '<x>' } }])).toBe(
    '<meta name="description" content="&lt;x&gt;">',
  );
});

test('renderHeadTags makes json-ld script-safe', () => {
  const html = renderHeadTags([{ tag: 'script', attrs: { type: 'application/ld+json' }, text: '{"a":"</script><b>"}' }]);
  expect(html).not.toContain('</script><b>');
});
