import { expect, test } from 'vitest';
import { getTranslitConfig, indexNewLatin } from './config';
import { DEFAULT_TRANSLIT_CONFIG } from './defaults';
import { toCyrillic } from './core';

test('defaults when settings have no alphabets', () => {
  expect(getTranslitConfig({})).toBe(DEFAULT_TRANSLIT_CONFIG);
  expect(indexNewLatin({})).toBe(true);
});

test('admin lists replace defaults and change the version', () => {
  const cfg = getTranslitConfig({ alphabets: { exceptions: { kontent: 'контент' }, protectedWords: ['Foo'], indexNewLatin: false } });
  expect(cfg.version).not.toBe(DEFAULT_TRANSLIT_CONFIG.version);
  expect(cfg.exceptions).toEqual({ kontent: 'контент' });
  expect(toCyrillic('Foo sentabr', cfg)).toBe('Foo сентабр');
  expect(indexNewLatin({ alphabets: { exceptions: {}, protectedWords: [], indexNewLatin: false } })).toBe(false);
});

test('empty admin lists fall back to defaults', () => {
  const cfg = getTranslitConfig({ alphabets: { exceptions: {}, protectedWords: [], indexNewLatin: true } });
  expect(cfg.version).toBe(DEFAULT_TRANSLIT_CONFIG.version);
});
