import { test } from 'node:test'
import assert from 'node:assert/strict'
import { switcherLinks } from '../src/lib/switcher'

test('switcherLinks: same page in every alphabet, from a kirill post', () => {
  const links = switcherLinks('cyrl', '/kirill/marketing-nima/')
  assert.deepEqual(
    links.map((l) => l.href),
    ['/marketing-nima/', '/kirill/marketing-nima/', '/yangi/marketing-nima/'],
  )
  assert.deepEqual(
    links.map((l) => l.label),
    ["O'zbek", 'Ўзбек', 'Özbek'],
  )
  assert.deepEqual(
    links.map((l) => l.script),
    ['latn', 'cyrl', 'yangi'],
  )
  assert.deepEqual(
    links.map((l) => l.active),
    [false, true, false],
  )
})

test('switcherLinks: home pages and a latin page', () => {
  assert.deepEqual(
    switcherLinks('latn', '/').map((l) => l.href),
    ['/', '/kirill/', '/yangi/'],
  )
  assert.deepEqual(
    switcherLinks('yangi', '/yangi/').map((l) => l.href),
    ['/', '/kirill/', '/yangi/'],
  )
  assert.deepEqual(
    switcherLinks('yangi', '/yangi').map((l) => l.href),
    ['/', '/kirill/', '/yangi/'],
  )
  assert.deepEqual(
    switcherLinks('latn', '/blog/page/2/').map((l) => l.href),
    ['/blog/page/2/', '/kirill/blog/page/2/', '/yangi/blog/page/2/'],
  )
  assert.deepEqual(
    switcherLinks('latn', '/blog/').map((l) => l.active),
    [true, false, false],
  )
})

test('switcherLinks: query strings are dropped except q on the search page', () => {
  assert.deepEqual(
    switcherLinks('cyrl', '/kirill/blog/', '?utm_source=x').map((l) => l.href),
    ['/blog/', '/kirill/blog/', '/yangi/blog/'],
  )
  assert.deepEqual(
    switcherLinks('cyrl', '/kirill/search/', '?q=shahar%20bog&page=2').map((l) => l.href),
    ['/search/?q=shahar%20bog', '/kirill/search/?q=shahar%20bog', '/yangi/search/?q=shahar%20bog'],
  )
  assert.deepEqual(
    switcherLinks('latn', '/search/', '').map((l) => l.href),
    ['/search/', '/kirill/search/', '/yangi/search/'],
  )
})
