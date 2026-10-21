import { notFound } from 'next/navigation'
import { and, ne, sql } from 'drizzle-orm'
import { can, requireUser } from '@/lib/auth'
import { getDb, schema } from '@/lib/db'
import { getSettings, resolveSiteUrl } from '@/lib/data/settings'
import { adminGetPost, adminPagesForParent, adminTerms } from '@/lib/data/admin'
import { storageKind } from '@/lib/storage'
import type { AllSettings } from '@/lib/settings-defaults'
import { PostEditor, type EditorInitial } from './PostEditor'
import type { SeoSiteSettings } from './SeoPanel'

export function seoSiteSettings(settings: AllSettings, kind: 'post' | 'page' | 'category' | 'tag'): SeoSiteSettings {
  const s = settings.seo
  return {
    siteName: settings.general.siteName,
    tagline: settings.general.tagline,
    separator: s.separator,
    siteUrl: resolveSiteUrl(settings),
    titleTemplate: s.titles[kind],
    descTemplate: s.descriptions[kind],
    language: s.analysisLanguage,
    pageTypeDefault: s.schema.pageType,
    articleTypeDefault: s.schema.articleType,
    noindexDefault: s.noindex[kind],
    defaultOgImage: s.social.defaultOgImage,
    faviconUrl: settings.general.faviconUrl,
  }
}

export async function EditorScreen({ type, id }: { type: 'post' | 'page'; id?: number }) {
  const user = await requireUser(type === 'page' ? 'edit_others' : undefined)
  const settings = await getSettings()
  const db = getDb()

  let initial: EditorInitial
  if (id) {
    const data = await adminGetPost(id)
    if (!data || data.post.type !== type) notFound()
    if (!can(user, 'edit_others') && data.post.authorId !== user.id) notFound()
    const p = data.post
    initial = {
      id: p.id,
      type,
      title: p.title,
      slug: p.slug,
      content: p.content,
      excerpt: p.excerpt,
      status: p.status as EditorInitial['status'],
      publishedAt: p.publishedAt?.toISOString() ?? null,
      updatedAt: p.updatedAt.toISOString(),
      sticky: p.sticky,
      template: (p.template as EditorInitial['template']) || 'default',
      parentId: p.parentId,
      menuOrder: p.menuOrder,
      categoryIds: data.categoryIds,
      tagNames: data.tagNames,
      primaryCategoryId: p.primaryCategoryId,
      featuredImage: data.featuredImage,
      seo: p.seo ?? {},
      faq: p.faq ?? [],
      seoScore: p.seoScore,
      readabilityScore: p.readabilityScore,
    }
  } else {
    initial = {
      type,
      title: '',
      slug: '',
      content: '',
      excerpt: '',
      status: 'draft',
      publishedAt: null,
      updatedAt: null,
      sticky: false,
      template: 'default',
      parentId: null,
      menuOrder: 0,
      categoryIds: [],
      tagNames: [],
      primaryCategoryId: null,
      featuredImage: null,
      seo: {},
      faq: [],
      seoScore: null,
      readabilityScore: null,
    }
  }

  const [categories, tags, parents, kpRows] = await Promise.all([
    type === 'post' ? adminTerms('category') : Promise.resolve([]),
    type === 'post' ? adminTerms('tag') : Promise.resolve([]),
    type === 'page' ? adminPagesForParent(id) : Promise.resolve([]),
    db
      .select({ kp: sql<string>`${schema.posts.seo}->>'focusKeyphrase'` })
      .from(schema.posts)
      .where(and(ne(schema.posts.status, 'trash'), id ? ne(schema.posts.id, id) : sql`true`, sql`coalesce(${schema.posts.seo}->>'focusKeyphrase', '') <> ''`)),
  ])

  return (
    <PostEditor
      initial={initial}
      categories={categories}
      allTags={tags.sort((a, b) => b.count - a.count).map((t) => t.name)}
      parents={parents}
      site={seoSiteSettings(settings, type)}
      siteUrl={resolveSiteUrl(settings)}
      usedKeyphrases={kpRows.map((r) => r.kp)}
      storage={storageKind()}
      canPublish={can(user, 'publish')}
    />
  )
}
