# jurabek.blog in three alphabets: design (Next.js)

Status: decisions approved 12 Nov 2026; this revision re-targets the live code (branch `nextjs-migration`, Next.js 16) · supersedes the Vite-based draft.

## 1. Goal

Every public page is available in three alphabets: home, blog archive and pagination, posts, pages (e.g. "Men haqimda"), category/tag archives, search, 404, header/footer menus, sidebar widgets, SEO tags, sitemaps and feed.

| Version | URL | Example | Source |
|---|---|---|---|
| Current Latin (1995) | `/…` (unchanged) | o'zbek, shahar | Written by the author |
| Cyrillic | `/kirill/…` | ўзбек, шаҳар | Generated |
| New Latin (2026 reform) | `/yangi/…` | özbek, şahar | Generated |

**Success criteria:**
- A Cyrillic search lands on the Cyrillic page, a new-Latin search lands on the new-Latin page, and a Latin search lands on the Latin page.
- Current URLs and rankings are unaffected.
- The author writes each post once.

## 2. Decisions (approved 12 Nov 2026)

| # | Decision |
|---|---|
| 1 | Prefixes `/kirill/` and `/yangi/`; current Latin stays at the root |
| 2 | Switcher labels **O'zbek · Ўзбек · Özbek** |
| 3 | New Latin indexed from launch (admin switch can turn it off) |
| 4 | ц in loanwords → `s` in new Latin |
| 5 | No framework migration (Next.js already server-renders, so nothing to add here) |

## 3. Current code (branch `nextjs-migration`)

- Next.js 16 App Router, with ISR (`revalidate = 3600`) and `revalidateSite()` called on every admin change.
- Content is HTML (TipTap editor) stored in Postgres via Drizzle. Yoast-style SEO: templates in `settings.seo`, per-post overrides, `resolveSeo()` → `toMetadata()`, `buildGraph()` for JSON-LD.
- `trailingSlash: true`. Posts and pages live at `/{slug}/`, archives at `/blog/`, `/blog/page/N/`, `/category/{path}/`, `/tag/{slug}/`, and search at `/search/?q=`.
- Sitemaps are Yoast-style: `/sitemap_index.xml` → `post-`, `page-`, `category-` and `post_tag-sitemap.xml`.
- Interface text is in `src/lib/i18n.ts` (`t`). Menus and appearance strings come from settings.
- Self-hosted fonts already include the `cyrillic` and `latin-ext` subsets. OG images (`/og`) load only Latin font files.

## 4. Architecture

### 4.1 Transliteration library (`src/lib/translit/`)
Ported from the first implementation (rules, defaults, tests):
- Rules: current Latin → Cyrillic and current Latin → new Latin; apostrophe normalisation; protected words; acronyms; foreign-letter words; exceptions dictionary (exact match, then longest prefix ≥4 characters); search normaliser (any alphabet → current Latin).
- **New `transliterateHtml(html, script, cfg)`:** converts text nodes and the `alt`/`title` attributes. It skips `<code>`, `<pre>`, `<script>`, `<style>` and `<kbd>`, every other attribute (`href`, `src`, `class`, `id`…), and entities.

### 4.2 Routing: three root layouts
Each alphabet gets its own root layout, so `<html lang>` is correct in static HTML without making pages dynamic:
- `app/(latn)/…`: the existing public routes, moved unchanged (same URLs). Root layout `<html lang="uz-Latn">`.
- `app/(cyrl)/kirill/…`: the same route files, rendering with `script = 'cyrl'`. Root layout `<html lang="uz-Cyrl">`.
- `app/(yangi)/yangi/…`: the same for new Latin. `<html lang="uz-Latn">`.
- `app/admin/…` gets its own root layout. Route handlers (sitemaps, feed, og, robots, llms) need none.

Page logic moves from `page.tsx` files into shared view modules (`src/views/*.tsx`) that take `script`. Each alphabet's `page.tsx` is a 5-line wrapper, so the three trees can't drift apart. Switching alphabet crosses root layouts, which means a full page load; that's acceptable.

### 4.3 Content and chrome
- **Data:** `localizePost`, `localizeSummary` and `localizeTerm` transliterate title, excerpt, HTML content, SEO title/description, FAQ, image alt, and category/tag names. Slugs, paths, ids and dates never change. Memoised by id + `updatedAt` + script + dictionary version.
- **Interface text:** `getT(script, cfg)` returns the `t` object transliterated (functions wrapped).
- **Settings strings** (site name, tagline, menus, appearance text, home content) are transliterated with the same helpers.
- **Internal links:** `withScript(script, href)` prefixes site-relative URLs; external, `/admin`, `/uploads`, `/feed` and `#` links are left alone. Menus, breadcrumbs, cards, pagination, prev/next, tags and the search form all use it.
- **Switcher:** O'zbek · Ўзбек · Özbek in the header (desktop and mobile), linking to the same path in the other alphabet. It sets the `jb_script` cookie. **No automatic redirects.**
- **Search:** the `/kirill/search/?q=` query goes through `normalizeForSearch` before the SQL `ILIKE`, so Cyrillic and new-Latin queries find posts. Results are shown in the page's alphabet.

## 5. SEO setup

### 5.1 Principle
Each alphabet is its own server-rendered, indexable URL with its text in that alphabet. Search engines match the query's characters against that text; tags support the match.

### 5.2 Per page
- **`<html lang>`:** `uz-Latn` / `uz-Cyrl` / `uz-Latn`.
- **Title, description, OG and Twitter:** the Yoast templates are resolved first, then transliterated, so post overrides keep working.
- **Canonical:** self-referencing in each alphabet (`https://www.jurabek.blog/kirill/{slug}/`). If a Latin post has a custom canonical pointing elsewhere, its Cyrillic and new-Latin versions are `noindex, follow` and keep their self-canonical.
- **hreflang** (via `alternates.languages`) on Latin and Cyrillic pages:
  - `uz-Latn` → root URL
  - `uz-Cyrl` → `/kirill/` URL
  - `x-default` → root URL
- **New Latin:** a self-canonical, **no hreflang**, and the other versions don't list it. `index, follow` unless the admin switch is off. The 404 and search pages keep their existing noindex rules.
- **JSON-LD:** strings in the page's alphabet; `inLanguage` set; `url`/`@id` = canonical.

### 5.3 Sitemaps and feeds
- `sitemap_index.xml` also lists `kirill-post-sitemap.xml`, `kirill-page-sitemap.xml`, `kirill-category-sitemap.xml`, `kirill-post_tag-sitemap.xml` and the `yangi-…` equivalents.
- The same indexability rules apply. Latin and Cyrillic entries carry `xhtml:link` hreflang pairs; new-Latin entries don't.
- Feeds: `/kirill/feed/` and `/yangi/feed/`, with `<language>` set.
- `revalidateSite()` also refreshes the new routes and sitemaps.

### 5.4 Risk accepted with decision 3
Google may treat `/yangi/` pages as duplicates of the current Latin ones. Each has a self-canonical and its own sitemap, and there's a 4–6 week GSC review. The admin switch sets `/yangi/` to noindex if needed.

## 6. Admin
- New settings group `alphabets` (no migration needed: settings are JSON merged over defaults): `exceptions`, `protectedWords`, `indexNewLatin`, edited in Settings → Alifbolar.
- Saving it triggers `revalidateSite()`.

## 7. Analytics
- GA4: `alphabet` page parameter in the config call, and a `switch_alphabet` event.
- Yandex Metrika: `params({alphabet})`.

## 8. Out of scope (v1)
`llms.txt` stays Latin. Draft preview is Latin only (published variants can be checked at their URLs). Per-post manual overrides of the generated text: fixes go through the exceptions dictionary.

## 9. Effort
About 7–8 dev days. The transliteration library carries over, and no server rendering work is needed.
