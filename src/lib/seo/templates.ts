/**
 * Yoast SEO-compatible snippet variables (isomorphic).
 * Templates imported from Yoast (e.g. "%%title%% %%page%% %%sep%% %%sitename%%") work unchanged.
 */

export interface TemplateContext {
  title?: string
  sitename?: string
  sitedesc?: string
  sep?: string
  excerpt?: string
  category?: string
  primaryCategory?: string
  tag?: string
  termTitle?: string
  termDescription?: string
  searchphrase?: string
  page?: number
  pageTotal?: number
  date?: string
  modified?: string
  author?: string
  focuskw?: string
  blogtitle?: string
  ptSingle?: string
  ptPlural?: string
  /** Text for %%page%% when paged, e.g. (n, total) => "Sahifa 2 / 5" */
  pageLabel?: (page: number, total: number) => string
}

export const TEMPLATE_VARIABLES: { name: string; description: string }[] = [
  { name: '%%title%%', description: 'Post, page or archive title' },
  { name: '%%sitename%%', description: 'Site title' },
  { name: '%%sitedesc%%', description: 'Site tagline' },
  { name: '%%sep%%', description: 'Separator (set in SEO → General)' },
  { name: '%%excerpt%%', description: 'Excerpt (or auto-generated from content)' },
  { name: '%%primary_category%%', description: 'Primary category' },
  { name: '%%category%%', description: 'Categories, comma separated' },
  { name: '%%tag%%', description: 'Tags, comma separated' },
  { name: '%%term_title%%', description: 'Category / tag name (archives)' },
  { name: '%%term_description%%', description: 'Category / tag description (archives)' },
  { name: '%%searchphrase%%', description: 'Search query' },
  { name: '%%page%%', description: '"Sahifa 2 / 5" on paginated pages' },
  { name: '%%date%%', description: 'Publish date' },
  { name: '%%modified%%', description: 'Last modified date' },
  { name: '%%currentyear%%', description: 'Current year' },
  { name: '%%currentmonth%%', description: 'Current month' },
  { name: '%%name%%', description: 'Author name' },
  { name: '%%focuskw%%', description: 'Focus keyphrase' },
]

const UZ_MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
]

export function replaceVars(template: string, ctx: TemplateContext): string {
  if (!template) return ''
  const sep = ctx.sep ?? '-'
  const now = new Date()
  const pageText =
    ctx.page && ctx.page > 1
      ? ctx.pageLabel
        ? ctx.pageLabel(ctx.page, ctx.pageTotal ?? ctx.page)
        : `Sahifa ${ctx.page} / ${ctx.pageTotal ?? ctx.page}`
      : ''
  const map: Record<string, string> = {
    title: ctx.title ?? '',
    sitename: ctx.sitename ?? '',
    sitedesc: ctx.sitedesc ?? '',
    sep,
    excerpt: ctx.excerpt ?? '',
    excerpt_only: ctx.excerpt ?? '',
    category: ctx.category ?? '',
    primary_category: ctx.primaryCategory ?? ctx.category?.split(',')[0]?.trim() ?? '',
    tag: ctx.tag ?? '',
    term_title: ctx.termTitle ?? '',
    term_description: ctx.termDescription ?? '',
    category_description: ctx.termDescription ?? '',
    tag_description: ctx.termDescription ?? '',
    searchphrase: ctx.searchphrase ?? '',
    page: pageText,
    pagenumber: ctx.page && ctx.page > 1 ? String(ctx.page) : '',
    pagetotal: ctx.pageTotal ? String(ctx.pageTotal) : '',
    date: ctx.date ?? '',
    modified: ctx.modified ?? '',
    currentyear: String(now.getFullYear()),
    currentmonth: UZ_MONTHS[now.getMonth()],
    currentday: String(now.getDate()),
    currentdate: `${UZ_MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`,
    name: ctx.author ?? '',
    focuskw: ctx.focuskw ?? '',
    blogtitle: ctx.blogtitle ?? 'Blog',
    pt_single: ctx.ptSingle ?? '',
    pt_plural: ctx.ptPlural ?? '',
  }

  let out = template.replace(/%%([a-z_]+)%%/gi, (_m, key: string) => map[key.toLowerCase()] ?? '')
  out = out.replace(/\s+/g, ' ').trim()
  // Tidy separators left dangling by empty variables ("Title - " / "- - Site").
  if (sep) {
    const s = sep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    out = out
      .replace(new RegExp(`(?:\\s*${s}\\s*){2,}`, 'g'), ` ${sep} `)
      .replace(new RegExp(`^\\s*${s}\\s*|\\s*${s}\\s*$`, 'g'), '')
      .trim()
  }
  return out
}
