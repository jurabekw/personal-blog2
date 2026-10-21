import type { FaqItem, PageTemplate, PostSeo, PostStatus, PostType, TermSeo } from '@/lib/types'

export interface PostInput {
  id?: number
  type: PostType
  title: string
  slug: string
  content: string
  excerpt: string
  status: Exclude<PostStatus, 'trash'>
  /** ISO string; empty = now on publish. */
  publishedAt: string
  sticky: boolean
  template: PageTemplate
  parentId: number | null
  menuOrder: number
  categoryIds: number[]
  tagNames: string[]
  primaryCategoryId: number | null
  featuredImageId: number | null
  seo: PostSeo
  faq: FaqItem[]
}

export type SaveResult =
  | {
      ok: true
      id: number
      slug: string
      status: string
      publishedAt: string | null
      seoScore: number | null
      readabilityScore: number | null
      savedAt: string
      redirectCreated?: string
    }
  | { ok: false; error: string }

export interface MediaItem {
  id: number
  url: string
  filename: string
  mimeType: string
  size: number
  width: number | null
  height: number | null
  alt: string
  title: string
  caption: string
  createdAt: string
}

export interface TermOption {
  id: number
  name: string
  slug: string
  parentId: number | null
  count: number
  description: string
  seo: TermSeo
}

export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string }
