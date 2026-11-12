import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toCyrillic, toNewLatin, transliterateText } from '../src/lib/translit/core'
import { DEFAULT_TRANSLIT_CONFIG } from '../src/lib/translit/defaults'
import { normalizeForSearch } from '../src/lib/translit/search'
import { getTranslitConfig, indexNewLatin } from '../src/lib/translit/config'
import { transliterateHtml } from '../src/lib/translit/html'

const cfg = DEFAULT_TRANSLIT_CONFIG

// toCyrillic
test('cyrillic basic letters and digraphs', () => {
  assert.equal(toCyrillic("O'zbekiston", cfg), 'Ўзбекистон');
  assert.equal(toCyrillic('shahar choy', cfg), 'шаҳар чой');
  assert.equal(toCyrillic("g'alaba", cfg), 'ғалаба');
  assert.equal(toCyrillic('marketing', cfg), 'маркетинг');
});

test('cyrillic y-rules run after oʻ/gʻ', () => {
  assert.equal(toCyrillic("yo'l", cfg), 'йўл');
  assert.equal(toCyrillic('yangi yetti yoz yulduz', cfg), 'янги етти ёз юлдуз');
});

test('cyrillic e at word start or after vowel becomes э', () => {
  assert.equal(toCyrillic('ekran kelajak', cfg), 'экран келажак');
  assert.equal(toCyrillic('Ekran', cfg), 'Экран');
});

test('cyrillic tutuq', () => {
  assert.equal(toCyrillic("a'zo", cfg), 'аъзо');
  assert.equal(toCyrillic("Is'hoq", cfg), 'Исҳоқ');
});

test('cyrillic preserves ALL CAPS Uzbek words', () => {
  assert.equal(toCyrillic("O'ZBEK SHAHAR", cfg), 'ЎЗБЕК ШАҲАР');
});

test('exceptions: exact word and longest prefix', () => {
  const c = { ...cfg, exceptions: { aksiya: 'акция', sentabr: 'сентябрь' } };
  assert.equal(toCyrillic('aksiya', c), 'акция');
  assert.equal(toCyrillic('aksiyalar', c), 'акциялар');
  assert.equal(toCyrillic('Sentabr', c), 'Сентябрь');
});

test('keeps protected words and acronyms', () => {
  const c = { ...cfg, protectedWords: ['Google', 'Ads', 'ChatGPT', 'Chrome'] };
  assert.equal(toCyrillic('Google Ads kampaniyasi', c), 'Google Ads кампанияси');
  assert.equal(toCyrillic('ChatGPT bilan SEO va GA4', c), 'ChatGPT билан SEO ва GA4');
  assert.equal(toCyrillic('Facebook sahifa', cfg), 'Facebook саҳифа');
  assert.equal(toNewLatin('Chrome brauzeri', c), 'Chrome brauzeri');
});

test('punctuation, numbers and spacing untouched', () => {
  assert.equal(toCyrillic('2026-yil, 5 ta (shahar)!', cfg), '2026-йил, 5 та (шаҳар)!');
});

// toNewLatin
test('new latin digraphs and case', () => {
  assert.equal(toNewLatin("O'zbekiston shahri choyxona", cfg), 'Özbekiston şahri çoyxona');
  assert.equal(toNewLatin("G'ALABA Shahar CHOY", cfg), 'ĞALABA Şahar ÇOY');
  assert.equal(toNewLatin('dengiz', cfg), 'dengiz');
});

test('new latin tutuq', () => {
  assert.equal(toNewLatin("Is'hoq", cfg), 'Ishoq');
  assert.equal(toNewLatin("a'zo", cfg), 'aʼzo');
});

test('normalises apostrophe variants', () => {
  for (const s of ['o‘zbek', 'oʻzbek', 'o`zbek', 'o’zbek', "o'zbek"]) {
    assert.equal(toNewLatin(s, cfg), 'özbek');
    assert.equal(toCyrillic(s, cfg), 'ўзбек');
  }
});

test('latn is identity', () => {
  assert.equal(transliterateText("o'zbek", 'latn', cfg), "o'zbek");
  assert.equal(transliterateText("o'zbek", 'cyrl', cfg), 'ўзбек');
  assert.equal(transliterateText("o'zbek", 'yangi', cfg), 'özbek');
});


test('normalizes all alphabets to current latin', () => {
  assert.equal(normalizeForSearch('Маркетинг'), 'marketing');
  assert.equal(normalizeForSearch('şahar Çoy'), 'shahar choy');
  assert.equal(normalizeForSearch('ЎЗБЕК'), "o'zbek");
  assert.equal(normalizeForSearch('o‘zbek'), "o'zbek");
  assert.equal(normalizeForSearch('Ёз юлдуз эшик'), 'yoz yulduz eshik');
  assert.equal(normalizeForSearch('ğalaba Öz'), "g'alaba o'z");
});

test('cyrillic е is ye at word start, e elsewhere', () => {
  assert.equal(normalizeForSearch('етти келажак'), 'yetti kelajak');
});

test('soft and hard signs', () => {
  assert.equal(normalizeForSearch('сентябрь аъзо'), "sentyabr a'zo");
});

test('ц is s after a consonant, ts after a vowel (Uzbek Latin spelling)', () => {
  assert.equal(normalizeForSearch('акция'), 'aksiya');
  assert.equal(normalizeForSearch('лицензия'), 'litsenziya');
});


test('defaults when alphabets settings are missing', () => {
  assert.equal(getTranslitConfig(), DEFAULT_TRANSLIT_CONFIG);
  assert.equal(indexNewLatin(), true);
});

test('admin lists replace defaults and change the version', () => {
  const cfg = getTranslitConfig({ exceptions: { kontent: 'контент' }, protectedWords: ['Foo'], indexNewLatin: false });
  assert.notEqual(cfg.version, DEFAULT_TRANSLIT_CONFIG.version);
  assert.deepEqual(cfg.exceptions, { kontent: 'контент' });
  assert.equal(toCyrillic('Foo sentabr', cfg), 'Foo сентабр');
  assert.equal(indexNewLatin({ exceptions: {}, protectedWords: [], indexNewLatin: false }), false);
});

test('empty admin lists fall back to defaults', () => {
  const cfg = getTranslitConfig({ exceptions: {}, protectedWords: [], indexNewLatin: true });
  assert.equal(cfg.version, DEFAULT_TRANSLIT_CONFIG.version);
});

test('transliterateHtml leaves markup intact', () => {
  const html = '<p class="jb-x">Shahar <a href="/shahar/" title="Choy">choy</a> <img src="/u/sh.jpg" alt="Shahar rasmi"></p>' +
    '<pre><code>shahar</code></pre><p>a &amp; b</p><iframe src="https://youtube.com/embed/sh"></iframe>'
  assert.equal(transliterateHtml(html, 'cyrl', cfg),
    '<p class="jb-x">Шаҳар <a href="/shahar/" title="Чой">чой</a> <img src="/u/sh.jpg" alt="Шаҳар расми"></p>' +
    '<pre><code>shahar</code></pre><p>а &amp; б</p><iframe src="https://youtube.com/embed/sh"></iframe>')
})

test('transliterateHtml latn is identity', () => assert.equal(transliterateHtml('<p>sh</p>', 'latn', cfg), '<p>sh</p>'))

test('transliterateHtml new latin, comments and nested skip tags', () => {
  const html = '<!-- shahar --><p>shahar</p><script>var shahar</script><style>.sh{}</style><pre><b>sh</b> <code>sh</code> sh</pre><p>choy</p>'
  assert.equal(transliterateHtml(html, 'yangi', cfg),
    '<!-- shahar --><p>şahar</p><script>var shahar</script><style>.sh{}</style><pre><b>sh</b> <code>sh</code> sh</pre><p>çoy</p>')
})

test('transliterateHtml handles entities, single-quoted attrs and data-title', () => {
  assert.equal(transliterateHtml("<p>shahar&nbsp;choy &#39;x&#39;</p><img alt='choy' data-alt=\"choy\">", 'cyrl', cfg),
    "<p>шаҳар&nbsp;чой &#39;х&#39;</p><img alt='чой' data-alt=\"choy\">")
})
