import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * An element id becomes a window property (HTML named access). If a <Script id> equals a global
 * an analytics snippet defines with `w[name] = w[name] || function…`, the stub keeps the element
 * and the first call throws "… is not a function" (this broke Yandex Metrika with id="ym").
 */
const SNIPPET_GLOBALS = ['ym', 'gtag', 'dataLayer', 'google_tag_manager']

test('SiteChrome: analytics <Script> ids never shadow the globals their snippets use', () => {
  const src = readFileSync(join(__dirname, '../src/components/site/SiteChrome.tsx'), 'utf8')
  const ids = [...src.matchAll(/<Script\s[^>]*\bid="([^"]+)"/g)].map((m) => m[1])
  assert.ok(ids.length >= 3, `expected the ga4/gtm/metrika scripts, found ${ids.join(', ')}`)
  for (const id of ids) assert.ok(!SNIPPET_GLOBALS.includes(id), `<Script id="${id}"> shadows window.${id}`)
})
