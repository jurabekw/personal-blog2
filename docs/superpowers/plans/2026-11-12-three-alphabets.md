# Three Alphabets (O'zbek · Ўзбек · Özbek) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve every public page of jurabek.blog in current Latin, Cyrillic (`/kirill/`) and new 2026 Latin (`/yangi/`). Each version is server-rendered with its own SEO tags so search engines match pages to the reader's alphabet.

**Architecture:**
- A pure transliteration library (`src/lib/translit/`) is shared by the Express API and the React client.
- Public page routes move from static `index.html` to the Vercel function. The function fills the built `index.html` template with head tags, a JSON bootstrap and a server-rendered body; the client then mounts with `createRoot` and replaces that body.
- Posts are transliterated at request time and memoised. Nothing new is stored except the alphabet settings.

**Tech Stack:** React 19, Vite 6, Express 4 on Vercel (`api/index.ts`), Neon Postgres / local JSON fallback, TypeScript 5.8, Vitest (added in Task 1).

**Spec:** `docs/superpowers/specs/2026-11-12-three-alphabets-design.md`

## Global Constraints

- Script ids: `'latn' | 'cyrl' | 'yangi'`. URL prefixes: `''`, `'/kirill'`, `'/yangi'`.
- Site origin for every canonical, hreflang, sitemap and RSS URL: `https://www.jurabek.blog`. Never derive it from `req.protocol` or `req.get('host')`.
- Switcher labels: `O'zbek` · `Ўзбек` · `Özbek`.
- `<html lang>`: latn `uz-Latn`, cyrl `uz-Cyrl`, yangi `uz-Latn`.
- hreflang group = `uz-Latn` (root URL), `uz-Cyrl` (`/kirill` URL), `x-default` (root URL). It's printed on latn and cyrl pages. Yangi pages print no hreflang and appear in no group.
- New Latin is indexable (`index, follow`) unless `settings.alphabets.indexNewLatin === false`. Default `true`.
- ц in loanwords → `s` in new Latin.
- Slugs stay ASCII in every alphabet. `/admin` and `/api/*` are never prefixed.
- Existing current-Latin URLs keep returning 200 with unchanged paths.
- Feature flag `ALPHABETS_ENABLED` (env, `"true"`/unset). When unset, only latn routes exist, there's no switcher, and sitemaps list latn only. This makes ship checkpoint 1 possible.
- No automatic redirects based on cookie, IP or Accept-Language.

## Review Focus

1. **English brand names and terms inside Uzbek sentences** ("Google Ads kampaniyasi", "ChatGPT bilan"): stay in Latin on Cyrillic pages. → Task 1 test `keeps protected words and acronyms`.
2. **Copy-pasted apostrophe variants** (‘ ’ ʻ ʼ `) in o'/g' and tutuq: convert the same as ASCII `'`. → Task 1 test `normalises apostrophe variants`.
3. **Old URLs with query strings, trailing slashes or upper-case slugs** (`/blog/Marketing-Nima/?utm_source=tg`): the page renders, and the canonical is the clean lowercase-slug URL. → Task 4 test `canonical strips query and trailing slash`.
4. **Unknown, draft or scheduled slugs under any prefix** (`/kirill/blog/not-a-post`): return 404 with `noindex`, not a 200 soft-404. → Task 5 test `returns 404 noindex for unknown or unpublished slug`.
5. **Prefixes must not swallow admin, API or static files** (`/kirill/admin`, `/kirill/api/posts`, `/assets/x.js`): admin and API behave as without the prefix rule, and assets are never rendered as pages. → Task 3 test `does not treat admin, api or asset paths as pages`.

---

### Task 1: Transliteration core

**Files:**
- Create: `src/lib/translit/types.ts`, `src/lib/translit/core.ts`, `src/lib/translit/defaults.ts`, `src/lib/translit/core.test.ts`
- Modify: `package.json` (add `vitest` devDependency, script `"test": "vitest run"`)

**Interfaces:**
- Produces:
  - `type Script = 'latn' | 'cyrl' | 'yangi'`
  - `interface TranslitConfig { exceptions: Record<string, string>; protectedWords: string[]; version: string }`
  - `DEFAULT_TRANSLIT_CONFIG: TranslitConfig`
  - `toCyrillic(text: string, cfg: TranslitConfig): string`
  - `toNewLatin(text: string, cfg: TranslitConfig): string`
  - `transliterateText(text: string, script: Script, cfg: TranslitConfig): string` (identity for `latn`)

- [ ] **Step 1: Install Vitest and add the test script**
Run: `npm i -D vitest && npm pkg set scripts.test="vitest run"`
Expected: `package.json` lists vitest.

- [ ] **Step 2: Write the failing tests in `core.test.ts`** (use `DEFAULT_TRANSLIT_CONFIG` unless stated)

```ts
test('cyrillic basic letters and digraphs', () => {
  expect(toCyrillic("O'zbekiston", cfg)).toBe('Ўзбекистон');
  expect(toCyrillic('shahar choy', cfg)).toBe('шаҳар чой');
  expect(toCyrillic("g'alaba", cfg)).toBe('ғалаба');
  expect(toCyrillic('marketing', cfg)).toBe('маркетинг');
});
test('cyrillic y-rules run after oʻ/gʻ', () => {
  expect(toCyrillic("yo'l", cfg)).toBe('йўл');
  expect(toCyrillic('yangi yetti yoz yulduz', cfg)).toBe('янги етти ёз юлдуз');
});
test('cyrillic e at word start or after vowel becomes э', () => {
  expect(toCyrillic('ekran kelajak', cfg)).toBe('экран келажак');
  expect(toCyrillic('Ekran', cfg)).toBe('Экран');
});
test('cyrillic tutuq', () => {
  expect(toCyrillic("a'zo", cfg)).toBe('аъзо');
  expect(toCyrillic("Is'hoq", cfg)).toBe('Исҳоқ');
});
test('cyrillic preserves ALL CAPS Uzbek words', () => {
  expect(toCyrillic("O'ZBEK SHAHAR", cfg)).toBe('ЎЗБЕК ШАҲАР');
});
test('exceptions: exact word and longest prefix', () => {
  const c = { ...cfg, exceptions: { aksiya: 'акция', sentabr: 'сентябрь' } };
  expect(toCyrillic('aksiya', c)).toBe('акция');
  expect(toCyrillic('aksiyalar', c)).toBe('акциялар');
  expect(toCyrillic('Sentabr', c)).toBe('Сентябрь');
});
test('keeps protected words and acronyms', () => {
  const c = { ...cfg, protectedWords: ['Google', 'Ads', 'ChatGPT', 'Chrome'] };
  expect(toCyrillic('Google Ads kampaniyasi', c)).toBe('Google Ads кампанияси');
  expect(toCyrillic('ChatGPT bilan SEO va GA4', c)).toBe('ChatGPT билан SEO ва GA4');
  expect(toCyrillic('Facebook sahifa', cfg)).toBe('Facebook саҳифа'); // c not in "ch" → foreign
  expect(toNewLatin('Chrome brauzeri', c)).toBe('Chrome brauzeri');
});
test('new latin digraphs and case', () => {
  expect(toNewLatin("O'zbekiston shahri choyxona", cfg)).toBe('Özbekiston şahri çoyxona');
  expect(toNewLatin("G'ALABA Shahar CHOY", cfg)).toBe('ĞALABA Şahar ÇOY');
  expect(toNewLatin('dengiz', cfg)).toBe('dengiz');
});
test('new latin tutuq', () => {
  expect(toNewLatin("Is'hoq", cfg)).toBe('Ishoq');
  expect(toNewLatin("a'zo", cfg)).toBe('aʼzo');
});
test('normalises apostrophe variants', () => {
  for (const s of ['o‘zbek', 'oʻzbek', 'o`zbek', 'o’zbek', "o'zbek"]) {
    expect(toNewLatin(s, cfg)).toBe('özbek');
    expect(toCyrillic(s, cfg)).toBe('ўзбек');
  }
});
test('punctuation, numbers and spacing untouched', () => {
  expect(toCyrillic('2026-yil, 5 ta (shahar)!', cfg)).toBe('2026-йил, 5 та (шаҳар)!');
});
test('latn is identity', () => {
  expect(transliterateText("o'zbek", 'latn', cfg)).toBe("o'zbek");
});
```

- [ ] **Step 3: Run the tests to verify they fail**
Run: `npx vitest run src/lib/translit/core.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 4: Implement `core.ts`, `types.ts` and `defaults.ts`**

Approach:
1. Normalise `[‘’ʻʼ`']` to an internal apostrophe.
2. Tokenise with `/[\p{L}\p{M}\d'ʻʼ]+/gu`, leaving non-word runs untouched.
3. For each word, keep it as is if any of these hold:
   - it is in `protectedWords` (case-insensitive)
   - it matches `/^[A-Z0-9]{2,}$/` and contains a digit or is ≤5 letters with no Uzbek digraph (acronyms like SEO, GA4, AEO)
   - it contains `w`/`W`, or a `c`/`C` not followed by `h`/`H`
4. Otherwise apply the exceptions (exact match, then longest prefix, matched case-insensitively, then restore the case pattern: capitalised or ALL CAPS).
5. Then apply the ordered rules from spec §4.1.

`defaults.ts` starter exceptions (Latin → Cyrillic):
- months: yanvar→январь, fevral→февраль, iyun→июнь, iyul→июль, sentabr→сентябрь, oktabr→октябрь, noyabr→ноябрь, dekabr→декабрь
- loanwords: aksiya→акция, kompyuter→компьютер, sirk→цирк, konsert→концерт, litsenziya→лицензия, prezident→президент, kontent→контент

Starter protected words: `Google, Ads, Analytics, Meta, Facebook, Instagram, Telegram, YouTube, ChatGPT, Claude, Gemini, Chrome, Yandex, Hamkorbank, WordPress, Vercel, Next.js, React, Brandwatch`.

`version` = a short hash of the JSON of exceptions + protectedWords.

- [ ] **Step 5: Run the tests to verify they pass**
Run: `npx vitest run src/lib/translit/core.test.ts`
Expected: all PASS.

- [ ] **Step 6: Commit**
`git add package.json package-lock.json src/lib/translit && git commit -m "feat(translit): latin→cyrillic and latin→2026 latin core"`

---

### Task 2: Markdown, post transliteration and search normaliser

**Files:**
- Create: `src/lib/translit/markdown.ts`, `src/lib/translit/post.ts`, `src/lib/translit/search.ts`, `src/lib/translit/index.ts` (re-exports), tests `markdown.test.ts`, `post.test.ts`, `search.test.ts`

**Interfaces:**
- Consumes: Task 1 exports.
- Produces:
  - `transliterateMarkdown(md: string, script: Script, cfg: TranslitConfig): string`
  - `transliteratePost(post: Post, script: Script, cfg: TranslitConfig): Post`, memoised on `post.id + post.updatedAt + script + cfg.version` (Map with max 500 entries). Converts: title, excerpt, content (markdown), seoTitle, seoDescription, coverImageAlt, category, tags[], faqs[].question/answer, footnotes[] text fields. Never converts: slug, id, URLs, dates.
  - `transliterateCategory(c: Category, script, cfg): Category` (name, description; slug unchanged)
  - `normalizeForSearch(text: string): string` (any alphabet → lowercase current Latin, apostrophes → `'`)

- [ ] **Step 1: Write the failing tests**

```ts
// markdown.test.ts
test('leaves code, urls and html attributes untouched', () => {
  const md = "Bu `shahar` va [shahar](https://shahar.uz/sh) <a href=\"/blog/sh\">sh</a> https://x.uz/choy\n```\nshahar\n```\n![shahar rasmi](/img/shahar.png)";
  expect(transliterateMarkdown(md, 'cyrl', cfg)).toBe(
    "Бу `shahar` ва [шаҳар](https://shahar.uz/sh) <a href=\"/blog/sh\">ш</a> https://x.uz/choy\n```\nshahar\n```\n![шаҳар расми](/img/shahar.png)");
});
test('keeps markdown structure: headings, lists, tables', () => {
  expect(transliterateMarkdown('## Choy\n- shahar\n| a | sh |\n|---|---|', 'yangi', cfg))
    .toBe('## Çoy\n- şahar\n| a | ş |\n|---|---|');
});
// post.test.ts
test('converts text fields, never slug or urls', () => {
  const out = transliteratePost(samplePost, 'cyrl', cfg);
  expect(out.slug).toBe(samplePost.slug);
  expect(out.coverImage).toBe(samplePost.coverImage);
  expect(out.title).toBe('Маркетинг нима');
  expect(out.faqs![0].question).toBe('Нима учун керак?');
});
test('latn returns the same object', () => {
  expect(transliteratePost(samplePost, 'latn', cfg)).toBe(samplePost);
});
// search.test.ts
test('normalizes all alphabets to current latin', () => {
  expect(normalizeForSearch('Маркетинг')).toBe('marketing');
  expect(normalizeForSearch('şahar Çoy')).toBe('shahar choy');
  expect(normalizeForSearch('ЎЗБЕК')).toBe("o'zbek");
  expect(normalizeForSearch('o‘zbek')).toBe("o'zbek");
  expect(normalizeForSearch('Ёз юлдуз эшик')).toBe('yoz yulduz eshik');
});
```
(`samplePost`: title "Marketing nima", faqs [{question: "Nima uchun kerak?", answer: "..."}], slug `marketing-nima`, coverImage `/img/m.png`.)

- [ ] **Step 2: Run the tests to verify they fail**
Run: `npx vitest run src/lib/translit`
Expected: FAIL for the new files.

- [ ] **Step 3: Implement**

`transliterateMarkdown`:
- Line-based: toggle on lines starting with ```` ``` ```` and pass everything inside a fence through unchanged.
- In other lines, split with `/(`[^`]*`|\]\([^)]*\)|<[^>]+>|https?:\/\/\S+)/` and transliterate only the segments that don't match.

`normalizeForSearch`:
- Reverse maps: Cyrillic→Latin (ш→sh, ч→ch, ў→o', ғ→g', ё→yo, ю→yu, я→ya, е→e (ye at word start), э→e, ц→ts, ъ→', ь→'').
- New Latin→old Latin (ş→sh, ç→ch, ö→o', ğ→g').

- [ ] **Step 4: Run the tests to verify they pass**
Run: `npx vitest run src/lib/translit`
Expected: PASS.

- [ ] **Step 5: Commit**
`git commit -am "feat(translit): markdown-safe post transliteration and search normaliser"`

---

### Task 3: Script-aware paths

**Files:**
- Create: `src/lib/script.ts`, `src/lib/script.test.ts`

**Interfaces:**
- Produces:
  - `SITE_ORIGIN = 'https://www.jurabek.blog'`
  - `SCRIPTS: Script[] = ['latn','cyrl','yangi']`
  - `SCRIPT_PREFIX: Record<Script, '' | '/kirill' | '/yangi'>`
  - `HTML_LANG: Record<Script, 'uz-Latn' | 'uz-Cyrl'>`
  - `SCRIPT_LABEL = { latn: "O'zbek", cyrl: 'Ўзбек', yangi: 'Özbek' }`
  - `parseScriptPath(pathname: string): { script: Script; path: string; isPage: boolean }`. `path` starts with `/`. `isPage` is false for `/admin*`, `/api/*`, and anything with a file extension.
  - `buildScriptPath(script: Script, path: string): string`
  - `canonicalPath(path: string): string` (drops the query/hash, lowercases the slug segment, removes the trailing slash except `/`)

- [ ] **Step 1: Write the failing tests**

```ts
test('parses prefixes', () => {
  expect(parseScriptPath('/kirill/blog/marketing-nima')).toEqual({ script: 'cyrl', path: '/blog/marketing-nima', isPage: true });
  expect(parseScriptPath('/yangi/')).toEqual({ script: 'yangi', path: '/', isPage: true });
  expect(parseScriptPath('/kirill')).toEqual({ script: 'cyrl', path: '/', isPage: true });
  expect(parseScriptPath('/blog')).toEqual({ script: 'latn', path: '/blog', isPage: true });
  expect(parseScriptPath('/kirillcha')).toEqual({ script: 'latn', path: '/kirillcha', isPage: true });
});
test('does not treat admin, api or asset paths as pages', () => {
  expect(parseScriptPath('/admin').isPage).toBe(false);
  expect(parseScriptPath('/kirill/admin').isPage).toBe(false);
  expect(parseScriptPath('/kirill/api/posts').isPage).toBe(false);
  expect(parseScriptPath('/assets/index-abc.js').isPage).toBe(false);
});
test('builds paths', () => {
  expect(buildScriptPath('cyrl', '/')).toBe('/kirill/');
  expect(buildScriptPath('latn', '/blog/x')).toBe('/blog/x');
  expect(buildScriptPath('yangi', '/contact')).toBe('/yangi/contact');
});
test('canonicalPath', () => {
  expect(canonicalPath('/blog/Marketing-Nima/?utm_source=tg#faq')).toBe('/blog/marketing-nima');
  expect(canonicalPath('/')).toBe('/');
});
```

- [ ] **Step 2: Run to fail.** Run: `npx vitest run src/lib/script.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `src/lib/script.ts`** per the interfaces.
- [ ] **Step 4: Run to pass.** Same command. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -am "feat: script-aware path helpers"`

---

### Task 4: SEO head builder

**Files:**
- Create: `src/lib/seo/head.ts`, `src/lib/seo/schema.ts`, `src/lib/seo/head.test.ts`

**Interfaces:**
- Consumes: Task 3.
- Produces:
  - `interface PageMeta { script: Script; path: string; title: string; description: string; image?: string; type: 'website' | 'article'; post?: Post; noindex?: boolean; indexNewLatin: boolean; siteTitle: string; authorName: string }`
  - `buildHeadTags(meta: PageMeta, alphabetsEnabled: boolean): HeadTag[]`, where `type HeadTag = { tag: 'title' | 'meta' | 'link' | 'script'; attrs: Record<string,string>; text?: string }`
  - `renderHeadTags(tags: HeadTag[]): string` (escaped HTML, used by the server)
  - `hreflangLinks(script, path): { hreflang: string; href: string }[]` (`[]` for yangi, or when alphabets are disabled)
  - `buildJsonLd(meta: PageMeta): object` (BlogPosting + FAQPage for posts, WebSite otherwise; `inLanguage` = `HTML_LANG[script]`, `url`/`@id` = canonical, SearchAction target `SITE_ORIGIN + buildScriptPath(script,'/blog') + '?search={search_term_string}'`)

- [ ] **Step 1: Write the failing tests**

```ts
test('cyrillic post has self canonical and reciprocal hreflang', () => {
  const tags = buildHeadTags({ ...base, script: 'cyrl', path: '/blog/marketing-nima' }, true);
  expect(find(tags, 'link', 'canonical').href).toBe('https://www.jurabek.blog/kirill/blog/marketing-nima');
  expect(alternates(tags)).toEqual([
    ['uz-Latn', 'https://www.jurabek.blog/blog/marketing-nima'],
    ['uz-Cyrl', 'https://www.jurabek.blog/kirill/blog/marketing-nima'],
    ['x-default', 'https://www.jurabek.blog/blog/marketing-nima'],
  ]);
});
test('yangi page: self canonical, indexable, no hreflang', () => {
  const tags = buildHeadTags({ ...base, script: 'yangi', path: '/' }, true);
  expect(find(tags, 'link', 'canonical').href).toBe('https://www.jurabek.blog/yangi/');
  expect(alternates(tags)).toEqual([]);
  expect(robots(tags)).toBe('index, follow');
});
test('yangi noindex when indexNewLatin=false', () => {
  expect(robots(buildHeadTags({ ...base, script: 'yangi', indexNewLatin: false }, true))).toBe('noindex, follow');
});
test('alphabets disabled: no hreflang', () => {
  expect(alternates(buildHeadTags({ ...base, script: 'latn' }, false))).toEqual([]);
});
test('canonical strips query and trailing slash', () => {
  const tags = buildHeadTags({ ...base, script: 'latn', path: '/blog/Marketing-Nima/?utm=1' }, true);
  expect(find(tags, 'link', 'canonical').href).toBe('https://www.jurabek.blog/blog/marketing-nima');
});
test('post uses seoTitle/seoDescription, json-ld has inLanguage', () => {
  const tags = buildHeadTags({ ...base, script: 'cyrl', type: 'article', post: { ...p, seoTitle: 'СЕО сарлавҳа' } }, true);
  expect(titleOf(tags)).toBe('СЕО сарлавҳа — Jurabek');
  expect(jsonLd(tags)['@graph'][0].inLanguage).toBe('uz-Cyrl');
});
test('renderHeadTags escapes', () => {
  expect(renderHeadTags([{ tag: 'title', attrs: {}, text: 'A & "B"' }])).toBe('<title>A &amp; &quot;B&quot;</title>');
});
```

- [ ] **Step 2: Run to fail.** `npx vitest run src/lib/seo`. Expected: FAIL.
- [ ] **Step 3: Implement.** Also emit:
  - `og:site_name`, `og:title`, `og:description`, `og:type`, `og:url` (= canonical), `og:image`, `og:locale` = `uz_UZ`
  - `twitter:*` tags as in the current `SEOHead.tsx`
  - `meta name=description`, `meta name=robots`
- [ ] **Step 4: Run to pass.** Expected: PASS.
- [ ] **Step 5: Commit** `git commit -am "feat(seo): shared head + json-ld builder with hreflang rules"`

---

### Task 5: Server-side page rendering on Vercel (ship checkpoint 1: Latin only)

**Files:**
- Create: `api/ssr/loadData.ts`, `api/ssr/renderPage.ts`, `src/ssr/SsrBody.tsx`, `api/ssr/renderPage.test.ts`
- Modify: `api/index.ts` (add the page route before the final 404), `vercel.json`, `index.html` (`<html lang="uz-Latn">`, `<!--ssr-head-->` and `<!--ssr-body-->` markers, remove the stale default title/meta/OG), `src/main.tsx` (read `window.__BOOTSTRAP__`), `server.ts` (prod and dev branches call `renderPage`; delete the old meta-injection code), `vite.config.ts` only if needed for the `src/` import from `api/`.

**Interfaces:**
- Consumes: Tasks 2–4. Also `getSqlClient`, `initNeonTables`, `mapRowToPost` and `loadLocalDb` from `api/db.ts`.
- Produces:
  - `loadPageData(script: Script, path: string): Promise<{ status: 200 | 404; settings: SiteSettings; posts: Post[]; post: Post | null; categories: Category[]; cfg: TranslitConfig }>`. Returns only published posts, already transliterated to `script`.
  - `renderPage(url: string, template: string, opts: { alphabetsEnabled: boolean }): Promise<{ status: number; html: string; headers: Record<string,string> }>`
  - `window.__BOOTSTRAP__ = { script: Script; post: Post | null; posts: Post[] }`
  - `<SsrBody script page posts post settings ui />`: static markup for home, archive, post (uses `MarkdownContent` + FAQ list) and contact. It must not touch `window` or `localStorage`.

- [ ] **Step 1: Write the failing tests** (`renderPage.test.ts`, with `loadPageData` mocked)

```ts
test('renders post html with head and body content', async () => {
  const r = await renderPage('/blog/marketing-nima', TEMPLATE, { alphabetsEnabled: true });
  expect(r.status).toBe(200);
  expect(r.html).toContain('<html lang="uz-Latn">');
  expect(r.html).toContain('<link rel="canonical" href="https://www.jurabek.blog/blog/marketing-nima"');
  expect(r.html).toContain('<h1');                       // body rendered
  expect(r.html).toContain('Marketing nima');
  expect(r.headers['Cache-Control']).toBe('public, s-maxage=300, stale-while-revalidate=86400');
});
test('cyrillic url renders cyrillic text and lang', async () => {
  const r = await renderPage('/kirill/blog/marketing-nima', TEMPLATE, { alphabetsEnabled: true });
  expect(r.html).toContain('<html lang="uz-Cyrl">');
  expect(r.html).toContain('Маркетинг нима');
});
test('returns 404 noindex for unknown or unpublished slug', async () => {
  for (const u of ['/kirill/blog/not-a-post', '/blog/draft-post', '/yangi/blog/scheduled-post']) {
    const r = await renderPage(u, TEMPLATE, { alphabetsEnabled: true });
    expect(r.status).toBe(404);
    expect(r.html).toContain('noindex');
  }
});
test('prefixed urls 404 when alphabets disabled', async () => {
  expect((await renderPage('/kirill/', TEMPLATE, { alphabetsEnabled: false })).status).toBe(404);
});
test('bootstrap json is script-safe', async () => {
  const r = await renderPage('/blog/xss-post', TEMPLATE, { alphabetsEnabled: true }); // title contains </script>
  expect(r.html).not.toMatch(/<\/script><script>alert/);
});
```

- [ ] **Step 2: Run to fail.** `npx vitest run api/ssr`. Expected: FAIL.

- [ ] **Step 3: Implement `loadData.ts`, `SsrBody.tsx` and `renderPage.ts`**
  - Serialise the bootstrap with `JSON.stringify(x).replace(/</g, '\\u003c')`.
  - Template source: `fs.readFileSync(path.join(process.cwd(), 'dist/index.html'))`, read once per cold start.
  - Unknown route → 404 page with `noindex`.

- [ ] **Step 4: Wire the routes**
  - `api/index.ts`: `app.get('*', handler)` for any path where `parseScriptPath(p).isPage`.
  - `vercel.json`:
    - add `"functions": { "api/index.ts": { "includeFiles": "dist/index.html" } }`
    - replace the final rewrite `"/(.*)" → "/index.html"` with `"/((?!assets/|favicon|.*\\.[a-z0-9]+$).*)" → "/api/index.ts"`
    - keep the `/admin` route serving the SPA: `{ "source": "/admin(.*)", "destination": "/index.html" }` placed **before** the catch-all.

- [ ] **Step 5: Client bootstrap.** `src/main.tsx` reads `window.__BOOTSTRAP__` and passes `initialScript` and `initialPost` to `<App/>`. It keeps using `createRoot` (it replaces the server body).

- [ ] **Step 6: Run the tests and the type check**
Run: `npx vitest run && npm run lint`
Expected: PASS, no type errors.

- [ ] **Step 7: Build and smoke test locally**
Run: `npm run build && NODE_ENV=production node dist/server.cjs & sleep 2 && curl -s localhost:3000/blog/<real-slug> | grep -E 'canonical|<h1|lang='`
Expected: the canonical, the h1 and `lang="uz-Latn"` all present in the raw HTML.

- [ ] **Step 8: Commit, then ship checkpoint 1**
`git commit -am "feat(ssr): server-render public pages with head tags"`

Deploy a Vercel preview with `ALPHABETS_ENABLED` unset. Check `curl -s https://<preview>/blog/<slug>` and `/admin` login. Promote to production. Then run GSC URL Inspection → "View crawled page" on 3 posts, and Yandex Webmaster "Check page".

---

### Task 6: API alphabet support and settings

**Files:**
- Modify: `api/index.ts` (GET `/api/posts`, `/api/posts/:idOrSlug`, `/api/categories`, `/api/tags`, `/api/settings`, PUT `/api/settings`), `src/types.ts` (add `alphabets` to `SiteSettings`), `src/lib/api.ts`
- Create: `api/ssr/translitConfig.ts`, `api/alphabets.test.ts`

**Interfaces:**
- Consumes: Task 2.
- Produces:
  - `SiteSettings.alphabets?: { exceptions: Record<string,string>; protectedWords: string[]; indexNewLatin: boolean }`
  - `getTranslitConfig(settings: SiteSettings): TranslitConfig` (merges `DEFAULT_TRANSLIT_CONFIG` with the settings, settings win)
  - Query param `?script=latn|cyrl|yangi` on the public GETs (invalid → `latn`). Admin requests (with the auth header) always get the source text.
  - `api.getPosts(script?: Script)`, `api.getPostBySlugOrId(slug, script?)`, `api.getCategories(script?)`

- [ ] **Step 1: Failing tests** (supertest against `createExpressApp()` with the local JSON db):
  - `GET /api/posts?script=cyrl` → titles in Cyrillic and slugs unchanged
  - `?script=bogus` → same as latn
  - authenticated `GET /api/posts?script=cyrl` → source Latin
  - `PUT /api/settings` with a new exception → the next `GET ?script=cyrl` reflects it (proves the cache key includes `cfg.version`)
- [ ] **Step 2: Run to fail.** `npx vitest run api/alphabets.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run to pass.**
- [ ] **Step 5: Commit** `git commit -am "feat(api): script query param and alphabet settings"`

---

### Task 7: Client alphabet context, UI text, routing

**Files:**
- Create: `src/lib/ScriptContext.tsx`, `src/lib/ScriptContext.test.tsx`
- Modify: `src/lib/i18n.ts` (dates and reading time take a `script`), `src/App.tsx` (prefix-aware `navigateTo` and path parsing at lines ~45–66, 133–230), `src/components/Header.tsx`, `Footer.tsx`, `views/*.tsx`, `modals/SearchModal.tsx` (replace direct `uzbekTranslations` imports with `useUi()`)

**Interfaces:**
- Consumes: Tasks 1, 3, 6.
- Produces:
  - `<ScriptProvider script={Script}>`
  - `useScript(): Script`
  - `useUi(): typeof uzbekTranslations` (transliterated once per script, memoised)
  - `useScriptHref(): (path: string) => string`
  - `formatUzbekDate(date: string, script: Script = 'latn')`
  - `formatUzbekReadingTime(minutes: number, script: Script = 'latn')`

- [ ] **Step 1: Failing tests**
  - `useUi()` under `cyrl` → `nav.home === 'Бош саҳифа'`; under `yangi` → `article.share === 'Ulaşish'`
  - `formatUzbekDate('2026-09-05', 'cyrl') === '5-сентябрь, 2026'`
  - `useScriptHref()('/blog/x')` under `cyrl` → `/kirill/blog/x`
- [ ] **Step 2: Run to fail.**
- [ ] **Step 3: Implement.** Then go through every component in Files and route internal links and `navigateTo` targets through `useScriptHref`. App's initial post lookup uses `parseScriptPath(window.location.pathname).path`.
- [ ] **Step 4: Run the tests, `npm run lint`, and a manual check in `npm run dev`:** on `/kirill/blog`, clicking a post, a category, the logo or prev/next stays under `/kirill/`.
- [ ] **Step 5: Commit** `git commit -am "feat(client): alphabet context, transliterated UI, prefixed navigation"`

---

### Task 8: Switcher, preference bar, analytics

**Files:**
- Create: `src/components/AlphabetSwitcher.tsx`, `src/components/AlphabetPreferenceBar.tsx`, `src/lib/analytics.ts`, tests alongside
- Modify: `src/components/Header.tsx` (desktop and mobile menu), `src/App.tsx` (render the bar), `index.html` (gtag config sends `alphabet`)

**Interfaces:**
- Consumes: Tasks 3, 7.
- Produces:
  - `<AlphabetSwitcher />`: three `<a href>` links. Labels come from `SCRIPT_LABEL`. Each href is the same page in the other alphabet: `buildScriptPath(target, currentPath)` plus the current query. The active one has `aria-current="true"`. On click: set cookie `jb_script=<target>; Max-Age=31536000; Path=/; SameSite=Lax`, then `trackAlphabetSwitch(from, to)`. Normal navigation, no `preventDefault`.
  - `trackAlphabetSwitch(from: Script, to: Script)` → `gtag('event','switch_alphabet',{from,to})` and `ym(113581623,'params',{alphabet: to})`
  - `trackAlphabet(script)` on load → `gtag('set','user_properties',{alphabet: script})`
  - `<AlphabetPreferenceBar />`: shown when the `jb_script` cookie exists, differs from the page's alphabet, and hasn't been dismissed (`sessionStorage`). It links to the other version (text in the cookie's alphabet, e.g. "Ўзбек алифбосида ўқиш →"). It never redirects.

- [ ] **Step 1: Failing tests (React Testing Library)**
  - On `/kirill/blog/x?ref=1`, the switcher hrefs are `/blog/x?ref=1`, `/kirill/blog/x?ref=1`, `/yangi/blog/x?ref=1`
  - Clicking sets the cookie and calls the `trackAlphabetSwitch` mock
  - The bar shows when cookie=`cyrl` on a latn page, and not when cookie=`latn`
  - `window.location` is never assigned
- [ ] **Step 2: Run to fail.**
- [ ] **Step 3: Implement.** Add `@testing-library/react` and `jsdom` as dev dependencies if they're missing.
- [ ] **Step 4: Run to pass.**
- [ ] **Step 5: Commit** `git commit -am "feat: alphabet switcher, preference bar, analytics"`

---

### Task 9: Client SEOHead uses the shared builder

**Files:**
- Modify: `src/components/SEOHead.tsx` (replace the body with `buildHeadTags` + a DOM sync; drop `window.location.href` as the canonical and the `jurabek.dev` fallback). Update the callers in `App.tsx` and the views to pass `script` + `path`.
- Test: `src/components/SEOHead.test.tsx`

**Interfaces:**
- Consumes: Task 4 (`buildHeadTags`, `PageMeta`), Task 7 (`useScript`).

- [ ] **Step 1: Failing test.** After client navigation to a Cyrillic post, `document.head` has exactly one canonical (`https://www.jurabek.blog/kirill/blog/x`), 3 hreflang links, `document.documentElement.lang === 'uz-Cyrl'`, and no leftover hreflang links from the previous page.
- [ ] **Step 2: Run to fail.**
- [ ] **Step 3: Implement.** Remove every `link[rel=alternate][hreflang]` before re-adding.
- [ ] **Step 4: Run to pass.**
- [ ] **Step 5: Commit** `git commit -am "fix(seo): client head mirrors server head"`

---

### Task 10: Sitemap index, robots, RSS per alphabet

**Files:**
- Create: `api/seo/sitemaps.ts`, `api/seo/sitemaps.test.ts`
- Modify: `api/index.ts:1204-1285` (robots, sitemap and RSS handlers use the new builders), `vercel.json` (rewrites for `/sitemap-(latn|cyrl|yangi).xml`, `/kirill/rss.xml`, `/yangi/rss.xml` → `/api/index.ts`)

**Interfaces:**
- Consumes: Tasks 2–4, 6.
- Produces:
  - `buildSitemapIndex(alphabetsEnabled: boolean): string`
  - `buildSitemap(script: Script, posts: Post[], indexNewLatin: boolean): string`
  - `buildRss(script: Script, posts: Post[], cfg: TranslitConfig, siteTitle: string): string`

- [ ] **Step 1: Failing tests**
  - The index lists `https://www.jurabek.blog/sitemap-latn.xml`, `…-cyrl.xml` and `…-yangi.xml` when enabled, and only latn when disabled
  - A latn sitemap entry for a post has `<loc>https://www.jurabek.blog/blog/slug</loc>`, `<lastmod>` = the `updatedAt` date, and `xhtml:link` for `uz-Latn`, `uz-Cyrl` and `x-default`; the urlset declares `xmlns:xhtml="http://www.w3.org/1999/xhtml"`
  - Yangi entries have no `xhtml:link`
  - `buildSitemap('yangi', posts, false)` returns an empty urlset
  - Draft and scheduled posts are absent
  - Home and archive entries are present for each alphabet (`/`, `/blog`, `/kirill/`, `/kirill/blog`, …)
  - RSS for cyrl has `<language>uz-Cyrl</language>`, Cyrillic item titles and `/kirill/blog/` links
  - robots.txt contains `Sitemap: https://www.jurabek.blog/sitemap.xml` and `Disallow: /admin`
- [ ] **Step 2: Run to fail.**
- [ ] **Step 3: Implement.** Handlers fetch published posts once and pass them to the builders. `Cache-Control: public, s-maxage=3600`.
- [ ] **Step 4: Run to pass.**
- [ ] **Step 5: Commit** `git commit -am "feat(seo): per-alphabet sitemaps, robots, rss"`

---

### Task 11: Search across alphabets

**Files:**
- Modify: `src/components/views/BlogIndexView.tsx:64-70`, `src/components/modals/SearchModal.tsx:30`
- Create: `src/lib/searchPosts.ts`, `src/lib/searchPosts.test.ts`

**Interfaces:**
- Consumes: `normalizeForSearch` (Task 2).
- Produces: `searchPosts(posts: Post[], query: string): Post[]`. Normalises the query and each post's title, excerpt, tags and category, then substring-matches. It works whatever alphabet the post objects are in.

- [ ] **Step 1: Failing test.** For Cyrillic-transliterated posts, `searchPosts(posts, 'marketing')`, `'маркетинг'` and `'Marketing'` all return the "Маркетинг нима" post; `'şahar'` finds a post containing "shahar".
- [ ] **Step 2: Run to fail.**
- [ ] **Step 3: Implement** and replace both inline filters.
- [ ] **Step 4: Run to pass.**
- [ ] **Step 5: Commit** `git commit -am "feat: alphabet-agnostic site search"`

---

### Task 12: Admin, Alifbolar settings and editor preview

**Files:**
- Modify: `src/components/admin/AdminSettingsView.tsx` (new "Alifbolar" section), `src/components/admin/AdminPostEditorView.tsx` (preview alphabet selector)
- Test: `src/components/admin/AlphabetSettings.test.tsx`

**Interfaces:**
- Consumes: Task 6 (`SiteSettings.alphabets`, PUT `/api/settings`), Task 2 (`transliteratePost`, `transliterateMarkdown`).
- UI (labels in Uzbek Latin):
  - "Istisno so'zlar": table of Latin → Cyrillic pairs with add/remove
  - "Himoyalangan so'zlar": textarea, one word per line
  - "Yangi lotin sahifalarini indekslash": toggle, default on
  - Save calls PUT `/api/settings`
  - The editor preview segmented control (O'zbek · Ўзбек · Özbek) renders `transliterateMarkdown(draft.content, script, cfg)` through `MarkdownContent`

- [ ] **Step 1: Failing tests**
  - Adding the pair `kontent → контент` and saving sends `alphabets.exceptions.kontent === 'контент'`
  - Switching the preview to Ўзбек shows "шаҳар" for draft content "shahar"
  - Blank keys or values are rejected inline (Save disabled)
- [ ] **Step 2: Run to fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run to pass.**
- [ ] **Step 5: Commit** `git commit -am "feat(admin): alphabet settings and editor preview"`

---

### Task 13: Fonts and template cleanup

**Files:**
- Modify: `index.html` (fonts link), `src/index.css:41-53`

- [ ] **Step 1: Update fonts**
  - Change the Google Fonts URL to also load `Source+Serif+4:opsz,wght@8..60,400;8..60,600`.
  - Keep `display=swap`. Google serves the latin-ext and cyrillic subsets automatically via unicode-range.
  - In CSS: `html[lang="uz-Cyrl"] .font-serif, html[lang="uz-Cyrl"] h1, … { font-family: 'Source Serif 4', Georgia, serif; }` (every selector that uses Newsreader today).
- [ ] **Step 2: Visual check.** In `npm run dev`, look at a long post on `/kirill/` and `/yangi/`. Check headings, body, quotes and the FAQ for fallback-font boxes or mismatched glyphs (ў қ ғ ҳ ş ç ğ ö).
- [ ] **Step 3: Commit** `git commit -am "style: cyrillic and extended-latin fonts"`

---

### Task 14: Golden-set check and launch (ship checkpoint 2)

**Files:**
- Create: `scripts/golden-set.ts` (exports 300 sentences from published posts as a CSV of latn / cyrl / yangi), `docs/launch-checklist-alphabets.md`

- [ ] **Step 1: Generate the golden set**
Run: `npx tsx scripts/golden-set.ts > golden.csv`
Expected: 300 rows.
- [ ] **Step 2: Jurabek reviews the Cyrillic column (≈2 h).** Every wrong word becomes an exception or a protected word in Admin → Alifbolar.
- [ ] **Step 3: Full test suite + type check**
Run: `npm test && npm run lint`
Expected: PASS.
- [ ] **Step 4: Preview deploy with `ALPHABETS_ENABLED=true`, then check:**
  - `curl` 3 posts × 3 alphabets: lang, canonical, hreflang (none on yangi), body text in the right alphabet
  - `/sitemap.xml` passes an XML validator
  - `/kirill/admin` and `/yangi/api/posts` aren't rendered as pages
  - the switcher keeps you on the same post
- [ ] **Step 5: Production deploy.** Then:
  - GSC: submit `/sitemap.xml`; URL Inspection on one post per alphabet
  - Yandex Webmaster: submit the sitemaps; "Check page" on one Cyrillic post
  - GA4: register `alphabet` as a custom dimension
- [ ] **Step 6: Calendar a 4-week review**
  - Indexed count per sitemap
  - GSC queries filtered by page `/kirill/` and `/yangi/`
  - "Duplicate, Google chose different canonical" on `/yangi/`; if it's widespread, switch "Yangi lotin sahifalarini indekslash" off, per spec §5.3
- [ ] **Step 7: Commit** `git commit -am "chore: golden set script and launch checklist"`
