/**
 * Exports a "golden set" of sentences for reviewing the Cyrillic and new-Latin transliteration.
 *
 *   npm run golden-set -- 300 > golden.csv        (or: npx tsx scripts/golden-set.ts 300 > golden.csv)
 *
 * Needs DATABASE_URL (read from .env / .env.local like scripts/migrate.mjs). Takes sentences (4+ words)
 * round-robin from published posts and pages and writes CSV with the header `post_slug,latn,cyrl,yangi`
 * (UTF-8 with BOM so Excel opens Cyrillic correctly). Transliteration uses the site's own engine with the
 * current Admin → Settings → Alifbolar lists, so fixes made there show up in the next export.
 */
import postgres from 'postgres'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getTranslitConfig, transliterateText, type AlphabetSettings } from '../src/lib/translit'
import { csvRow, htmlToText, pickSentences, splitSentences } from '../src/lib/golden-set'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
for (const file of ['.env', '.env.local']) {
  const full = path.join(root, file)
  if (!fs.existsSync(full)) continue
  for (const line of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m || process.env[m[1]]) continue
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set.')
  process.exit(1)
}
const count = Number(process.argv[2] ?? 300)
if (!Number.isInteger(count) || count < 1) {
  console.error('Usage: golden-set.ts [count=300]')
  process.exit(1)
}

const local = /@(localhost|127\.0\.0\.1)(:|\/)/.test(url) || url.includes('host=/')
const sql = postgres(url, { prepare: false, max: 1, ssl: local || /sslmode=disable/.test(url) ? false : 'require', onnotice: () => {} })

async function main() {
  const [row] = await sql<{ value: Partial<AlphabetSettings> }[]>`select value from settings where key = 'alphabets'`
  const stored = row?.value
  const cfg = getTranslitConfig(stored ? { exceptions: {}, protectedWords: [], indexNewLatin: true, ...stored } : null)

  const rows = await sql<{ slug: string; title: string; content: string }[]>`
    select slug, title, content from posts
    where status = 'publish' and type in ('post', 'page')
    order by published_at desc nulls last, id`
  const posts = rows.map((r) => ({ slug: r.slug, sentences: splitSentences(htmlToText(r.content)) }))
  const picked = pickSentences(posts, count)

  const lines = [csvRow(['post_slug', 'latn', 'cyrl', 'yangi'])]
  for (const { slug, text } of picked) {
    lines.push(csvRow([slug, text, transliterateText(text, 'cyrl', cfg), transliterateText(text, 'yangi', cfg)]))
  }
  process.stdout.write('﻿' + lines.join('\r\n') + '\r\n')
  console.error(`[golden-set] ${picked.length} sentences from ${posts.length} posts`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => sql.end())
