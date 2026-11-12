import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  SCRIPTS, SCRIPT_PREFIX, HTML_LANG, SCRIPT_LABEL, isScript, withScript, stripScript, alternatePaths,
} from '../src/lib/script'
import { DEFAULT_SETTINGS } from '../src/lib/settings-defaults'

const SITE = 'https://www.jurabek.blog'

test('constants', () => {
  assert.deepEqual([...SCRIPTS], ['latn', 'cyrl', 'yangi'])
  assert.deepEqual(SCRIPT_PREFIX, { latn: '', cyrl: '/kirill', yangi: '/yangi' })
  assert.deepEqual(HTML_LANG, { latn: 'uz-Latn', cyrl: 'uz-Cyrl', yangi: 'uz-Latn' })
  assert.deepEqual(SCRIPT_LABEL, { latn: "O'zbek", cyrl: 'Ўзбек', yangi: 'Özbek' })
  assert.equal(isScript('cyrl'), true)
  assert.equal(isScript('xx'), false)
  assert.equal(isScript(undefined), false)
})

test('withScript', () => {
  assert.equal(withScript('cyrl', '/'), '/kirill/')
  assert.equal(withScript('yangi', '/'), '/yangi/')
  assert.equal(withScript('cyrl', '/blog/page/2/'), '/kirill/blog/page/2/')
  assert.equal(withScript('yangi', 'https://www.jurabek.blog/marketing-nima/', SITE), '/yangi/marketing-nima/')
  assert.equal(withScript('cyrl', 'https://www.jurabek.blog', SITE), '/kirill/')
  assert.equal(withScript('cyrl', 'https://google.com/'), 'https://google.com/')
  assert.equal(withScript('cyrl', 'https://google.com/', SITE), 'https://google.com/')
  assert.equal(withScript('cyrl', '//cdn.example.com/x/'), '//cdn.example.com/x/')
  for (const h of ['#faq', 'mailto:a@b.c', 'tel:+998901234567', '/admin/', '/api/x/', '/uploads/x.jpg',
    '/wp-content/a/', '/og/?t=1', '/fonts/a/', '/images/a/', '/favicon.svg', '/sitemap.xml'])
    assert.equal(withScript('cyrl', h), h)
  assert.equal(withScript('latn', '/blog/'), '/blog/')
  assert.equal(withScript('cyrl', '/kirill/blog/'), '/kirill/blog/')
  assert.equal(withScript('cyrl', '/yangi/blog/'), '/yangi/blog/')
  assert.equal(withScript('cyrl', '/kirill'), '/kirill')
  assert.equal(withScript('cyrl', '/search/?q=sh'), '/kirill/search/?q=sh')
  assert.equal(withScript('yangi', '/blog/#faq'), '/yangi/blog/#faq')
  assert.equal(withScript('cyrl', '/adminka/'), '/kirill/adminka/')
  assert.equal(withScript('cyrl', '/kirillcha/'), '/kirill/kirillcha/')
})

test('withScript prefixes /feed/ for variant scripts', () => {
  assert.equal(withScript('cyrl', '/feed/'), '/kirill/feed/')
  assert.equal(withScript('yangi', '/feed/'), '/yangi/feed/')
  assert.equal(withScript('latn', '/feed/'), '/feed/')
})

test('stripScript', () => {
  assert.deepEqual(stripScript('/kirill/blog/'), { script: 'cyrl', path: '/blog/' })
  assert.deepEqual(stripScript('/yangi/'), { script: 'yangi', path: '/' })
  assert.deepEqual(stripScript('/kirill'), { script: 'cyrl', path: '/' })
  assert.deepEqual(stripScript('/kirillcha/'), { script: 'latn', path: '/kirillcha/' })
  assert.deepEqual(stripScript('/blog/'), { script: 'latn', path: '/blog/' })
})

test('alternatePaths', () => {
  assert.deepEqual(alternatePaths('/blog/page/2/'), {
    latn: '/blog/page/2/', cyrl: '/kirill/blog/page/2/', yangi: '/yangi/blog/page/2/',
  })
  assert.deepEqual(alternatePaths('/'), { latn: '/', cyrl: '/kirill/', yangi: '/yangi/' })
})

test('alphabets settings defaults', () => {
  assert.deepEqual(DEFAULT_SETTINGS.alphabets, { exceptions: {}, protectedWords: [], indexNewLatin: true })
})
