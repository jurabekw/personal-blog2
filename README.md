# Jurabek Blog — Next.js

The WordPress theme **Jurabek Blog v1.5.6** rebuilt in **Next.js 16**, with a WordPress-style admin panel and Yoast-style SEO built in. Public pages are pre-rendered static HTML served from Vercel's CDN; edits in the admin refresh the affected pages instantly.

| | |
|---|---|
| Public site | Same design, same Uzbek texts, same URLs as WordPress (`/post-slug/`, `/blog/page/2/`, `/category/parent/child/`, `/tag/x/`, `/feed/`, `/sitemap_index.xml`) |
| Admin | `/admin` — Dashboard, Posts, Pages, Media, Categories, Tags, Menus, Customize, SEO, Users, Settings, Import |
| Speed | Lighthouse mobile: Performance 97–99, SEO 100, Best Practices 100, CLS 0 |
| Stack | Next.js 16 (App Router, ISR), React 19, Postgres + Drizzle ORM, Vercel Blob, TipTap editor |

---

## Go live in 9 steps (Vercel)

1. **Create the project** — Vercel → *Add New → Project* → import `jurabekw/personal-blog2`, choose the **`nextjs-migration`** branch. Framework: Next.js (auto). Don't deploy yet if Vercel offers; continue below.
2. **Database** — *Storage → Create Database → Neon (Postgres)* → connect to the project. This adds `DATABASE_URL` automatically. (Supabase or any Postgres also works: paste its **pooled** connection string as `DATABASE_URL`.)
3. **Image storage** — *Storage → Create → Blob* → connect to the project (adds `BLOB_READ_WRITE_TOKEN`).
4. **Environment variables** — *Settings → Environment Variables* (Production + Preview):
   - `AUTH_SECRET` — a long random string (e.g. from `openssl rand -base64 48`)
   - `ADMIN_EMAIL` — your login email
   - `ADMIN_PASSWORD` — a strong password (change it later in *Admin → Profile*)
   - `NEXT_PUBLIC_SITE_URL` — `https://www.jurabek.blog`
5. **Deploy** (or *Redeploy*). The build creates the database tables and your admin account automatically.
6. **Import** — open `https://<your-project>.vercel.app/admin`, log in, go to **Import → Start import**. Posts, pages, categories, tags, images and Yoast data come over from the live WordPress site. For focus keyphrases too, also import a WordPress export file (*Tools → Export → All content*) in the second tab.
7. **Review** — check posts, *Customize* (author photo, hero texts), *SEO → Settings* (verification codes, GA4/Yandex Metrica), *Menus*.
8. **Switch the domain** — Vercel *Settings → Domains* → add `www.jurabek.blog` and `jurabek.blog`, then change the DNS records at your registrar as Vercel shows. In *Admin → Settings → General* set Site Address to `https://www.jurabek.blog`.
9. **Tell Google** — Search Console: the sitemap URL (`/sitemap_index.xml`) is unchanged; click *Resubmit*. Use URL Inspection on 2–3 posts. Do the same in Yandex Webmaster.

> Until step 8 the WordPress site stays live and untouched. Keep it running for a couple of days after switching DNS, then cancel the old hosting.

---

## What the admin can do

**Writing** — rich editor (headings, lists, links, quotes, code, tables, images from the media library, YouTube, the theme's copy box, HTML source mode), autosave backup, Ctrl/Cmd + S, revisions with restore, drafts / pending review / scheduled publishing, preview of drafts and unsaved changes, featured ("sticky") post, categories with parents and primary category, tags, featured image, excerpt, FAQ block (adds FAQPage rich results).

**SEO (Yoast equivalent)** on every post, page, category and tag:
- Focus keyphrase, SEO title & meta description with `%%title%% %%sep%% %%sitename%%` variables, Google preview (mobile/desktop) with length meters
- SEO analysis (keyphrase in title/intro/slug/subheadings/meta/alt text, density, text length, links, images, previously used keyphrase…) and readability analysis (sentence & paragraph length, subheading distribution, transition words in Uzbek/Russian/English). Uzbek word forms are recognised (`marketing` ↔ `marketingni`).
- Cornerstone content, schema page/article type, Facebook & X previews with custom title/description/image, noindex/nofollow/noimageindex/noarchive/nosnippet, canonical URL, breadcrumb title
- SEO list filters and coloured score dots in Posts, dashboard SEO overview, bulk editor, recalculate scores

**Site-wide SEO** — title templates per type, separator, site representation (Person/Organization) and social profiles for the knowledge graph, Google/Yandex/Bing verification, breadcrumbs, XML sitemaps with images (same Yoast URLs), RSS with anti-scraper footer, robots.txt editor, **llms.txt** for AI assistants, GA4 / GTM / Yandex Metrica, custom head/body code, **redirect manager** (301/302/307/410, wildcards, CSV import, hit counter; created automatically when a published URL changes).

**Generated automatically** — canonical, Open Graph & X tags, JSON-LD graph (WebSite + SearchAction, Person/Organization, WebPage, Article/BlogPosting, BreadcrumbList, ImageObject, FAQPage, CollectionPage), branded share images (`/og/`) when a post has no image, `og:locale uz_UZ`.

**Old WordPress links keep working** — `/?p=123`, `/?page_id=`, `/?s=`, `/wp-admin/`, `/wp-login.php`, `/sitemap.xml`, `/author/…`, `/post/amp/`, `/post/feed/`, `/category/child/` and `/wp-content/uploads/…-300x200.jpg` image URLs all redirect to the right place.

---

## Local development

```bash
cp .env.example .env.local      # set DATABASE_URL (local Postgres) and AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm install
npm run db:migrate              # creates tables + first admin
npm run dev                     # http://localhost:3000  (admin: /admin)
npm test                        # unit tests (content pipeline + SEO analysis)
```

Without `BLOB_READ_WRITE_TOKEN`, uploads are stored in `.uploads/` and served from `/uploads/…` (also works for self-hosting on a VPS).

## Project structure

```
src/app/(site)/          public pages (home, blog, [slug], category, tag, search, 404, draft preview)
src/app/admin/           admin panel (login + (panel)/… screens) and server actions in _actions/
src/app/*.xml, feed, robots.txt, llms.txt, og, uploads   SEO & utility routes
src/components/site/     theme components (header, footer, sidebar widgets, cards, article)
src/components/admin/    editor, SEO box, media library, settings screens, importer UI
src/lib/db/              Drizzle schema + connection        drizzle/  SQL migrations
src/lib/data/            queries (posts, terms, settings, redirects)
src/lib/seo/             templates, metadata, JSON-LD, sitemaps, content analysis
src/lib/content/         sanitizing, rendering (TOC ids, copy boxes, responsive images)
src/lib/import/          WordPress REST + WXR importers
src/styles/theme.css     the WordPress theme's style.css, unchanged
```

## Notes

- Scheduled posts go live within an hour of their time (pages refresh hourly; any save refreshes immediately).
- Accessibility scores 96: the remaining items are colour-contrast warnings from the original palette (green `#1cca59` buttons with white text, light grey captions). Darkening the green in *Customize → Brand* fixes them if you want.
- Database changes: edit `src/lib/db/schema.ts`, run `npm run db:generate`; migrations run automatically on every deploy.
