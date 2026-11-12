# Three Alphabets (O'zbek · Ўзбек · Özbek) — Next.js Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve every public page of jurabek.blog in current Latin (root), Cyrillic (`/kirill/`) and 2026 Latin (`/yangi/`). Each version has its own server-rendered HTML and SEO tags, so search engines match pages to the reader's alphabet.

**Architecture:**
- A pure transliteration library (`src/lib/translit/`, ported from the first implementation, plus an HTML-aware converter) runs on the server only.
- Public routes split into three route groups with their own root layout (`(latn)`, `(cyrl)/kirill`, `(yangi)/yangi`). They share view modules (`src/views/`) that take a `script`.
- Data and SEO helpers return localized copies. Metadata gains `alternates.languages`, and sitemaps gain alphabet variants.

**Tech Stack:** Next.js 16 App Router (ISR), React 19, Drizzle/Postgres, TypeScript, `node:test` via tsx (`npm test`).

**Spec:** `docs/superpowers/specs/2026-11-12-three-alphabets-design.md`

**Base branch:** `nextjs-migration` (production). Work branch: `feature/alphabets-next`. Deliver as a PR into `nextjs-migration`. Never push to `nextjs-migration` directly.

## Global Constraints

- Before writing route, layout or metadata code, read the matching guide in `node_modules/next/dist/docs/` (AGENTS.md): this Next.js has breaking changes.
- Script ids: `'latn' | 'cyrl' | 'yangi'`. URL prefixes: `''`, `'/kirill'`, `'/yangi'`. `trailingSlash: true`, so every page URL ends with `/`.
- Site origin: `resolveSiteUrl(settings)` (production: `https://www.jurabek.blog`).
- `<html lang>`: latn `uz-Latn`, cyrl `uz-Cyrl`, yangi `uz-Latn`.
- hreflang group on latn and cyrl pages only: `uz-Latn` → root URL, `uz-Cyrl` → `/kirill/` URL, `x-default` → root URL. Yangi pages print none.
- Yangi pages are `index, follow` unless `settings.alphabets.indexNewLatin === false`.
- Switcher labels: `O'zbek` · `Ўзбек` · `Özbek`. No automatic redirects.
- Existing Latin URLs, redirects (`next.config.ts`, managed redirects) and WordPress legacy handling behave exactly as before.
- Keep `jb-*` class names (AGENTS.md). Server actions start with `requireUser(...)`.

## Review Focus

1. **English brand names inside Uzbek sentences** stay Latin on Cyrillic pages. → Task 1 test `keeps protected words and acronyms`.
2. **HTML content with code blocks, links, images and embeds** (YouTube iframes, tables, copy boxes): only text, `alt` and `title` change; `href`, `src`, `class` and `id` don't. → Task 1 test `transliterateHtml leaves markup intact`.
3. **Internal links on variant pages** (menus, breadcrumbs, cards, pagination, tags, search form, in-content links to `https://www.jurabek.blog/...`) stay inside the alphabet; external, `/admin`, `/uploads` and `/feed` links don't get a prefix. → Task 2 test `withScript`.
4. **Posts with a custom canonical or noindex in Yoast fields:** the variants follow spec §5.2, and the sitemaps match. → Task 6 test `variant of custom-canonical post is noindex`.
5. **Unknown paths, redirects and 404s under `/kirill/` and `/yangi/`** give a 404 page in that alphabet; managed redirects resolve inside the same alphabet. → Task 4 manual check, plus Task 9 preview check.

---

### Task 1: Port the transliteration library and add the HTML converter

**Files:**
- Create: `src/lib/translit/{types,core,defaults,search,config,html,index}.ts`, `tests/translit.test.ts`
- Source to port: branch `feature/three-alphabets`, `src/lib/translit/*` (core, defaults, search, config) and the tests in `core.test.ts`, `search.test.ts`, `config.test.ts`. Convert them to `node:test` + `assert/strict`. Change `config.ts` to read `AllSettings['alphabets']`.

**Interfaces (Produces):**
- `type Script = 'latn' | 'cyrl' | 'yangi'`
- `TranslitConfig`, `DEFAULT_TRANSLIT_CONFIG`, `makeTranslitConfig()`, `toCyrillic()`, `toNewLatin()`, `transliterateText(text, script, cfg)`, `normalizeForSearch()`
- `getTranslitConfig(alphabets?: AlphabetSettings): TranslitConfig`
- `transliterateHtml(html: string, script: Script, cfg: TranslitConfig): string`

- [ ] **Step 1: Port the existing tests** (they fail: module missing). Run `npm test`. Expected: FAIL.
- [ ] **Step 2: Add the HTML tests**
```ts
test('transliterateHtml leaves markup intact', () => {
  const html = '<p class="jb-x">Shahar <a href="/shahar/" title="Choy">choy</a> <img src="/u/sh.jpg" alt="Shahar rasmi"></p>' +
    '<pre><code>shahar</code></pre><p>a &amp; b</p><iframe src="https://youtube.com/embed/sh"></iframe>'
  assert.equal(transliterateHtml(html, 'cyrl', cfg),
    '<p class="jb-x">Шаҳар <a href="/shahar/" title="Чой">чой</a> <img src="/u/sh.jpg" alt="Шаҳар расми"></p>' +
    '<pre><code>shahar</code></pre><p>а &amp; б</p><iframe src="https://youtube.com/embed/sh"></iframe>')
})
test('transliterateHtml latn is identity', () => assert.equal(transliterateHtml('<p>sh</p>', 'latn', cfg), '<p>sh</p>'))
```
- [ ] **Step 3: Copy in the ported files and implement `html.ts`**
  - Tokenise with `/(<!--[\s\S]*?-->|<[^>]+>)/`.
  - Track a skip depth for `code|pre|script|style|kbd|textarea`.
  - Text segments: split out entities `/(&[a-zA-Z#0-9]+;)/` and transliterate the rest.
  - In tags, rewrite only `alt="…"` and `title="…"` values.
- [ ] **Step 4:** `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(translit): port transliteration library, add HTML converter`

### Task 2: Script paths, links and settings group

**Files:**
- Create: `src/lib/script.ts`, `tests/script.test.ts`
- Modify: `src/lib/settings-defaults.ts` (add an `alphabets` group: `{ exceptions: {}, protectedWords: [], indexNewLatin: true }`, with its type in `AllSettings` and `SettingsKey`)

**Interfaces (Produces):**
- `SCRIPTS`, `SCRIPT_PREFIX`, `HTML_LANG`, `SCRIPT_LABEL`, `isScript()`
- `withScript(script: Script, href: string, siteUrl?: string): string`
  - prefixes site-relative URLs, and absolute URLs on `siteUrl` (returned site-relative)
  - leaves alone: external URLs, `#…`, `mailto:`, `tel:`, `/admin…`, `/api…`, `/uploads…`, `/wp-content…`, `/feed/` (latn only), `/og…`, `/fonts…`, `/images…`, files with an extension
- `stripScript(pathname: string): { script: Script; path: string }`
- `alternatePaths(path: string): { latn: string; cyrl: string; yangi: string }`

- [ ] **Step 1: Failing tests**
```ts
test('withScript', () => {
  assert.equal(withScript('cyrl', '/'), '/kirill/')
  assert.equal(withScript('cyrl', '/blog/page/2/'), '/kirill/blog/page/2/')
  assert.equal(withScript('yangi', 'https://www.jurabek.blog/marketing-nima/', 'https://www.jurabek.blog'), '/yangi/marketing-nima/')
  assert.equal(withScript('cyrl', 'https://google.com/'), 'https://google.com/')
  for (const h of ['#faq', 'mailto:a@b.c', '/admin/', '/uploads/x.jpg', '/og/?t=1', '/favicon.svg'])
    assert.equal(withScript('cyrl', h), h)
  assert.equal(withScript('latn', '/blog/'), '/blog/')
  assert.equal(withScript('cyrl', '/kirill/blog/'), '/kirill/blog/') // idempotent
  assert.equal(withScript('cyrl', '/search/?q=sh'), '/kirill/search/?q=sh')
})
test('stripScript', () => {
  assert.deepEqual(stripScript('/kirill/blog/'), { script: 'cyrl', path: '/blog/' })
  assert.deepEqual(stripScript('/yangi/'), { script: 'yangi', path: '/' })
  assert.deepEqual(stripScript('/kirillcha/'), { script: 'latn', path: '/kirillcha/' })
})
```
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement and add the settings group.
- [ ] **Step 4:** `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: script-aware links and alphabets settings group`

### Task 3: Localized data and interface text

**Files:**
- Create: `src/lib/localize.ts`, `tests/localize.test.ts`
- Modify: `src/lib/i18n.ts` (add `getT(script, cfg)`), `src/lib/format.ts` (`formatDate(date, language, tz, script?)` transliterates the result)

**Interfaces (Produces):**
- `localizePost<T extends PostSummary | PostFull>(p: T, script, cfg): T`
  - converts: title, excerpt, content (HTML), seo title/description/OG/Twitter text, faq[], image alt, category and tag names, breadcrumbTitle
  - keeps: path, slug, ids, dates
- `localizeTerm(term: TermRef, script, cfg): TermRef`
- `localizeSettings(s: AllSettings, script, cfg): AllSettings`
  - converts: general.siteName and tagline, appearance text fields, homeContent (HTML), blogTitle, author name and bio, menu item labels; menu item URLs via `withScript`
  - converts the SEO templates' **output**, not the templates themselves, so `%%vars%%` stay intact
- `getT(script, cfg): typeof t`: strings transliterated; function members wrapped so their output is transliterated

- [ ] **Step 1: Failing tests**
  - Post: title, content HTML and faq converted; `path` unchanged
  - Menu: the `/blog/` link becomes `/kirill/blog/` and the label turns Cyrillic
  - `getT('cyrl').readingTime(5) === '5 дақиқа ўқиш'`
  - `getT('yangi').share === 'Postni ulaşing'`
  - Memo returns the same object for the same id + updatedAt + script + version
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement (memo Map, max 1000 entries).
- [ ] **Step 4:** Run tests and typecheck. Expected: PASS.
- [ ] **Step 5: Commit** `feat: localized posts, terms, settings and UI text`

### Task 4: Route groups with per-alphabet root layouts

**Files:**
- Read first: `node_modules/next/dist/docs/` guides on route groups, multiple root layouts, `generateStaticParams`, and not-found handling in route groups
- Move: `src/app/(site)/**` → `src/app/(latn)/**`. URLs stay the same. Root `src/app/layout.tsx` → `src/components/site/RootHtml.tsx` (props `lang`, children), used by `(latn)/layout.tsx`, `(cyrl)/kirill/layout.tsx`, `(yangi)/yangi/layout.tsx` and the new `src/app/admin/layout.tsx` root.
- Create: `src/views/{Home,BlogIndex,BlogPaged,Slug,SlugCatchAll,Category,Tag,Search,NotFound,DraftPreview}.tsx`. Each holds the current page body plus `generateMetadata` logic as `render*(script, params)` and `metadata*(script, params)`.
- Each route file in all three trees becomes a wrapper:
```tsx
export const revalidate = 3600
export const generateStaticParams = ...            // only where the latn file had one
export const generateMetadata = (p) => metadataSlug('cyrl', p)
export default (p) => renderSlug('cyrl', p)
```
- `DraftPreview` stays in `(latn)` only.

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: `SiteChrome({ script, children })`, the former `(site)/layout.tsx` body, script-aware.

- [ ] **Step 1: Prove the Latin side is unchanged.** Before the move, record `curl -s localhost:3000/<path> | sha1sum` for `/`, `/blog/`, one post, one page, one category, `/search/?q=marketing`, and a 404, under `npm run build && npm start` against a seeded local DB (`.env.example` → local Postgres). Save the hashes to the ledger.
- [ ] **Step 2: Move and wrap.** `npm run typecheck && npm run build`. Expected: success, with routes listed under `/kirill/…` and `/yangi/…`.
- [ ] **Step 3: Re-check the Latin side.** Same curls → identical hashes, except `lang="uz"` → `lang="uz-Latn"` (expected; record it as a ruling).
- [ ] **Step 4: Check the variants.** `/kirill/`, `/kirill/<post>/`, `/kirill/blog/page/2/`, `/kirill/category/<x>/`, `/kirill/nope/` → 200, 200, 200, 200, 404. `/yangi/` → 200 with `lang="uz-Latn"`.
- [ ] **Step 5: Commit** `refactor: per-alphabet route groups with shared views`

### Task 5: Script-aware chrome and switcher

**Files:**
- Modify: `src/components/site/{Header,Footer,Sidebar,Article,BlogListing,TermArchive,parts,Brand,SetupNotice}.tsx` (take `script`; use `getT`, `withScript`; localized data from views)
- Create: `src/components/site/AlphabetSwitcher.tsx`, `tests/switcher.test.ts`

**Interfaces:** `AlphabetSwitcher({ script, path })`: three `<a>` links built with `alternatePaths(path)`. The active one has `aria-current="true"`. On click: `document.cookie = 'jb_script=<s>; Max-Age=31536000; Path=/; SameSite=Lax'` and `gtag('event','switch_alphabet',{from,to})` when present. In the header it sits next to the dark-mode toggle (desktop and mobile menu). `Header` gets the path from `usePathname()` + `stripScript`.

- [ ] **Step 1: Failing test** (pure function `switcherLinks(script, pathname)`): on `/kirill/marketing-nima/` → `['/marketing-nima/', '/kirill/marketing-nima/', '/yangi/marketing-nima/']`, and the labels match.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement**, then go through every component in Files.
- [ ] **Step 4:** Run tests and `npm run build`. Manual check: on `/kirill/`, every header, footer, sidebar, card, breadcrumb, pagination and tag link starts with `/kirill/`; the search form posts to `/kirill/search/`.
- [ ] **Step 5: Commit** `feat: alphabet switcher and script-aware site chrome`

### Task 6: SEO metadata and JSON-LD per alphabet

**Files:**
- Modify: `src/lib/seo/resolve.ts` (`SeoInput.script?: Script`; transliterate the resolved strings; canonical = `withScript(script, path)` unless a custom canonical is set, in which case variants are noindex with a self canonical), `src/lib/seo/page.ts`, `src/lib/seo/schema.ts` (`inLanguage`, localized strings), `toMetadata` (adds `alternates.languages` per spec §5.2; yangi: none; robots for yangi when `indexNewLatin` is false)
- Test: `tests/seo-alphabets.test.ts`

- [ ] **Step 1: Failing tests** (on `resolveSeo` + `toMetadata` with fixture settings and posts)
  - cyrl post: `alternates.canonical === 'https://www.jurabek.blog/kirill/marketing-nima/'`, and `alternates.languages` equals `{ 'uz-Latn': '…/marketing-nima/', 'uz-Cyrl': '…/kirill/marketing-nima/', 'x-default': '…/marketing-nima/' }`
  - yangi post: no `languages`; robots index true; with `indexNewLatin: false`, robots index false
  - `variant of custom-canonical post is noindex`
  - The title template output is Cyrillic and the `%%sep%%` separator is unchanged
  - JSON-LD `inLanguage === 'uz-Cyrl'`, and the BlogPosting `@id` starts with `…/kirill/`
  - A paged archive (`/kirill/blog/page/2/`) has a canonical with the page; its hreflang points to the same page number
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. Read the `generateMetadata`/`alternates` doc in `node_modules/next/dist/docs/` first.
- [ ] **Step 4:** Run tests, then build and `curl -s localhost:3000/kirill/<post>/ | grep -E 'hreflang|canonical|lang='`. Expected: matches the tests.
- [ ] **Step 5: Commit** `feat(seo): per-alphabet canonical, hreflang, robots and schema`

### Task 7: Sitemaps, feed, search, revalidation, OG images

**Files:**
- Modify: `src/lib/seo/sitemaps.ts` (`postSitemapEntries(type, settings, siteUrl, script = 'latn')`, the same for terms; `urlset` supports `alternates`), `src/app/sitemap_index.xml/route.ts`, `src/lib/revalidate.ts`, `src/app/feed/route.ts` → shared `feedResponse(script)`, `src/views/Search.tsx` (normalised query), `src/app/og/route.tsx` (Cyrillic + latin-ext font files from `@fontsource/*` into `assets/og/`; a `script` param transliterates the title)
- Create route handlers: `src/app/kirill-post-sitemap.xml/route.ts`, `kirill-page-…`, `kirill-category-…`, `kirill-post_tag-…`, the four `yangi-…` ones, and `src/app/(cyrl)/kirill/feed/route.ts` + the yangi feed. Check route handlers inside route groups against the docs; if that's not allowed, use `src/app/kirill/feed/route.ts`.
- Test: `tests/sitemaps.test.ts` (pure `urlset` + entry mapping with fixtures)

- [ ] **Step 1: Failing tests**
  - Latn entries carry `xhtml:link` for uz-Latn, uz-Cyrl and x-default, and the urlset declares `xmlns:xhtml`
  - Kirill entries have `/kirill/` locs and the same alternates
  - Yangi entries have no alternates, and none at all when `indexNewLatin` is false
  - The index lists 12 sitemaps (4 latn + 4 kirill + 4 yangi), or 8 when the yangi switch is off
  - Feed `<language>` = uz-Cyrl for kirill
  - The search normaliser turns `маркетинг` into an ILIKE pattern `%marketing%`
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. `revalidateSite()` also revalidates `/kirill`, `/yangi` (layout) and the new sitemap and feed paths.
- [ ] **Step 4:** Run tests and build. Curl the sitemap index, one kirill sitemap and `/kirill/feed/`: valid XML.
- [ ] **Step 5: Commit** `feat(seo): alphabet sitemaps, feeds, search and OG images`

### Task 8: Admin, Settings → Alifbolar, and analytics

**Files:**
- Modify: `src/app/admin/(panel)/settings/page.tsx`, `src/components/admin/SettingsForm.tsx` (or a new `AlphabetSettings.tsx` section), `src/app/admin/_actions/settings.ts` (saves the `alphabets` group: `requireUser`, `sanitizePlain` on every key and value, `revalidateSite()`), `SiteChrome` analytics script (GA4 config gets `{ alphabet: script }`; Yandex `params({alphabet})`)
- Test: `tests/alphabet-settings.test.ts` (pure validator `parseAlphabetSettings(formData)`)

- [ ] **Step 1: Failing tests**
  - Blank keys or values are rejected
  - Keys are lowercased with apostrophes normalised
  - Protected words are split one per line and trimmed
  - `indexNewLatin` checkbox → boolean
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. The UI has an exceptions table (Latin → Cyrillic) with add/remove, a protected-words textarea and the "Yangi lotin sahifalarini indekslash" toggle. It's prefilled with the defaults while the group is empty.
- [ ] **Step 4:** Run tests and build. Manual: save an exception, then `/kirill/<post>/` shows it after the save (revalidated).
- [ ] **Step 5: Commit** `feat(admin): alphabet settings and analytics dimension`

### Task 9: Golden set, preview verification, PR

- [ ] **Step 1:** `scripts/golden-set.mjs` exports 300 sentences (latn / cyrl / yangi CSV) from published posts. Jurabek reviews the Cyrillic column; fixes go into Admin → Alifbolar.
- [ ] **Step 2:** `npm test && npm run typecheck && npm run build`. All pass.
- [ ] **Step 3:** Push `feature/alphabets-next`, then check the Vercel preview (`web_fetch_vercel_url`):
  - 3 posts × 3 alphabets: lang, canonical, hreflang (none on yangi), body text in the right alphabet
  - sitemap index and one kirill sitemap
  - `/kirill/nope/` → 404
  - an old WordPress URL redirect still works
  - admin login works
- [ ] **Step 4:** Open a PR into `nextjs-migration` with the launch checklist:
  - GSC: submit `sitemap_index.xml`, inspect one URL per alphabet
  - Yandex Webmaster: submit sitemaps, "Check page"
  - GA4: register the `alphabet` dimension
  - 4-week review: per-sitemap indexing, `/kirill/` and `/yangi/` queries, duplicate warnings on `/yangi/`
