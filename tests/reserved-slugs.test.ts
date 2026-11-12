import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isReservedSlug, slugCandidates } from '../src/lib/content/reserved-slugs'

test('isReservedSlug: alphabet prefixes and app paths are reserved', () => {
  for (const s of ['kirill', 'yangi', 'blog', 'category', 'tag', 'search', 'feed', 'admin', 'api', 'og', 'draft-preview', 'page']) {
    assert.equal(isReservedSlug(s), true, s)
  }
  for (const s of ['kirill-2', 'yangi-yil', 'kirill-alifbosi', 'marketing', '']) {
    assert.equal(isReservedSlug(s), false, s)
  }
})

test('slugCandidates: a reserved slug is never offered, suffixes start at -2', () => {
  const take = (base: string, n: number) => {
    const out: string[] = []
    for (const s of slugCandidates(base)) {
      out.push(s)
      if (out.length === n) break
    }
    return out
  }
  assert.deepEqual(take('kirill', 3), ['kirill-2', 'kirill-3', 'kirill-4'])
  assert.deepEqual(take('yangi', 1), ['yangi-2'])
  assert.deepEqual(take('marketing', 3), ['marketing', 'marketing-2', 'marketing-3'])
})
