import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import type { FaqItem, PostSeo, TermSeo } from '@/lib/types'

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' })

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull().default(''),
  passwordHash: text('password_hash').notNull(),
  /** administrator | editor | author */
  role: text('role').notNull().default('administrator'),
  failedLogins: integer('failed_logins').notNull().default(0),
  lockedUntil: ts('locked_until'),
  /** Bumped on password change / "log out everywhere" to invalidate sessions. */
  sessionVersion: integer('session_version').notNull().default(1),
  lastLoginAt: ts('last_login_at'),
  createdAt: ts('created_at').notNull().defaultNow(),
})

export const media = pgTable(
  'media',
  {
    id: serial('id').primaryKey(),
    url: text('url').notNull(),
    /** Storage key (Vercel Blob pathname or local path). */
    pathname: text('pathname').notNull().default(''),
    filename: text('filename').notNull().default(''),
    mimeType: text('mime_type').notNull().default('application/octet-stream'),
    size: integer('size').notNull().default(0),
    width: integer('width'),
    height: integer('height'),
    alt: text('alt').notNull().default(''),
    title: text('title').notNull().default(''),
    caption: text('caption').notNull().default(''),
    /** Original WordPress URL, so /wp-content/uploads/... links keep working. */
    legacyUrl: text('legacy_url'),
    uploadedBy: integer('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('media_legacy_url_idx').on(t.legacyUrl), index('media_url_idx').on(t.url)],
)

export const posts = pgTable(
  'posts',
  {
    id: serial('id').primaryKey(),
    /** post | page */
    type: text('type').notNull().default('post'),
    /** draft | pending | publish | trash  (publish + future date = scheduled) */
    status: text('status').notNull().default('draft'),
    title: text('title').notNull().default(''),
    slug: text('slug').notNull(),
    content: text('content').notNull().default(''),
    excerpt: text('excerpt').notNull().default(''),
    authorId: integer('author_id').references(() => users.id, { onDelete: 'set null' }),
    featuredImageId: integer('featured_image_id').references(() => media.id, { onDelete: 'set null' }),
    /** "Sticky" in WordPress — shown as the featured post on the homepage. */
    sticky: boolean('sticky').notNull().default(false),
    /** Pages: default | about | full-width */
    template: text('template').notNull().default('default'),
    parentId: integer('parent_id'),
    menuOrder: integer('menu_order').notNull().default(0),
    primaryCategoryId: integer('primary_category_id'),
    seo: jsonb('seo').$type<PostSeo>().notNull().default({}),
    faq: jsonb('faq').$type<FaqItem[]>().notNull().default([]),
    seoScore: integer('seo_score'),
    readabilityScore: integer('readability_score'),
    wordCount: integer('word_count').notNull().default(0),
    /** Status before trashing, restored on "Restore". */
    previousStatus: text('previous_status'),
    wpId: integer('wp_id'),
    publishedAt: ts('published_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('posts_slug_idx').on(t.slug),
    index('posts_listing_idx').on(t.type, t.status, t.publishedAt),
    index('posts_wp_id_idx').on(t.wpId),
  ],
)

export const terms = pgTable(
  'terms',
  {
    id: serial('id').primaryKey(),
    /** category | tag */
    taxonomy: text('taxonomy').notNull(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description').notNull().default(''),
    parentId: integer('parent_id'),
    seo: jsonb('seo').$type<TermSeo>().notNull().default({}),
    wpId: integer('wp_id'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('terms_taxonomy_slug_idx').on(t.taxonomy, t.slug)],
)

export const postTerms = pgTable(
  'post_terms',
  {
    postId: integer('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    termId: integer('term_id')
      .notNull()
      .references(() => terms.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.termId] }), index('post_terms_term_idx').on(t.termId)],
)

export const revisions = pgTable(
  'revisions',
  {
    id: serial('id').primaryKey(),
    postId: integer('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default(''),
    content: text('content').notNull().default(''),
    excerpt: text('excerpt').notNull().default(''),
    authorId: integer('author_id').references(() => users.id, { onDelete: 'set null' }),
    /** revision | preview (unsaved changes shown by "Preview changes") */
    kind: text('kind').notNull().default('revision'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('revisions_post_idx').on(t.postId, t.createdAt)],
)

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
})

export const redirects = pgTable('redirects', {
  id: serial('id').primaryKey(),
  /** Path starting with "/", stored without trailing slash (except "/"). */
  source: text('source').notNull().unique(),
  /** Absolute URL or path. Empty for 410 Gone. */
  target: text('target').notNull().default(''),
  /** 301 | 302 | 307 | 410 */
  statusCode: integer('status_code').notNull().default(301),
  hits: integer('hits').notNull().default(0),
  lastHitAt: ts('last_hit_at'),
  note: text('note').notNull().default(''),
  createdAt: ts('created_at').notNull().defaultNow(),
})

export type UserRow = typeof users.$inferSelect
export type MediaRow = typeof media.$inferSelect
export type PostRow = typeof posts.$inferSelect
export type TermRow = typeof terms.$inferSelect
export type RedirectRow = typeof redirects.$inferSelect
export type RevisionRow = typeof revisions.$inferSelect
