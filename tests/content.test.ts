import { test } from 'node:test'
import assert from 'node:assert/strict'
import { countWords, excerptFromHtml, slugify, stripTags, wordCountFromHtml } from '../src/lib/content/text'
import { renderContent, convertCopyBoxShortcodes, normalizeRenderedCopyBoxes } from '../src/lib/content/render'
import { sanitizeContent, sanitizePlain } from '../src/lib/content/sanitize'

test('slugify follows WordPress sanitize_title for Uzbek titles', () => {
  assert.equal(slugify('Marketing o‘zi nima va biznesga nima uchun kerak?'), 'marketing-ozi-nima-va-biznesga-nima-uchun-kerak')
  assert.equal(slugify('An’anaviy marketing & digital'), 'ananaviy-marketing-digital')
  assert.equal(slugify('Маркетинг нима?'), 'marketing-nima')
  assert.equal(slugify('  --Hello   World--  '), 'hello-world')
})

test('word count is unicode aware', () => {
  assert.equal(countWords("Ko'pchilik marketingni o‘ylaydi, 2026-yil!"), 4)
  assert.equal(wordCountFromHtml('<p>Bir <b>ikki</b></p><p>uch [jb_copy_box]to‘rt[/jb_copy_box]</p>'), 4)
})

test('excerpt is 26 words with an ellipsis', () => {
  const html = '<p>' + Array.from({ length: 40 }, (_, i) => `so'z${i}`).join(' ') + '</p>'
  const ex = excerptFromHtml(html)
  assert.ok(ex.endsWith('…'))
  assert.equal(ex.replace('…', '').split(' ').length, 26)
})

test('stripTags removes scripts and decodes entities', () => {
  assert.equal(stripTags('<p>A &amp; B</p><script>alert(1)</script><p>C&#8217;d</p>'), 'A & B C’d')
})

test('sanitizer drops dangerous markup but keeps formatting', () => {
  const out = sanitizeContent('<h1 onclick="x()">T</h1><p style="color:red;text-align:center">Hi <a href="javascript:alert(1)">x</a> <a href="https://x.com" target="_blank">y</a></p><script>bad()</script><iframe src="https://evil.com"></iframe><iframe src="https://www.youtube.com/embed/abc"></iframe><p>&nbsp;</p>')
  assert.ok(out.startsWith('<h2>T</h2>'), out)
  assert.ok(!out.includes('script'))
  assert.ok(!out.includes('javascript:'))
  assert.ok(!out.includes('evil.com'))
  assert.ok(out.includes('youtube.com/embed/abc'))
  assert.ok(out.includes('rel="noopener noreferrer"'))
  assert.ok(out.includes('text-align:center'))
  assert.ok(!out.includes('color:red'))
  assert.ok(!out.includes('<p>&nbsp;</p>') && !out.includes('<p> </p>'))
})

test('sanitizePlain keeps characters as text', () => {
  assert.equal(sanitizePlain('SMM &amp; <b>reklama</b> "x"'), 'SMM & reklama "x"')
})

test('copy box shortcode and theme markup round-trip to editor format', () => {
  const sc = convertCopyBoxShortcodes('<p>[jb_copy_box title="AI prompt"]Birinchi\n\nIkkinchi[/jb_copy_box]</p>')
  assert.equal(sc, '<aside class="jb-copy-box" data-title="AI prompt"><p>Birinchi</p><p>Ikkinchi</p></aside>')
  const theme = '<aside class="jb-copy-box"><div class="jb-copy-box__head"><strong>Maslahat</strong><button type="button" class="jb-copy-button">Nusxalash</button></div><div class="jb-copy-box__content"><p>Matn</p></div><p class="jb-copy-status" role="status" aria-live="polite"></p></aside>'
  assert.equal(normalizeRenderedCopyBoxes(theme), '<aside class="jb-copy-box" data-title="Maslahat"><p>Matn</p></aside>')
})

test('renderContent adds heading ids, TOC data, copy buttons, responsive images and table wrappers', () => {
  const { html, headings } = renderContent(
    '<h2>Marketing nima?</h2><p>a</p><h3>Vazifalar</h3><h2>Marketing nima?</h2><p>[jb_article_sections]</p><aside class="jb-copy-box" data-title="Prompt"><p>x</p></aside><img src="/uploads/a.jpg" alt="A"><table><tr><td>1</td></tr></table><div data-youtube-video><iframe src="https://www.youtube-nocookie.com/embed/abc"></iframe></div>',
    { media: new Map([['/uploads/a.jpg', { width: 900, height: 600, alt: 'A' }]]) },
  )
  assert.deepEqual(headings.map((h) => [h.id, h.level]), [['marketing-nima', 2], ['vazifalar', 3], ['marketing-nima-2', 2]])
  assert.ok(html.includes('<h2 id="marketing-nima">'))
  assert.ok(html.includes('class="jb-toc jb-toc--card"'), 'inline TOC rendered')
  assert.ok(html.includes('jb-copy-button'))
  assert.ok(html.includes('width="900" height="600"'))
  assert.ok(html.includes('/_next/image?url=%2Fuploads%2Fa.jpg&w=828&q=75 828w'))
  assert.ok(!html.includes('w=1080'), 'no upscaled srcset widths')
  assert.ok(html.includes('loading="lazy"'))
  assert.ok(html.includes('<div class="jb-table-wrap"><table>'))
  assert.ok(html.includes('<div class="jb-embed"><iframe'))
})

// ---- Final fix wave: alphabet versions ----
import { DEFAULT_TRANSLIT_CONFIG } from '../src/lib/translit/defaults'
import { transliterateHtml } from '../src/lib/translit/html'

test('renderContent on variants: default/custom copy-box titles, fallback TOC title and media alt follow the alphabet', () => {
  const cfg = DEFAULT_TRANSLIT_CONFIG
  const src = '<h2>Birinchi</h2><h2>Ikkinchi</h2><p>[jb_article_sections]</p><aside class="jb-copy-box"><p>x</p></aside>' +
    '<aside class="jb-copy-box" data-title="Shahar"><p>y</p></aside><img src="/uploads/a.jpg">'
  const media = new Map([['/uploads/a.jpg', { width: 900, height: 600, alt: 'Choy rasmi' }]])
  const cyr = renderContent(src, { media, script: 'cyrl', cfg }).html
  assert.ok(cyr.includes('<strong>Маслаҳат</strong>'), cyr)
  assert.ok(cyr.includes('<strong>Шаҳар</strong>'), cyr)
  assert.ok(cyr.includes('<p class="jb-toc__title">Мундарижа</p>'), cyr)
  assert.ok(cyr.includes('aria-label="Мундарижа"'), cyr)
  assert.ok(cyr.includes('alt="Чой расми"'), cyr)
  const yangi = renderContent(src, { media, script: 'yangi', cfg }).html
  assert.ok(yangi.includes('<strong>Şahar</strong>'), yangi)
  assert.ok(yangi.includes('alt="Çoy rasmi"'), yangi)
  // Latin output is unchanged.
  const latn = renderContent(src, { media }).html
  assert.equal(renderContent(src, { media, script: 'latn', cfg }).html, latn)
  assert.ok(latn.includes('<strong>Maslahat</strong>') && latn.includes('<strong>Shahar</strong>'))
  assert.ok(latn.includes('<p class="jb-toc__title">Mundarija</p>') && latn.includes('alt="Choy rasmi"'))
})

test('Cyrillic page: shortcodes survive transliteration and render (transliterate → render)', () => {
  const cfg = DEFAULT_TRANSLIT_CONFIG
  const raw = '<h2>Birinchi</h2><h2>Ikkinchi</h2><p>[jb_article_sections]</p><p>[jb_copy_box title="Prompt"]Shahar haqida[/jb_copy_box]</p>'
  const { html } = renderContent(transliterateHtml(raw, 'cyrl', cfg), { script: 'cyrl', cfg })
  assert.ok(html.includes('class="jb-toc jb-toc--card"'), html)
  assert.ok(html.includes('<strong>Промпт</strong>'), html)
  assert.ok(html.includes('<div class="jb-copy-box__content"><p>Шаҳар ҳақида</p></div>'), html)
  assert.ok(!html.includes('[') && !html.includes('жб_'), html)
})

test('/yangi/ heading ids equal the Latin ids', () => {
  const cfg = DEFAULT_TRANSLIT_CONFIG
  const latn = renderContent('<h2>Shahar va choy</h2><h2>O‘zbek tili: g‘alaba</h2><h3>Is\'hoq va ma\'no</h3>')
  const yangiSrc = transliterateHtml('<h2>Shahar va choy</h2><h2>O‘zbek tili: g‘alaba</h2><h3>Is\'hoq va ma\'no</h3>', 'yangi', cfg)
  const yangi = renderContent(yangiSrc, { script: 'yangi', cfg })
  assert.deepEqual(yangi.headings.map((h) => h.id), latn.headings.map((h) => h.id))
  assert.equal(renderContent('<h2>Şahar va çoy</h2>', { script: 'yangi', cfg }).headings[0].id, 'shahar-va-choy')
  assert.equal(renderContent('<h2>ŞAHAR ÇOY ÖZ ĞOZ</h2>', { script: 'yangi', cfg }).headings[0].id, 'shahar-choy-oz-goz')
})

test('sanitizer keeps lang / translate attributes and the notranslate class (opt-out of transliteration)', () => {
  const out = sanitizeContent('<p lang="en" translate="no">Hi</p><blockquote class="notranslate evil">x</blockquote><em lang="en-US">y</em><li class="other">z</li><aside class="jb-copy-box notranslate" data-title="T">w</aside>')
  assert.ok(out.includes('<p lang="en" translate="no">Hi</p>'), out)
  assert.ok(out.includes('<blockquote class="notranslate">x</blockquote>'), out)
  assert.ok(out.includes('<em lang="en-US">y</em>'), out)
  assert.ok(out.includes('<li>z</li>'), out)
  assert.ok(out.includes('<aside class="jb-copy-box notranslate" data-title="T">'), out)
})
