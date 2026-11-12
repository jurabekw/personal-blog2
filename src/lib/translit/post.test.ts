import { expect, test } from 'vitest';
import { transliteratePost, transliterateCategory } from './post.js';
import { DEFAULT_TRANSLIT_CONFIG as cfg } from './defaults.js';
import type { Post } from '../../types.js';

const samplePost: Post = {
  id: 'p1',
  title: 'Marketing nima',
  slug: 'marketing-nima',
  excerpt: 'Qisqa tavsif',
  content: '## Kirish\nMarketing haqida [maqola](https://x.uz/marketing).',
  coverImage: '/img/m.png',
  coverImageAlt: 'Marketing rasmi',
  status: 'published',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
  readingTimeMinutes: 3,
  wordCount: 500,
  category: 'Marketing',
  tags: ['strategiya'],
  isFeatured: false,
  seoTitle: 'Marketing nima — qoʻllanma',
  seoDescription: 'Tavsif',
  footnotes: [{ id: 'f1', number: 1, text: 'Manba' }],
  faqs: [{ id: 'q1', question: 'Nima uchun kerak?', answer: 'Sotuv uchun.' }],
};

test('converts text fields, never slug or urls', () => {
  const out = transliteratePost(samplePost, 'cyrl', cfg);
  expect(out.slug).toBe(samplePost.slug);
  expect(out.id).toBe(samplePost.id);
  expect(out.coverImage).toBe(samplePost.coverImage);
  expect(out.title).toBe('Маркетинг нима');
  expect(out.excerpt).toBe('Қисқа тавсиф');
  expect(out.content).toBe('## Кириш\nМаркетинг ҳақида [мақола](https://x.uz/marketing).');
  expect(out.coverImageAlt).toBe('Маркетинг расми');
  expect(out.category).toBe('Маркетинг');
  expect(out.tags).toEqual(['стратегия']);
  expect(out.seoTitle).toBe('Маркетинг нима — қўлланма');
  expect(out.footnotes![0].text).toBe('Манба');
  expect(out.faqs![0].question).toBe('Нима учун керак?');
  expect(out.faqs![0].answer).toBe('Сотув учун.');
  expect(out.publishedAt).toBe(samplePost.publishedAt);
});

test('latn returns the same object', () => {
  expect(transliteratePost(samplePost, 'latn', cfg)).toBe(samplePost);
});

test('memoised per post version, script and dictionary version', () => {
  const a = transliteratePost(samplePost, 'yangi', cfg);
  expect(transliteratePost(samplePost, 'yangi', cfg)).toBe(a);
  const edited = { ...samplePost, updatedAt: '2026-02-01T00:00:00Z', title: 'Choy' };
  expect(transliteratePost(edited, 'yangi', cfg).title).toBe('Çoy');
  const cfg2 = { ...cfg, version: 'other' };
  expect(transliteratePost(samplePost, 'yangi', cfg2)).not.toBe(a);
});

test('categories keep slug', () => {
  const c = transliterateCategory({ id: 'c', name: 'Sun’iy intellekt', slug: 'suniy-intellekt' }, 'cyrl', cfg);
  expect(c.name).toBe('Сунъий интеллект');
  expect(c.slug).toBe('suniy-intellekt');
});
