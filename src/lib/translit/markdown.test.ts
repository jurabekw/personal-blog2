import { expect, test } from 'vitest';
import { transliterateMarkdown } from './markdown';
import { DEFAULT_TRANSLIT_CONFIG as cfg } from './defaults';

test('leaves code, urls and html attributes untouched', () => {
  const md =
    'Bu `shahar` va [shahar](https://shahar.uz/sh) <a href="/blog/sh">sh</a> https://x.uz/choy\n' +
    '```\nshahar\n```\n' +
    '![shahar rasmi](/img/shahar.png)';
  expect(transliterateMarkdown(md, 'cyrl', cfg)).toBe(
    'Бу `shahar` ва [шаҳар](https://shahar.uz/sh) <a href="/blog/sh">ш</a> https://x.uz/choy\n' +
      '```\nshahar\n```\n' +
      '![шаҳар расми](/img/shahar.png)',
  );
});

test('keeps markdown structure: headings, lists, tables', () => {
  expect(transliterateMarkdown('## Choy\n- shahar\n| a | sh |\n|---|---|', 'yangi', cfg)).toBe(
    '## Çoy\n- şahar\n| a | ş |\n|---|---|',
  );
});

test('latn returns input unchanged', () => {
  expect(transliterateMarkdown('## Choy', 'latn', cfg)).toBe('## Choy');
});
