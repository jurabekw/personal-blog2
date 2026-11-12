import { getSqlClient, initNeonTables, mapRowToPost, loadLocalDb } from '../db.js';
import type { Category, Post, SiteSettings } from '../../src/types.js';

function byPublishedDesc(a: Post, b: Post): number {
  return new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime();
}

/** Published posts only, newest first. Drafts, scheduled and archived posts are never public. */
export async function fetchPublishedPosts(): Promise<Post[]> {
  const sql = getSqlClient();
  if (sql) {
    await initNeonTables();
    const rows = await sql`SELECT * FROM posts WHERE status = 'published' ORDER BY published_at DESC, created_at DESC`;
    return rows.map(mapRowToPost);
  }
  return loadLocalDb().posts.filter((p) => p.status === 'published').sort(byPublishedDesc);
}

export async function fetchSettings(): Promise<SiteSettings> {
  const sql = getSqlClient();
  if (sql) {
    await initNeonTables();
    const rows = await sql`SELECT COALESCE(payload, value) as data FROM site_settings LIMIT 1`;
    if (rows?.[0]?.data) {
      return typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
    }
  }
  return loadLocalDb().settings;
}

export async function fetchCategories(): Promise<Category[]> {
  const sql = getSqlClient();
  if (sql) {
    await initNeonTables();
    const rows = await sql`
      SELECT c.id, c.name, c.slug, COALESCE(c.description, '') AS description, COUNT(p.id)::int AS count
      FROM categories c
      LEFT JOIN posts p ON LOWER(p.category) = LOWER(c.name)
      GROUP BY c.id, c.name, c.slug, c.description
      ORDER BY c.name ASC
    `;
    return rows as Category[];
  }
  return loadLocalDb().categories;
}
