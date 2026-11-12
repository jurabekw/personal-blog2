import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MAX_EXCEPTIONS, MAX_PROTECTED_WORDS, parseAlphabetSettings } from '../src/lib/alphabet-settings'

function form(rows: [string, string][], words = '', index: boolean | null = true): FormData {
  const fd = new FormData()
  for (const [k, v] of rows) {
    fd.append('exceptionKey', k)
    fd.append('exceptionValue', v)
  }
  fd.set('protectedWords', words)
  if (index) fd.set('indexNewLatin', 'on')
  return fd
}

test('parseAlphabetSettings: valid rows become a lowercase map', () => {
  const r = parseAlphabetSettings(form([['  Kontent ', ' КОНТЕНТ '], ['sentabr', 'сентябрь']]))
  assert.equal(r.ok, true)
  if (!r.ok) return
  assert.deepEqual(r.value.exceptions, { kontent: 'контент', sentabr: 'сентябрь' })
})

test('parseAlphabetSettings: keys are lowercased and apostrophes normalised', () => {
  const r = parseAlphabetSettings(form([['Oʻzbekiston', 'ўзбекистон'], ['g‘oya', 'ғоя'], ['maʼno', 'маъно'], ['san`at', 'санъат'], ['to’g’ri', 'тўғри']]))
  assert.equal(r.ok, true)
  if (!r.ok) return
  assert.deepEqual(Object.keys(r.value.exceptions), ["o'zbekiston", "g'oya", "ma'no", "san'at", "to'g'ri"])
})

test('parseAlphabetSettings: fully empty rows are dropped', () => {
  const r = parseAlphabetSettings(form([['', ''], ['  ', ' '], ['aksiya', 'акция']]))
  assert.equal(r.ok, true)
  if (!r.ok) return
  assert.deepEqual(r.value.exceptions, { aksiya: 'акция' })
})

test('parseAlphabetSettings: blank key or blank value is rejected with the row number', () => {
  const blankValue = parseAlphabetSettings(form([['aksiya', 'акция'], ['kontent', '  ']]))
  assert.equal(blankValue.ok, false)
  if (blankValue.ok) return
  assert.equal(blankValue.field, 'exceptions')
  assert.equal(blankValue.row, 2)

  const blankKey = parseAlphabetSettings(form([[' ', 'акция']]))
  assert.equal(blankKey.ok, false)
  if (blankKey.ok) return
  assert.equal(blankKey.row, 1)
})

test('parseAlphabetSettings: values must be Cyrillic letters only', () => {
  for (const bad of ['kontent', 'конт3нт', 'кон тент', 'кон-тент', '<b>акция</b>', 'акция!']) {
    const r = parseAlphabetSettings(form([['aksiya', bad]]))
    assert.equal(r.ok, false, `${bad} should be rejected`)
  }
  const r = parseAlphabetSettings(form([['xo\'ja', 'ХЎЖА'], ['qog\'oz', 'қоғоз'], ['hovli', 'ҳовли'], ['yolka', 'ёлка'], ['sotsial', 'социаль'], ['ob\'ekt', 'объект']]))
  assert.equal(r.ok, true)
  if (!r.ok) return
  assert.equal(r.value.exceptions["xo'ja"], 'хўжа')
})

test('parseAlphabetSettings: keys must be one Latin word', () => {
  for (const bad of ['two words', 'контент', 'a<b']) {
    const r = parseAlphabetSettings(form([[bad, 'акция']]))
    assert.equal(r.ok, false, `${bad} should be rejected`)
  }
})

test('parseAlphabetSettings: duplicate keys after normalisation are rejected', () => {
  const r = parseAlphabetSettings(form([["o'zbek", 'ўзбек'], ['Oʻzbek', 'ўзбек']]))
  assert.equal(r.ok, false)
  if (r.ok) return
  assert.equal(r.row, 2)
})

test('parseAlphabetSettings: protected words are split per line, trimmed, deduped, empty dropped', () => {
  const r = parseAlphabetSettings(form([], '  Google \r\n\nSEO\n  \nChatGPT\nseo\nGoogle\n'))
  assert.equal(r.ok, true)
  if (!r.ok) return
  assert.deepEqual(r.value.protectedWords, ['Google', 'SEO', 'ChatGPT'])
})

test('parseAlphabetSettings: indexNewLatin checkbox → boolean', () => {
  const on = parseAlphabetSettings(form([], '', true))
  const off = parseAlphabetSettings(form([], '', false))
  assert.equal(on.ok && on.value.indexNewLatin, true)
  assert.equal(off.ok, true)
  assert.equal(off.ok && off.value.indexNewLatin, false)
})

test('parseAlphabetSettings: an empty form stores empty lists (= built-in defaults)', () => {
  const r = parseAlphabetSettings(new FormData())
  assert.deepEqual(r, { ok: true, value: { exceptions: {}, protectedWords: [], indexNewLatin: false } })
})

test('parseAlphabetSettings: list size limits', () => {
  const rows: [string, string][] = Array.from({ length: MAX_EXCEPTIONS + 1 }, (_, i) => [`soz${i}`, 'сўз'])
  assert.equal(parseAlphabetSettings(form(rows)).ok, false)
  assert.equal(parseAlphabetSettings(form(rows.slice(0, MAX_EXCEPTIONS))).ok, true)
  const words = Array.from({ length: MAX_PROTECTED_WORDS + 1 }, (_, i) => `Word${i}`)
  assert.equal(parseAlphabetSettings(form([], words.join('\n'))).ok, false)
  assert.equal(parseAlphabetSettings(form([], words.slice(0, MAX_PROTECTED_WORDS).join('\n'))).ok, true)
})

test('parseAlphabetSettings: the clean function runs on every key, value and word', () => {
  const seen: string[] = []
  const clean = (s: string) => {
    seen.push(s)
    return s.replace(/<[^>]*>/g, '')
  }
  const r = parseAlphabetSettings(form([['<i>aksiya</i>', '<b>акция</b>']], '<script>x</script>Google'), clean)
  assert.equal(r.ok, true)
  if (!r.ok) return
  assert.deepEqual(r.value.exceptions, { aksiya: 'акция' })
  assert.deepEqual(r.value.protectedWords, ['xGoogle'])
  assert.ok(seen.includes('<i>aksiya</i>') && seen.includes('<b>акция</b>'))
})

// ---- Final fix wave ----
import { DEFAULT_EXCEPTIONS, DEFAULT_PROTECTED_WORDS } from '../src/lib/translit/defaults'

test('parseAlphabetSettings: lists equal to the built-in defaults are stored empty (later built-in changes still apply)', () => {
  const rows = Object.entries(DEFAULT_EXCEPTIONS).reverse() as [string, string][]
  const r = parseAlphabetSettings(form(rows, DEFAULT_PROTECTED_WORDS.slice().reverse().join('\n')))
  assert.deepEqual(r, { ok: true, value: { exceptions: {}, protectedWords: [], indexNewLatin: true } })
  // Typed differently (case, apostrophes) but equal after normalisation → still the defaults.
  const upper = rows.map(([k, v]) => [k.toUpperCase(), v.toUpperCase()] as [string, string])
  const r2 = parseAlphabetSettings(form(upper, DEFAULT_PROTECTED_WORDS.join('\n')))
  assert.deepEqual(r2.ok && r2.value.exceptions, {})
  assert.deepEqual(r2.ok && r2.value.protectedWords, [])
})

test('parseAlphabetSettings: a list that differs from the defaults is stored as typed; the other may still be empty', () => {
  const rows = [...Object.entries(DEFAULT_EXCEPTIONS), ['kontent', 'контент']] as [string, string][]
  const r = parseAlphabetSettings(form(rows, DEFAULT_PROTECTED_WORDS.join('\n')))
  assert.equal(r.ok, true)
  if (!r.ok) return
  assert.equal(r.value.exceptions.kontent, 'контент')
  assert.equal(Object.keys(r.value.exceptions).length, Object.keys(DEFAULT_EXCEPTIONS).length + 1)
  assert.deepEqual(r.value.protectedWords, [])
  const words = parseAlphabetSettings(form([], [...DEFAULT_PROTECTED_WORDS.slice(1)].join('\n')))
  assert.equal(words.ok && words.value.protectedWords.length, DEFAULT_PROTECTED_WORDS.length - 1)
})

test('parseAlphabetSettings: protected words must be single tokens', () => {
  for (const bad of ['Google Ads', 'Search\tConsole']) {
    const r = parseAlphabetSettings(form([], `SEO\n${bad}`))
    assert.equal(r.ok, false, `${bad} should be rejected`)
    if (r.ok) continue
    assert.equal(r.field, 'protectedWords')
    assert.equal(r.row, 2)
    assert.match(r.error, /bitta soʻz/)
  }
  const ok = parseAlphabetSettings(form([], "Next.js\nChatGPT\nO'zbekiston\nB2B"))
  assert.equal(ok.ok, true)
})
