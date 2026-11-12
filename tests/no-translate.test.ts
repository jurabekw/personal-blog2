import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NoTranslate } from '../src/components/admin/no-translate'

test('B5: opt-out attributes are not kept when a block is split (Enter)', () => {
  const groups = (NoTranslate.config as { addGlobalAttributes?: () => Array<{ attributes: Record<string, { keepOnSplit?: boolean }> }> }).addGlobalAttributes!.call({} as never)
  const attrs = groups[0].attributes
  for (const k of ['lang', 'translate', 'notranslate']) assert.equal(attrs[k].keepOnSplit, false, k)
})
