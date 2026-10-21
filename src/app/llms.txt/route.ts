import { getSettings, resolveSiteUrl } from '@/lib/data/settings'
import { getAllPublished, getTaxonomies } from '@/lib/data/posts'
import { isPostIndexable, isTermIndexable } from '@/lib/seo/sitemaps'
import { truncate } from '@/lib/content/text'

export const dynamic = 'force-static'
export const revalidate = 3600

/**
 * llms.txt (https://llmstxt.org) — a Markdown map of the site for AI assistants
 * (ChatGPT, Claude, Perplexity…), like Yoast's llms.txt feature. Helps GEO/AEO.
 */
export async function GET() {
  const settings = await getSettings()
  if (!settings.seo.llms.enabled || settings.reading.discourageSearchEngines) {
    return new Response('Not found', { status: 404 })
  }
  const siteUrl = resolveSiteUrl(settings)
  const { general, appearance } = settings
  const [posts, pages, tax] = await Promise.all([getAllPublished('post', 500), getAllPublished('page', 200), getTaxonomies()])
  const line = (title: string, url: string, desc?: string) =>
    `- [${title.replace(/[[\]]/g, '')}](${url})${desc ? `: ${truncate(desc.replace(/\s+/g, ' '), 200)}` : ''}`

  const out: string[] = [`# ${general.siteName}`, '', `> ${general.tagline || appearance.blogIntro}`, '']
  const intro = settings.seo.llms.intro.trim() || `${appearance.author.name} — ${appearance.author.role}. ${appearance.author.bio}`
  out.push(intro, '')

  const indexablePages = pages.filter((p) => isPostIndexable(p, settings, siteUrl))
  if (indexablePages.length) {
    out.push('## Pages', '')
    for (const p of indexablePages) out.push(line(p.title, `${siteUrl}${p.path}`, p.seo.metaDescription || p.excerpt))
    out.push('')
  }

  const indexablePosts = posts.filter((p) => isPostIndexable(p, settings, siteUrl))
  const cornerstone = indexablePosts.filter((p) => p.seo.cornerstone)
  if (cornerstone.length) {
    out.push('## Key articles', '')
    for (const p of cornerstone) out.push(line(p.title, `${siteUrl}${p.path}`, p.seo.metaDescription || p.excerpt))
    out.push('')
  }
  if (indexablePosts.length) {
    out.push('## Posts', '')
    for (const p of indexablePosts.filter((x) => !x.seo.cornerstone)) {
      out.push(line(p.title, `${siteUrl}${p.path}`, p.seo.metaDescription || p.excerpt))
    }
    out.push('')
  }

  const cats = tax.categories.filter((c) => isTermIndexable(c, settings))
  if (cats.length) {
    out.push('## Categories', '')
    for (const c of cats) out.push(line(c.name, `${siteUrl}${c.path}`, c.description))
    out.push('')
  }

  out.push('## Optional', '', line('RSS feed', `${siteUrl}/feed/`), line('XML sitemap', `${siteUrl}/sitemap_index.xml`), '')

  return new Response(out.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=UTF-8', 'Cache-Control': 'public, max-age=0, s-maxage=3600' },
  })
}
