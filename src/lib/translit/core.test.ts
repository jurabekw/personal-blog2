import { describe, expect, test } from 'vitest';
import { toCyrillic, toNewLatin, transliterateText } from './core';
import { DEFAULT_TRANSLIT_CONFIG } from './defaults';

const cfg = DEFAULT_TRANSLIT_CONFIG;

describe('toCyrillic', () => {
  test('cyrillic basic letters and digraphs', () => {
    expect(toCyrillic("O'zbekiston", cfg)).toBe('Ўзбекистон');
    expect(toCyrillic('shahar choy', cfg)).toBe('шаҳар чой');
    expect(toCyrillic("g'alaba", cfg)).toBe('ғалаба');
    expect(toCyrillic('marketing', cfg)).toBe('маркетинг');
  });

  test('cyrillic y-rules run after oʻ/gʻ', () => {
    expect(toCyrillic("yo'l", cfg)).toBe('йўл');
    expect(toCyrillic('yangi yetti yoz yulduz', cfg)).toBe('янги етти ёз юлдуз');
  });

  test('cyrillic e at word start or after vowel becomes э', () => {
    expect(toCyrillic('ekran kelajak', cfg)).toBe('экран келажак');
    expect(toCyrillic('Ekran', cfg)).toBe('Экран');
  });

  test('cyrillic tutuq', () => {
    expect(toCyrillic("a'zo", cfg)).toBe('аъзо');
    expect(toCyrillic("Is'hoq", cfg)).toBe('Исҳоқ');
  });

  test('cyrillic preserves ALL CAPS Uzbek words', () => {
    expect(toCyrillic("O'ZBEK SHAHAR", cfg)).toBe('ЎЗБЕК ШАҲАР');
  });

  test('exceptions: exact word and longest prefix', () => {
    const c = { ...cfg, exceptions: { aksiya: 'акция', sentabr: 'сентябрь' } };
    expect(toCyrillic('aksiya', c)).toBe('акция');
    expect(toCyrillic('aksiyalar', c)).toBe('акциялар');
    expect(toCyrillic('Sentabr', c)).toBe('Сентябрь');
  });

  test('keeps protected words and acronyms', () => {
    const c = { ...cfg, protectedWords: ['Google', 'Ads', 'ChatGPT', 'Chrome'] };
    expect(toCyrillic('Google Ads kampaniyasi', c)).toBe('Google Ads кампанияси');
    expect(toCyrillic('ChatGPT bilan SEO va GA4', c)).toBe('ChatGPT билан SEO ва GA4');
    expect(toCyrillic('Facebook sahifa', cfg)).toBe('Facebook саҳифа');
    expect(toNewLatin('Chrome brauzeri', c)).toBe('Chrome brauzeri');
  });

  test('punctuation, numbers and spacing untouched', () => {
    expect(toCyrillic('2026-yil, 5 ta (shahar)!', cfg)).toBe('2026-йил, 5 та (шаҳар)!');
  });
});

describe('toNewLatin', () => {
  test('new latin digraphs and case', () => {
    expect(toNewLatin("O'zbekiston shahri choyxona", cfg)).toBe('Özbekiston şahri çoyxona');
    expect(toNewLatin("G'ALABA Shahar CHOY", cfg)).toBe('ĞALABA Şahar ÇOY');
    expect(toNewLatin('dengiz', cfg)).toBe('dengiz');
  });

  test('new latin tutuq', () => {
    expect(toNewLatin("Is'hoq", cfg)).toBe('Ishoq');
    expect(toNewLatin("a'zo", cfg)).toBe('aʼzo');
  });
});

test('normalises apostrophe variants', () => {
  for (const s of ['o‘zbek', 'oʻzbek', 'o`zbek', 'o’zbek', "o'zbek"]) {
    expect(toNewLatin(s, cfg)).toBe('özbek');
    expect(toCyrillic(s, cfg)).toBe('ўзбек');
  }
});

test('latn is identity', () => {
  expect(transliterateText("o'zbek", 'latn', cfg)).toBe("o'zbek");
  expect(transliterateText("o'zbek", 'cyrl', cfg)).toBe('ўзбек');
  expect(transliterateText("o'zbek", 'yangi', cfg)).toBe('özbek');
});
