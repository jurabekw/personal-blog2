import { expect, test } from 'vitest';
import { buildScriptPath, canonicalPath, parseScriptPath } from './script';

test('parses prefixes', () => {
  expect(parseScriptPath('/kirill/blog/marketing-nima')).toEqual({ script: 'cyrl', path: '/blog/marketing-nima', isPage: true });
  expect(parseScriptPath('/yangi/')).toEqual({ script: 'yangi', path: '/', isPage: true });
  expect(parseScriptPath('/kirill')).toEqual({ script: 'cyrl', path: '/', isPage: true });
  expect(parseScriptPath('/blog')).toEqual({ script: 'latn', path: '/blog', isPage: true });
  expect(parseScriptPath('/kirillcha')).toEqual({ script: 'latn', path: '/kirillcha', isPage: true });
  expect(parseScriptPath('/')).toEqual({ script: 'latn', path: '/', isPage: true });
});

test('does not treat admin, api or asset paths as pages', () => {
  expect(parseScriptPath('/admin').isPage).toBe(false);
  expect(parseScriptPath('/admin/posts').isPage).toBe(false);
  expect(parseScriptPath('/kirill/admin').isPage).toBe(false);
  expect(parseScriptPath('/kirill/api/posts').isPage).toBe(false);
  expect(parseScriptPath('/api/posts').isPage).toBe(false);
  expect(parseScriptPath('/assets/index-abc.js').isPage).toBe(false);
  expect(parseScriptPath('/favicon.svg').isPage).toBe(false);
});

test('dev-server internals are not pages', () => {
  expect(parseScriptPath('/@vite/client').isPage).toBe(false);
  expect(parseScriptPath('/@react-refresh').isPage).toBe(false);
  expect(parseScriptPath('/src/main.tsx').isPage).toBe(false);
  expect(parseScriptPath('/node_modules/.vite/deps/react').isPage).toBe(false);
});

test('builds paths', () => {
  expect(buildScriptPath('cyrl', '/')).toBe('/kirill/');
  expect(buildScriptPath('latn', '/')).toBe('/');
  expect(buildScriptPath('latn', '/blog/x')).toBe('/blog/x');
  expect(buildScriptPath('yangi', '/contact')).toBe('/yangi/contact');
});

test('canonicalPath', () => {
  expect(canonicalPath('/blog/Marketing-Nima/?utm_source=tg#faq')).toBe('/blog/marketing-nima');
  expect(canonicalPath('/')).toBe('/');
  expect(canonicalPath('/blog/')).toBe('/blog');
  expect(canonicalPath('')).toBe('/');
});
