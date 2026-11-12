import { expect, test } from 'vitest';
import { pageKindFor } from './pageCopy';

test('classifies paths', () => {
  expect(pageKindFor('/')).toEqual({ kind: 'home' });
  expect(pageKindFor('/blog')).toEqual({ kind: 'blog' });
  expect(pageKindFor('/blog/')).toEqual({ kind: 'blog' });
  expect(pageKindFor('/contact')).toEqual({ kind: 'contact' });
  expect(pageKindFor('/blog/Marketing-Nima/')).toEqual({ kind: 'post', slug: 'marketing-nima' });
  expect(pageKindFor('/blog/a/b')).toEqual({ kind: 'notfound' });
  expect(pageKindFor('/random')).toEqual({ kind: 'notfound' });
  expect(pageKindFor('/blog/%E0%A4%A')).toEqual({ kind: 'post', slug: '%e0%a4%a' });
});
