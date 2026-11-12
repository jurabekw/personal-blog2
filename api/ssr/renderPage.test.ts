import { beforeEach, expect, test, vi } from 'vitest';
import type { Post, SiteSettings } from '../../src/types';

const basePost = (over: Partial<Post>): Post => ({
  id: over.slug || 'p', title: 'Marketing nima', slug: 'marketing-nima', excerpt: 'Qisqa tavsif',
  content: '## Kirish\nMarketing haqida matn.', status: 'published',
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z', publishedAt: '2026-01-01T00:00:00Z',
  readingTimeMinutes: 2, wordCount: 300, category: 'Marketing', tags: [], isFeatured: false,
  faqs: [{ id: 'q', question: 'Nima uchun?', answer: 'Sotuv uchun.' }],
  ...over,
});

const posts: Post[] = [
  basePost({}),
  basePost({ id: 'x', slug: 'xss-post', title: '</script><script>alert(1)</script>' }),
  basePost({ id: 'd', slug: 'draft-post', status: 'draft' }),
  basePost({ id: 's', slug: 'scheduled-post', status: 'scheduled' }),
];

const settings = {
  title: 'Jurabek', description: 'Blog', authorName: 'Jurabek', authorBio: 'Bio', authorAvatar: '',
  email: 'a@b.c', postsPerPage: 10, showReadingTime: true, showProgress: true, analyticsEnabled: true,
} as SiteSettings;

vi.mock('./loadData.js', async () => {
  return {
    fetchSettings: async () => settings,
    fetchPublishedPosts: async () => posts.filter((p) => p.status === 'published'),
    fetchCategories: async () => [{ id: 'c', name: 'Marketing', slug: 'marketing' }],
  };
});

const { renderPage } = await import('./renderPage');

const TEMPLATE =
  '<!doctype html><html lang="uz-Latn"><head><meta charset="UTF-8" />' +
  '<!--ssr-head-start--><title>Jurabek</title><meta name="robots" content="noindex, nofollow"><!--ssr-head-end-->' +
  '<script type="module" src="/assets/index.js"></script></head>' +
  '<body><div id="root"><!--ssr-body--></div><!--ssr-bootstrap--></body></html>';

beforeEach(() => vi.clearAllMocks());

test('renders post html with head and body content', async () => {
  const r = await renderPage('/blog/marketing-nima', TEMPLATE, { alphabetsEnabled: true });
  expect(r.status).toBe(200);
  expect(r.html).toContain('<html lang="uz-Latn">');
  expect(r.html).toContain('<link rel="canonical" href="https://www.jurabek.blog/blog/marketing-nima"');
  expect(r.html).toMatch(/<h1[^>]*>Marketing nima<\/h1>/);
  expect(r.html).toContain('Marketing haqida matn.');
  expect(r.html).not.toContain('content="noindex, nofollow"');
  expect(r.html.match(/<title>/g)).toHaveLength(1);
  expect(r.headers['Cache-Control']).toBe('public, s-maxage=300, stale-while-revalidate=86400');
  expect(r.headers['Content-Type']).toBe('text/html; charset=utf-8');
});

test('cyrillic url renders cyrillic text and lang', async () => {
  const r = await renderPage('/kirill/blog/marketing-nima', TEMPLATE, { alphabetsEnabled: true });
  expect(r.status).toBe(200);
  expect(r.html).toContain('<html lang="uz-Cyrl">');
  expect(r.html).toContain('Маркетинг нима');
  expect(r.html).toContain('hreflang="uz-Latn"');
  expect(r.html).toContain('href="/kirill/blog"');
});

test('new latin url renders new latin text without hreflang', async () => {
  const r = await renderPage('/yangi/blog/marketing-nima', TEMPLATE, { alphabetsEnabled: true });
  expect(r.html).toContain('Marketing nima');
  expect(r.html).toContain('<html lang="uz-Latn">');
  expect(r.html).toContain('<link rel="canonical" href="https://www.jurabek.blog/yangi/blog/marketing-nima"');
  expect(r.html).not.toContain('hreflang=');
  expect(r.html).toContain('content="index, follow"');
});

test('home, archive and contact render', async () => {
  for (const [u, text] of [['/', 'Marketing nima'], ['/blog', 'Marketing nima'], ['/contact', 'a@b.c']] as const) {
    const r = await renderPage(u, TEMPLATE, { alphabetsEnabled: true });
    expect(r.status).toBe(200);
    expect(r.html).toContain(text);
  }
});

test('archive lists only published posts', async () => {
  const r = await renderPage('/blog', TEMPLATE, { alphabetsEnabled: true });
  expect(r.html).not.toContain('/blog/draft-post');
  expect(r.html).not.toContain('/blog/scheduled-post');
});

test('returns 404 noindex for unknown or unpublished slug', async () => {
  for (const u of ['/kirill/blog/not-a-post', '/blog/draft-post', '/yangi/blog/scheduled-post', '/random-page']) {
    const r = await renderPage(u, TEMPLATE, { alphabetsEnabled: true });
    expect(r.status).toBe(404);
    expect(r.html).toContain('noindex');
  }
});

test('prefixed urls 404 when alphabets disabled', async () => {
  const r = await renderPage('/kirill/', TEMPLATE, { alphabetsEnabled: false });
  expect(r.status).toBe(404);
  expect(r.html).not.toContain('hreflang=');
});

test('bootstrap json is script-safe', async () => {
  const r = await renderPage('/blog/xss-post', TEMPLATE, { alphabetsEnabled: true });
  expect(r.status).toBe(200);
  expect(r.html).not.toContain('</script><script>alert');
  expect(r.html).toContain('window.__BOOTSTRAP__=');
});

test('bootstrap carries current post content but not every post body', async () => {
  const r = await renderPage('/blog/marketing-nima', TEMPLATE, { alphabetsEnabled: true });
  const json = r.html.match(/window\.__BOOTSTRAP__=(.*?)<\/script>/)![1];
  const boot = JSON.parse(json);
  expect(boot.script).toBe('latn');
  expect(boot.post.content).toContain('Marketing haqida');
  expect(boot.posts.every((p: Post) => p.content === '')).toBe(true);
});

test('canonical of post uses stored slug even if url casing differs', async () => {
  const r = await renderPage('/blog/Marketing-Nima?utm_source=tg', TEMPLATE, { alphabetsEnabled: true });
  expect(r.status).toBe(200);
  expect(r.html).toContain('<link rel="canonical" href="https://www.jurabek.blog/blog/marketing-nima"');
});
