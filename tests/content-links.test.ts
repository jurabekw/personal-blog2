import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scriptContentLinks } from '../src/lib/content/links'

const SITE = 'https://www.jurabek.blog'

test('latn content is returned unchanged', () => {
  const html = '<p><a href="https://www.jurabek.blog/other-post/">x</a> <a href="/blog/">y</a></p>'
  assert.equal(scriptContentLinks(html, 'latn', SITE), html)
})

test('same-site absolute and root-relative links get the alphabet prefix', () => {
  assert.equal(
    scriptContentLinks('<p><a href="https://www.jurabek.blog/other-post/">x</a></p>', 'cyrl', SITE),
    '<p><a href="/kirill/other-post/">x</a></p>',
  )
  assert.equal(
    scriptContentLinks('<a class="b" href="/category/marketing/" title="t">y</a>', 'yangi', SITE),
    '<a class="b" href="/yangi/category/marketing/" title="t">y</a>',
  )
  assert.equal(
    scriptContentLinks("<a href='https://www.jurabek.blog/'>home</a>", 'cyrl', SITE),
    "<a href='/kirill/'>home</a>",
  )
  assert.equal(
    scriptContentLinks('<a href="/blog/?a=1&amp;b=2#top">y</a>', 'cyrl', SITE),
    '<a href="/kirill/blog/?a=1&amp;b=2#top">y</a>',
  )
})

test('external, anchor, asset, admin and already-prefixed links are left alone', () => {
  for (const href of [
    'https://google.com/',
    'https://www.jurabek.blog.evil.com/x/',
    '#faq',
    'mailto:a@b.c',
    '/uploads/2026/01/file.pdf',
    'https://www.jurabek.blog/uploads/2026/01/a.jpg',
    '/admin/',
    '/kirill/already/',
    '//cdn.example.com/x/',
  ]) {
    const html = `<a href="${href}">x</a>`
    assert.equal(scriptContentLinks(html, 'cyrl', SITE), html, href)
  }
})

test('only <a> hrefs change; img src, link, text and code stay', () => {
  const html =
    '<img src="/images/a.png" alt="/blog/"><p>href="/blog/"</p><abbr href="/x/">a</abbr>' +
    '<area href="/x/"><a\nhref="/blog/">b</a>'
  assert.equal(
    scriptContentLinks(html, 'cyrl', SITE),
    '<img src="/images/a.png" alt="/blog/"><p>href="/blog/"</p><abbr href="/x/">a</abbr>' +
      '<area href="/x/"><a\nhref="/kirill/blog/">b</a>',
  )
})

test('works without a site url (root-relative links only)', () => {
  assert.equal(
    scriptContentLinks('<a href="https://www.jurabek.blog/x/">a</a><a href="/x/">b</a>', 'yangi'),
    '<a href="https://www.jurabek.blog/x/">a</a><a href="/yangi/x/">b</a>',
  )
})
