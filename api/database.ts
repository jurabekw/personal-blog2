import { neon } from '@neondatabase/serverless';
import type { ActivityLog, Category, MediaItem, Post, SiteSettings, Tag } from '../src/types';

export interface DatabaseSchema {
  posts: Post[];
  categories: Category[];
  tags: Tag[];
  media: MediaItem[];
  settings: SiteSettings;
  activity: ActivityLog[];
}

export interface AdminUserRecord {
  id: string;
  username: string;
  passwordHash: string;
}

function getSql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured. Set it to the Neon pooled connection string.');
  }
  return neon(connectionString);
}

function asIso(value: unknown): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function asJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function mapPost(row: Record<string, unknown>): Post {
  return {
    id: String(row.id),
    title: String(row.title),
    slug: String(row.slug),
    excerpt: String(row.excerpt),
    content: String(row.content),
    coverImage: row.cover_image ? String(row.cover_image) : undefined,
    coverImageAlt: row.cover_image_alt ? String(row.cover_image_alt) : undefined,
    status: row.status as Post['status'],
    publishedAt: asIso(row.published_at),
    scheduledAt: asIso(row.scheduled_at),
    createdAt: asIso(row.created_at) || new Date(0).toISOString(),
    updatedAt: asIso(row.updated_at) || new Date(0).toISOString(),
    readingTimeMinutes: Number(row.reading_time_minutes),
    wordCount: Number(row.word_count),
    category: String(row.category),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    isFeatured: Boolean(row.is_featured),
    seoTitle: row.seo_title ? String(row.seo_title) : undefined,
    seoDescription: row.seo_description ? String(row.seo_description) : undefined,
    footnotes: asJson(row.footnotes, []),
    faqs: asJson(row.faqs, []),
    viewsCount: Number(row.views_count || 0)
  };
}

function mapCategory(row: Record<string, unknown>): Category {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    description: row.description ? String(row.description) : undefined,
    count: Number(row.count || 0)
  };
}

function mapTag(row: Record<string, unknown>): Tag {
  return { id: String(row.id), name: String(row.name), slug: String(row.slug) };
}

function mapMedia(row: Record<string, unknown>): MediaItem {
  return {
    id: String(row.id),
    name: String(row.name),
    url: String(row.url),
    altText: String(row.alt_text || ''),
    mimeType: String(row.mime_type),
    sizeBytes: Number(row.size_bytes),
    width: row.width === null || row.width === undefined ? undefined : Number(row.width),
    height: row.height === null || row.height === undefined ? undefined : Number(row.height),
    createdAt: asIso(row.created_at) || new Date(0).toISOString()
  };
}

function mapActivity(row: Record<string, unknown>): ActivityLog {
  return {
    id: String(row.id),
    action: String(row.action),
    details: String(row.details),
    timestamp: asIso(row.created_at) || new Date(0).toISOString(),
    type: row.type as ActivityLog['type']
  };
}

export async function loadDb(): Promise<DatabaseSchema> {
  const sql = getSql();
  const [posts, categories, tags, media, settingsRows, activity] = await Promise.all([
    sql`SELECT id, title, slug, excerpt, content, cover_image, cover_image_alt, status, published_at, scheduled_at, created_at, updated_at, reading_time_minutes, word_count, category, tags, is_featured, seo_title, seo_description, footnotes, faqs, views_count FROM posts ORDER BY COALESCE(published_at, created_at) DESC`,
    sql`SELECT c.id, c.name, c.slug, c.description, COUNT(p.id)::int AS count FROM categories c LEFT JOIN posts p ON LOWER(p.category) = LOWER(c.name) GROUP BY c.id, c.name, c.slug, c.description ORDER BY c.name`,
    sql`SELECT id, name, slug FROM tags ORDER BY name`,
    sql`SELECT id, name, url, alt_text, mime_type, size_bytes, width, height, created_at FROM media ORDER BY created_at DESC`,
    sql`SELECT payload FROM site_settings WHERE singleton = 1`,
    sql`SELECT id, action, details, created_at, type FROM activity_logs ORDER BY created_at DESC`
  ]);

  return {
    posts: (posts as Record<string, unknown>[]).map(mapPost),
    categories: (categories as Record<string, unknown>[]).map(mapCategory),
    tags: (tags as Record<string, unknown>[]).map(mapTag),
    media: (media as Record<string, unknown>[]).map(mapMedia),
    settings: settingsRows.length ? asJson<SiteSettings>((settingsRows[0] as Record<string, unknown>).payload, {} as SiteSettings) : ({} as SiteSettings),
    activity: (activity as Record<string, unknown>[]).map(mapActivity)
  };
}

/**
 * Replaces the small blog snapshot atomically. API routes load, adjust, and write a complete
 * snapshot to preserve the existing API behaviour while moving storage to Neon.
 */
export async function saveDb(db: DatabaseSchema): Promise<void> {
  const sql = getSql();
  const statements = [
    sql`DELETE FROM activity_logs`,
    sql`DELETE FROM media`,
    sql`DELETE FROM posts`,
    sql`DELETE FROM categories`,
    sql`DELETE FROM tags`,
    sql`DELETE FROM site_settings`
  ];

  for (const post of db.posts) {
    statements.push(sql`INSERT INTO posts (id, title, slug, excerpt, content, cover_image, cover_image_alt, status, published_at, scheduled_at, created_at, updated_at, reading_time_minutes, word_count, category, tags, is_featured, seo_title, seo_description, footnotes, faqs, views_count) VALUES (${post.id}, ${post.title}, ${post.slug}, ${post.excerpt}, ${post.content}, ${post.coverImage ?? null}, ${post.coverImageAlt ?? null}, ${post.status}, ${post.publishedAt ?? null}, ${post.scheduledAt ?? null}, ${post.createdAt}, ${post.updatedAt}, ${post.readingTimeMinutes}, ${post.wordCount}, ${post.category}, ${post.tags}, ${post.isFeatured}, ${post.seoTitle ?? null}, ${post.seoDescription ?? null}, ${JSON.stringify(post.footnotes ?? [])}::jsonb, ${JSON.stringify(post.faqs ?? [])}::jsonb, ${post.viewsCount ?? 0})`);
  }
  for (const category of db.categories) {
    statements.push(sql`INSERT INTO categories (id, name, slug, description) VALUES (${category.id}, ${category.name}, ${category.slug}, ${category.description ?? null})`);
  }
  for (const tag of db.tags) {
    statements.push(sql`INSERT INTO tags (id, name, slug) VALUES (${tag.id}, ${tag.name}, ${tag.slug})`);
  }
  for (const item of db.media) {
    statements.push(sql`INSERT INTO media (id, name, url, alt_text, mime_type, size_bytes, width, height, created_at) VALUES (${item.id}, ${item.name}, ${item.url}, ${item.altText}, ${item.mimeType}, ${item.sizeBytes}, ${item.width ?? null}, ${item.height ?? null}, ${item.createdAt})`);
  }
  statements.push(sql`INSERT INTO site_settings (singleton, payload, updated_at) VALUES (1, ${JSON.stringify(db.settings)}::jsonb, NOW())`);
  for (const log of db.activity) {
    const timestampStr = log.timestamp || new Date().toISOString();
    statements.push(sql`INSERT INTO activity_logs (id, action, details, created_at, timestamp, type) VALUES (${log.id}, ${log.action}, ${log.details || ''}, ${timestampStr}, ${timestampStr}, ${log.type})`);
  }

  await sql.transaction(statements);
}

export async function incrementPostViews(postId: string): Promise<void> {
  const sql = getSql();
  await sql`UPDATE posts SET views_count = views_count + 1 WHERE id = ${postId} AND status = 'published'`;
}

export async function publishDuePosts(): Promise<void> {
  const sql = getSql();
  await sql`UPDATE posts SET status = 'published', published_at = COALESCE(published_at, NOW()), updated_at = NOW() WHERE status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= NOW()`;
}

export async function getAdminUser(): Promise<AdminUserRecord | null> {
  const sql = getSql();
  const rows = await sql`SELECT id, username, password_hash FROM admin_users ORDER BY created_at ASC LIMIT 1`;
  if (!rows.length) return null;
  const row = rows[0] as Record<string, unknown>;
  return { id: String(row.id), username: String(row.username), passwordHash: String(row.password_hash) };
}

export async function createAdminUser(username: string, passwordHash: string): Promise<AdminUserRecord> {
  const sql = getSql();
  const id = `admin-${crypto.randomUUID()}`;
  const rows = await sql`INSERT INTO admin_users (id, username, password_hash) VALUES (${id}, ${username}, ${passwordHash}) RETURNING id, username, password_hash`;
  const row = rows[0] as Record<string, unknown>;
  return { id: String(row.id), username: String(row.username), passwordHash: String(row.password_hash) };
}

export async function updateAdminPassword(userId: string, passwordHash: string): Promise<void> {
  const sql = getSql();
  await sql`UPDATE admin_users SET password_hash = ${passwordHash}, updated_at = NOW() WHERE id = ${userId}`;
}

export async function createSession(userId: string, tokenHash: string, expiresAt: string): Promise<void> {
  const sql = getSql();
  await sql`INSERT INTO admin_sessions (token_hash, user_id, expires_at) VALUES (${tokenHash}, ${userId}, ${expiresAt})`;
}

export async function findSessionUser(tokenHash: string): Promise<AdminUserRecord | null> {
  const sql = getSql();
  const rows = await sql`SELECT u.id, u.username, u.password_hash FROM admin_sessions s JOIN admin_users u ON u.id = s.user_id WHERE s.token_hash = ${tokenHash} AND s.expires_at > NOW()`;
  if (!rows.length) return null;
  const row = rows[0] as Record<string, unknown>;
  return { id: String(row.id), username: String(row.username), passwordHash: String(row.password_hash) };
}

export async function deleteSession(tokenHash: string): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM admin_sessions WHERE token_hash = ${tokenHash}`;
}
