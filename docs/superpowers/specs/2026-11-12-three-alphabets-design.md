# jurabek.blog in three alphabets: design

Status: **approved 12 Nov 2026** · Repo: jurabekw/personal-blog2

## 1. Goal

Every public page (home, blog archive, posts, contact, menus, widgets, search, footer, SEO tags) is available in three alphabets:

| Version | Example | Status |
|---|---|---|
| Current Latin (1995) | o'zbek, shahar, choy | Source of truth. Posts are written in this |
| Cyrillic | ўзбек, шаҳар, чой | Generated automatically |
| New Latin (2026 reform, law OʻRQ-1184, in force 22 April 2027) | özbek, şahar, çoy | Generated automatically |

**Success criteria:** a reader searching in Cyrillic lands on the Cyrillic page, a reader searching in Latin lands on the Latin page, a reader searching in new Latin lands on the new-Latin page, current Google rankings are unaffected, and the author keeps writing each post once.

## 2. Decisions (12 Nov 2026)

| # | Decision |
|---|---|
| 1 | URL prefixes: `/kirill/` (Cyrillic), `/yangi/` (new Latin). Current Latin stays at the root |
| 2 | Switcher labels: **O'zbek · Ўзбек · Özbek** |
| 3 | **New Latin is indexed from launch** (not held back until April 2027) |
| 4 | ц in loanwords is written **s** in new Latin (aksiya) |
| 5 | Server-side rendering inside the current Express app, no Next.js migration |

Two implementation simplifications against the first draft:
- **No `post_variants` table.** Transliterating a post takes milliseconds, so it happens at request time with an in-memory cache keyed by post id + `updatedAt` + dictionary version, plus CDN caching. A dictionary fix applies everywhere immediately, and there's no regeneration or cron step.
- **Server-rendered HTML, client takes over.** The server puts full head tags and a static, server-rendered version of the page body into `#root`. The React app then mounts as today (`createRoot`) and replaces it with identical content. Full hydration would need every component to be server-safe (the app reads `window` and `localStorage` during render), which is more risk for no SEO gain.

## 3. Current state (repo review)

- Vite + React single-page app with an Express API, deployed on Vercel. `vercel.json` sends every page URL to the static `index.html`. `server.ts` already injects meta tags, but only in the standalone Node server, which is not used on Vercel.
- `SEOHead.tsx` sets title, meta, canonical and JSON-LD in the browser only.
- Bugs to fix along the way: canonical = `window.location.href` (query strings leak into it); the WebSite schema falls back to `https://jurabek.dev`; `<html lang="en">`; the default meta text in `index.html` describes a different blog; the sitemap/robots use `req.protocol`, which can produce `http://` behind Vercel.

## 4. Architecture

### 4.1 Transliteration engine (`src/lib/translit/`)
Shared by server and browser. Pure functions, no I/O.

- **Text only:** markdown is walked line by line. Fenced code blocks, inline code, link and image URLs, HTML tags and bare URLs are passed through untouched.
- **Word-level rules:**
  - **Keep in Latin:** protected words (case-insensitive list, editable in the admin), all-caps acronyms of 2+ letters (SEO, GA4), and words with letters outside the Uzbek alphabet (`c` not part of `ch`, `w`).
- **Apostrophes:** ' ` ‘ ’ ʻ ʼ are normalised. After o/O/g/G they form the letters oʻ/gʻ. Anywhere else they are the tutuq belgisi.
- **Current Latin → new Latin:**
  - sh→ş, ch→ç, oʻ→ö, gʻ→ğ (Sh/SH→Ş, Ch/CH→Ç, Oʻ→Ö, Gʻ→Ğ)
  - ng unchanged
  - s+tutuq+h (Is'hoq) → sh (Ishoq)
  - any other tutuq → ʼ (U+02BC)
- **Current Latin → Cyrillic:**
  - oʻ→ў, gʻ→ғ (applied before the y-rules, so yoʻl → йўл)
  - sh→ш, ch→ч
  - ye→е, yo→ё, yu→ю, ya→я
  - e → э at the start of a word or after a vowel, otherwise е
  - q→қ, h→ҳ, x→х, j→ж, y→й, and the remaining letters one to one
  - tutuq → ъ, except between s and h, where it is dropped (Is'hoq → Исҳоқ)
  - case is preserved (first-letter capital, ALL CAPS)
- **Exceptions dictionary** (Latin stem → Cyrillic stem, editable in the admin): the longest key that is a prefix of the word wins, and the rest of the word goes through the rules (sentabrda → сентябр + да). It ships with a starter list of common Russian loanwords and the month names.
- **Search normaliser:** any alphabet → current Latin (lowercase), used for search matching only.

### 4.2 URLs
| Version | Home | Archive | Post | Contact |
|---|---|---|---|---|
| Current Latin | `/` | `/blog` | `/blog/{slug}` | `/contact` |
| Cyrillic | `/kirill/` | `/kirill/blog` | `/kirill/blog/{slug}` | `/kirill/contact` |
| New Latin | `/yangi/` | `/yangi/blog` | `/yangi/blog/{slug}` | `/yangi/contact` |

Slugs stay ASCII in every version. Admin stays at `/admin` with no prefix.

### 4.3 Rendering
- Public page routes go to the Vercel function (`api/index.ts`). Static assets (`/assets/*`, favicon) stay on the CDN.
- The function reads the built `dist/index.html` as a template and injects `<html lang>`, the head tags, a JSON bootstrap (`window.__SCRIPT__`, `window.__INITIAL_POST__`) and the server-rendered body.
- `Cache-Control: public, s-maxage=300, stale-while-revalidate=86400`.

### 4.4 Reader experience
- The header switcher (O'zbek · Ўзбек · Özbek, also in the mobile menu) uses real `<a href>` links to the same page in the other alphabet. The choice is stored in the `jb_script` cookie (1 year).
- **No automatic redirects.** A visitor whose cookie differs from the page's alphabet sees a dismissible bar linking to their alphabet's version.
- All internal links stay within the current alphabet.
- **Site search** normalises the query and the post text to current Latin before matching.

## 5. SEO setup

### 5.1 Principle
Search engines match the query's characters against the page's indexed text. Each alphabet is its own server-rendered, indexable URL with its text in that alphabet. Tags support that; they can't replace it.

### 5.2 Head per page (server-rendered)
- `<html lang>`: `uz-Latn`, `uz-Cyrl` or `uz-Latn` (new Latin is still Latin script).
- **Title and description** in the page's alphabet. For posts, `seoTitle`/`seoDescription` are used when set, otherwise title/excerpt.
- **Canonical:** self-referencing, absolute, `https://www.jurabek.blog`, no query string, no trailing slash except the home pages (`/`, `/kirill/`, `/yangi/`).
- **hreflang group** (identical on the Latin and Cyrillic versions):
  - `uz-Latn` → current Latin
  - `uz-Cyrl` → Cyrillic
  - `x-default` → current Latin
- **The new-Latin page** has a self-canonical and `robots: index, follow`, but **no hreflang tags**, and the other versions don't list it. Two URLs in one group can't share `uz-Latn`, and no valid tag tells 2026 Latin apart from 1995 Latin. The new-Latin page relies on its distinct letters (ş/ç/ğ/ö) to match new-Latin queries.
- **Open Graph:** `og:locale` = `uz_UZ`; `og:url` = canonical; title, description and image in the page's alphabet.
- **JSON-LD:** BlogPosting (+ FAQPage) on posts, WebSite on home. `inLanguage` = the page's lang, `@id`/`url` = canonical, site URL `https://www.jurabek.blog`, SearchAction target inside the same alphabet prefix.

### 5.3 Risk accepted with decision 3
Google may group the new-Latin and current-Latin pages as duplicates and index only one ("Duplicate, Google chose different canonical"). Mitigations: self-canonicals, a separate sitemap to track it, and a 4–6 week review of GSC page indexing for `/yangi/`. If Google consistently folds them together, the fallback is an admin switch that sets `/yangi/` to `noindex, follow`.

### 5.4 Google vs Yandex
| | Google | Yandex |
|---|---|---|
| `uz-Latn` / `uz-Cyrl` hreflang | Supported | Only two-letter codes; versions look like "uz" |
| hreflang in sitemap | Supported | Not supported; HTML only |
| What carries the match | Content + hreflang | Content (server-rendered text is essential) |

### 5.5 Sitemaps, robots, RSS
- `/sitemap.xml` → sitemap index of `/sitemap-latn.xml`, `/sitemap-cyrl.xml`, `/sitemap-yangi.xml`.
- Latin and Cyrillic `<url>` entries carry `xhtml:link` hreflang entries matching the HTML (uz-Latn, uz-Cyrl, x-default). New-Latin entries don't.
- `lastmod` = `updatedAt || publishedAt`. Only published posts are listed. All URLs are absolute `https://www.jurabek.blog`.
- `robots.txt`: `Disallow: /admin`; `Sitemap: https://www.jurabek.blog/sitemap.xml`.
- RSS per alphabet: `/rss.xml`, `/kirill/rss.xml`, `/yangi/rss.xml`, each with `<language>` uz-Latn / uz-Cyrl / uz-Latn.

### 5.6 Analytics
- **GA4:** `alphabet` user property and page parameter (latn / cyrl / yangi); `switch_alphabet` event with `from` and `to`.
- **Yandex Metrika:** `params({alphabet})`.

### 5.7 Rollout
1. SSR for current Latin only. Check with GSC URL Inspection and Yandex "Check page".
2. Cyrillic + new Latin live; submit sitemaps in GSC and Yandex Webmaster.
3. Review at 4 weeks: indexed count per sitemap, impressions on Cyrillic and new-Latin queries, duplicate warnings.

## 6. Fonts
- Inter: add the `latin-ext`, `cyrillic` and `cyrillic-ext` subsets.
- Newsreader has no Cyrillic. On `/kirill/` pages, use Source Serif 4 (Cyrillic subset) as the serif. Confirm visually during QA.

## 7. Admin
- **Settings → Alifbolar:** exceptions dictionary (two-column table), protected words (one per line), "Index new Latin" switch (default on).
- **Post editor:** a preview selector (O'zbek / Ўзбек / Özbek) that renders the current draft in the chosen alphabet.

## 8. Effort
About 10–11 dev days.
