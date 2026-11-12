import { test } from 'node:test'
import assert from 'node:assert/strict'
import { csvField, csvRow, htmlToText, pickSentences, splitSentences } from '../src/lib/golden-set'

test('splitSentences: splits on . ! ? and drops sentences under 4 words', () => {
  const s = splitSentences("Bugun havo juda yaxshi. Ha! Biz maktabga bordik, keyin uyga qaytdik? Yo'q.")
  assert.deepEqual(s, ['Bugun havo juda yaxshi.', 'Biz maktabga bordik, keyin uyga qaytdik?'])
})

test('splitSentences: collapses whitespace and does not split on decimals', () => {
  const s = splitSentences('Narx   3.5 million so\'m bo\'ladi\n\nva yana ko\'p.')
  assert.deepEqual(s, ["Narx 3.5 million so'm bo'ladi va yana ko'p."])
})

test('htmlToText: strips tags, scripts and decodes entities', () => {
  assert.equal(htmlToText('<p>Salom&nbsp;<b>dunyo</b> &amp; do\'stlar</p><script>x()</script><p>Yana</p>'), "Salom dunyo & do'stlar Yana")
})

test('csvField: quotes commas, quotes, newlines; doubles quotes', () => {
  assert.equal(csvField('abc'), 'abc')
  assert.equal(csvField('a,b'), '"a,b"')
  assert.equal(csvField('say "hi"'), '"say ""hi"""')
  assert.equal(csvField('a\nb'), '"a\nb"')
})

test('csvRow: joins with commas and CRLF-free', () => {
  assert.equal(csvRow(['x', 'a,b', 'c']), 'x,"a,b",c')
})

test('pickSentences: round-robin across posts, deterministic, respects count', () => {
  const posts = [
    { slug: 'a', sentences: ['a1', 'a2', 'a3'] },
    { slug: 'b', sentences: ['b1'] },
    { slug: 'c', sentences: ['c1', 'c2'] },
  ]
  assert.deepEqual(pickSentences(posts, 5), [
    { slug: 'a', text: 'a1' }, { slug: 'b', text: 'b1' }, { slug: 'c', text: 'c1' },
    { slug: 'a', text: 'a2' }, { slug: 'c', text: 'c2' },
  ])
  assert.equal(pickSentences(posts, 100).length, 6)
  assert.deepEqual(pickSentences(posts, 5), pickSentences(posts, 5))
})

test('htmlToText: block boundaries do not glue words together', () => {
  assert.equal(htmlToText('<p>Birinchi gap.</p><p>Ikkinchi gap.</p><ul><li>bir</li><li>ikki</li></ul>a<br>b'), 'Birinchi gap. Ikkinchi gap. bir ikki a b')
})
