import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { Post, Category, Tag, MediaItem, SiteSettings, ActivityLog } from '../src/types';
import { initialPosts, initialCategories, initialTags, initialMedia, initialSettings, initialActivityLogs } from './seedData.js';
import fs from 'fs';
import path from 'path';

export interface DbStatus {
  connected: boolean;
  provider: 'neon' | 'local_file' | 'in_memory';
  message: string;
}

const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
const DATA_DIR = isVercel ? '/tmp/data' : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Local fallback schema
export interface LocalDatabaseSchema {
  posts: Post[];
  categories: Category[];
  tags: Tag[];
  media: MediaItem[];
  settings: SiteSettings;
  activity: ActivityLog[];
  adminPasswordHash: string;
}

let sqlClient: NeonQueryFunction<false, false> | null = null;
let tablesInitialized = false;

export function getDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL;
}

export function getSqlClient(): NeonQueryFunction<false, false> | null {
  const dbUrl = getDatabaseUrl();
  if (!dbUrl) {
    return null;
  }
  if (!sqlClient) {
    try {
      sqlClient = neon(dbUrl);
    } catch (err) {
      console.error('[Neon Init Error]:', err);
      return null;
    }
  }
  return sqlClient;
}

export async function initNeonTables(): Promise<boolean> {
  const sql = getSqlClient();
  if (!sql) return false;
  if (tablesInitialized) return true;

  try {
    // 1. Create tables
    await sql`
      CREATE TABLE IF NOT EXISTS posts (
        id VARCHAR(100) PRIMARY KEY,
        title TEXT NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        excerpt TEXT,
        content TEXT NOT NULL,
        category VARCHAR(100) DEFAULT 'Essays',
        tags JSONB DEFAULT '[]'::jsonb,
        cover_image TEXT,
        cover_image_alt TEXT,
        status VARCHAR(50) DEFAULT 'published',
        is_featured BOOLEAN DEFAULT FALSE,
        published_at TIMESTAMPTZ,
        scheduled_at TIMESTAMPTZ,
        word_count INT DEFAULT 0,
        reading_time_minutes INT DEFAULT 1,
        views_count INT DEFAULT 0,
        seo_title TEXT,
        seo_description TEXT,
        footnotes JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        count INT DEFAULT 0
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS tags (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS media (
        id VARCHAR(100) PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        alt_text TEXT,
        mime_type VARCHAR(100),
        size_bytes BIGINT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS site_settings (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id VARCHAR(100) PRIMARY KEY,
        action TEXT NOT NULL,
        details TEXT,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        type VARCHAR(50) DEFAULT 'system'
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS admin_config (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL
      );
    `;

    // 2. Check if posts table is empty, seed initial posts if so
    const existingPosts = await sql`SELECT COUNT(*)::int as count FROM posts`;
    const postCount = existingPosts[0]?.count ?? 0;

    if (postCount === 0) {
      console.log('[Neon DB] Seeding initial posts into Neon PostgreSQL...');
      for (const p of initialPosts) {
        await sql`
          INSERT INTO posts (
            id, title, slug, excerpt, content, category, tags, cover_image, cover_image_alt,
            status, is_featured, published_at, word_count, reading_time_minutes, views_count,
            seo_title, seo_description, footnotes, created_at, updated_at
          ) VALUES (
            ${p.id}, ${p.title}, ${p.slug}, ${p.excerpt || ''}, ${p.content}, ${p.category},
            ${JSON.stringify(p.tags || [])}::jsonb, ${p.coverImage || null}, ${p.coverImageAlt || null},
            ${p.status || 'published'}, ${Boolean(p.isFeatured)}, ${p.publishedAt || new Date().toISOString()},
            ${p.wordCount || 0}, ${p.readingTimeMinutes || 1}, ${p.viewsCount || 0},
            ${p.seoTitle || null}, ${p.seoDescription || null}, ${JSON.stringify(p.footnotes || [])}::jsonb,
            ${p.createdAt || new Date().toISOString()}, ${p.updatedAt || new Date().toISOString()}
          ) ON CONFLICT (id) DO NOTHING;
        `;
      }

      for (const c of initialCategories) {
        await sql`
          INSERT INTO categories (id, name, slug, description, count)
          VALUES (${c.id}, ${c.name}, ${c.slug}, ${c.description || ''}, ${c.count || 0})
          ON CONFLICT (id) DO NOTHING;
        `;
      }

      for (const t of initialTags) {
        await sql`
          INSERT INTO tags (id, name, slug)
          VALUES (${t.id}, ${t.name}, ${t.slug})
          ON CONFLICT (id) DO NOTHING;
        `;
      }

      for (const m of initialMedia) {
        await sql`
          INSERT INTO media (id, name, url, alt_text, mime_type, size_bytes, created_at)
          VALUES (${m.id}, ${m.name}, ${m.url}, ${m.altText || ''}, ${m.mimeType || ''}, ${m.sizeBytes || 0}, ${m.createdAt || new Date().toISOString()})
          ON CONFLICT (id) DO NOTHING;
        `;
      }

      await sql`
        INSERT INTO site_settings (key, value)
        VALUES ('main', ${JSON.stringify(initialSettings)}::jsonb)
        ON CONFLICT (key) DO NOTHING;
      `;

      const defaultAdminPass = process.env.ADMIN_PASSWORD || 'James1995.123';
      await sql`
        INSERT INTO admin_config (key, value)
        VALUES ('admin_password', ${defaultAdminPass})
        ON CONFLICT (key) DO NOTHING;
      `;
    }

    tablesInitialized = true;
    return true;
  } catch (err) {
    console.error('[Neon Table Init Error]:', err);
    return false;
  }
}

// --- LOCAL STORAGE FALLBACK ---
export function loadLocalDb(): LocalDatabaseSchema {
  try {
    const targetFile = isVercel ? '/tmp/data/db.json' : DB_FILE;
    if (fs.existsSync(targetFile)) {
      const content = fs.readFileSync(targetFile, 'utf-8');
      return JSON.parse(content);
    }
    const rootDb = path.join(process.cwd(), 'data', 'db.json');
    if (fs.existsSync(rootDb)) {
      const content = fs.readFileSync(rootDb, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn('[loadLocalDb warning]:', err);
  }

  const fallback: LocalDatabaseSchema = {
    posts: initialPosts || [],
    categories: initialCategories || [],
    tags: initialTags || [],
    media: initialMedia || [],
    settings: initialSettings || ({} as SiteSettings),
    activity: initialActivityLogs || [],
    adminPasswordHash: process.env.ADMIN_PASSWORD || 'James1995.123'
  };
  saveLocalDb(fallback);
  return fallback;
}

export function saveLocalDb(db: LocalDatabaseSchema) {
  try {
    const targetDir = isVercel ? '/tmp/data' : DATA_DIR;
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const targetFile = isVercel ? '/tmp/data/db.json' : DB_FILE;
    fs.writeFileSync(targetFile, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[saveLocalDb warning]:', err);
  }
}

// Transform PostgreSQL Row to Post Object
export function mapRowToPost(row: any): Post {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt || '',
    content: row.content || '',
    category: row.category || 'Essays',
    tags: Array.isArray(row.tags) ? row.tags : (typeof row.tags === 'string' ? JSON.parse(row.tags) : []),
    coverImage: row.cover_image || undefined,
    coverImageAlt: row.cover_image_alt || undefined,
    status: row.status || 'published',
    isFeatured: Boolean(row.is_featured),
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : undefined,
    scheduledAt: row.scheduled_at ? new Date(row.scheduled_at).toISOString() : undefined,
    wordCount: Number(row.word_count) || 0,
    readingTimeMinutes: Number(row.reading_time_minutes) || 1,
    viewsCount: Number(row.views_count) || 0,
    seoTitle: row.seo_title || undefined,
    seoDescription: row.seo_description || undefined,
    footnotes: Array.isArray(row.footnotes) ? row.footnotes : (typeof row.footnotes === 'string' ? JSON.parse(row.footnotes) : []),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
  };
}
