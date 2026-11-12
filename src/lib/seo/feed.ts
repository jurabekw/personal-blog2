import 'server-only'
import type { AllSettings } from '@/lib/settings-defaults'
import { getAllPublished, type PostFull } from '@/lib/data/posts'
import { getSettings, resolveSiteUrl } from '@/lib/data/settings'
import { renderContent } from '@/lib/content/render'
import { scriptContentLinks } from '@/lib/content/links'
import { escapeHtml } from '@/lib/content/text'
import { HTML_LANG, SCRIPT_PREFIX, type Script } from '@/lib/script'
import { getTranslitConfig, transliterateHtml, transliterateText } from '@/lib/translit'
import { localizeTerm } from '@/lib/localize'
import { replaceVars } from './templates'
import { abs, isCustomCanonical, pageUrl } from './resolve'

const cdata = (s: string) => `<![CDATA[${s.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`

/**
 * Posts that go in the feed of `script`: noindex posts never do; the alphabet versions also
 * leave out custom-canonical posts (their pages are noindex there).
 */
export function feedPosts(posts: PostFull[], siteUrl: string, script: Script): PostFull[] {
  return posts.filter(
    (p) => p.seo.robotsIndex !== 'noindex' && (script === 'latn' || !isCustomCanonical(p.seo?.canonical, `${siteUrl}${p.path}`, siteUrl)),
  )
}

/**
 * RSS 2.0 for one alphabet (with the Yoast RSS before/after text). Latin output is the original
 * /feed/. Variants: links point into the alphabet's tree, text is transliterated and the
 * before/after templates are resolved in Latin (with alphabet links), then transliterated.
 */
export function buildFeedXml(all: PostFull[], settings: AllSettings, siteUrl: string, script: Script = 'latn'): string {
  const { general, seo } = settings
  const reading = settings.reading
  const cfg = script === 'latn' ? null : getTranslitConfig(settings.alphabets)
  const tx = (v: string) => (cfg && v ? transliterateText(v, script, cfg) : v)
  const txHtml = (v: string) => (cfg && v ? transliterateHtml(v, script, cfg) : v)
  const siteName = tx(general.siteName)
  const author = tx(settings.appearance.author.name)
  const home = pageUrl(siteUrl, script, '/')
  const posts = feedPosts(all, siteUrl, script).slice(0, Math.max(1, reading.feedItems))

  const items = posts
    .map((p) => {
      const url = pageUrl(siteUrl, script, p.path)
      // Template variables carry Latin text (transliterated with the rest of the output).
      const vars = {
        POSTLINK: `<a href="${url}">${escapeHtml(p.title)}</a>`,
        BLOGLINK: `<a href="${home}">${escapeHtml(general.siteName)}</a>`,
        BLOGDESCLINK: `<a href="${home}">${escapeHtml(general.siteName)} - ${escapeHtml(general.tagline)}</a>`,
        AUTHORLINK: escapeHtml(settings.appearance.author.name),
      }
      const fill = (tpl: string) =>
        tpl ? txHtml(`<p>${replaceVars(tpl.replace(/%%(POSTLINK|BLOGLINK|BLOGDESCLINK|AUTHORLINK)%%/g, (_m, k: keyof typeof vars) => vars[k]), { sitename: general.siteName, sep: seo.separator, title: p.title })}</p>`) : ''
      const title = tx(p.title)
      const excerpt = tx(p.excerpt)
      const body = reading.feedSummaryOnly
        ? `<p>${escapeHtml(excerpt)}</p>`
        : scriptContentLinks(txHtml(renderContent(p.content).html), script, siteUrl)
      const html = fill(seo.rss.before) + body + fill(seo.rss.after)
      const image = p.image ? abs(siteUrl, p.image.url) : ''
      const term = (t: PostFull['categories'][number]) => (cfg ? localizeTerm(t, script, cfg).name : t.name)
      return [
        '\t\t<item>',
        `\t\t\t<title>${escapeHtml(title)}</title>`,
        `\t\t\t<link>${url}</link>`,
        `\t\t\t<dc:creator>${cdata(author)}</dc:creator>`,
        `\t\t\t<pubDate>${p.publishedAt.toUTCString()}</pubDate>`,
        ...p.categories.map((c) => `\t\t\t<category>${cdata(term(c))}</category>`),
        ...p.tags.map((c) => `\t\t\t<category>${cdata(term(c))}</category>`),
        `\t\t\t<guid isPermaLink="true">${url}</guid>`,
        `\t\t\t<description>${cdata(excerpt)}</description>`,
        `\t\t\t<content:encoded>${cdata(html)}</content:encoded>`,
        image ? `\t\t\t<media:content url="${escapeHtml(image)}" medium="image" />` : '',
        '\t\t</item>',
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n')

  const language = script === 'latn' ? general.language : HTML_LANG[script]
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
\t<channel>
\t\t<title>${escapeHtml(siteName)}</title>
\t\t<atom:link href="${siteUrl}${SCRIPT_PREFIX[script]}/feed/" rel="self" type="application/rss+xml" />
\t\t<link>${home}</link>
\t\t<description>${escapeHtml(tx(general.tagline))}</description>
\t\t<lastBuildDate>${(posts[0]?.updatedAt ?? new Date()).toUTCString()}</lastBuildDate>
\t\t<language>${escapeHtml(language)}</language>
\t\t<generator>Next.js</generator>
${items}
\t</channel>
</rss>
`
}

/** GET handler body for /feed/, /kirill/feed/ and /yangi/feed/. */
export async function feedResponse(script: Script): Promise<Response> {
  const settings = await getSettings()
  const siteUrl = resolveSiteUrl(settings)
  const n = Math.max(1, settings.reading.feedItems)
  // Variants leave out custom-canonical posts: read a few more so the feed still has n items.
  const posts = await getAllPublished('post', script === 'latn' ? n : n + 20)
  return new Response(buildFeedXml(posts, settings, siteUrl, script), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=UTF-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
