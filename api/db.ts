import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
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
    // 1. Create tables if not exist
    await sql`
      CREATE TABLE IF NOT EXISTS posts (
        id VARCHAR(100) PRIMARY KEY,
        title TEXT NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        excerpt TEXT,
        content TEXT NOT NULL,
        category VARCHAR(100) DEFAULT 'Essays',
        tags TEXT[] DEFAULT '{}',
        cover_image TEXT,
        cover_image_alt TEXT,
        status VARCHAR(50) DEFAULT 'published',
        is_featured BOOLEAN DEFAULT FALSE,
        published_at TIMESTAMPTZ,
        scheduled_at TIMESTAMPTZ,
        word_count INT DEFAULT 0,
        reading_time_minutes INT DEFAULT 1,
        views_count BIGINT DEFAULT 0,
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
        alt_text TEXT DEFAULT '',
        mime_type VARCHAR(100),
        size_bytes BIGINT DEFAULT 0,
        width INT,
        height INT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS site_settings (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB,
        singleton SMALLINT DEFAULT 1,
        payload JSONB,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id VARCHAR(100) PRIMARY KEY,
        action TEXT NOT NULL,
        details TEXT,
        type VARCHAR(50) DEFAULT 'system',
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // Ensure compatibility if table already existed without 'timestamp' or 'created_at' column
    try {
      await sql`ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW()`;
      await sql`ALTER TABLE activity_logs ALTER COLUMN timestamp DROP NOT NULL`;
      await sql`ALTER TABLE activity_logs ALTER COLUMN timestamp SET DEFAULT NOW()`;
    } catch {
      // ignore
    }
    try {
      await sql`ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`;
      await sql`ALTER TABLE activity_logs ALTER COLUMN created_at DROP NOT NULL`;
      await sql`ALTER TABLE activity_logs ALTER COLUMN created_at SET DEFAULT NOW()`;
    } catch {
      // ignore
    }
    try {
      await sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS singleton SMALLINT DEFAULT 1`;
    } catch {
      // ignore
    }
    try {
      await sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS payload JSONB`;
    } catch {
      // ignore
    }

    await sql`
      CREATE TABLE IF NOT EXISTS admin_users (
        id VARCHAR(100) PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS admin_sessions (
        token_hash VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(100) REFERENCES admin_users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS admin_config (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL
      );
    `;

    // 2. Auto-provision default admin account if not present
    const defaultPassword = process.env.ADMIN_PASSWORD || 'James1995.123';
    const existingAdmins = await sql`SELECT COUNT(*)::int as count FROM admin_users`;
    const adminCount = existingAdmins[0]?.count ?? 0;

    if (adminCount === 0) {
      try {
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(defaultPassword, salt);
        await sql`
          INSERT INTO admin_users (id, username, password_hash, created_at, updated_at)
          VALUES ('admin-default', 'Jurabek', ${hash}, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET password_hash = ${hash}, updated_at = NOW()
        `;
        await sql`
          INSERT INTO admin_config (key, value)
          VALUES ('admin_password', ${defaultPassword})
          ON CONFLICT (key) DO NOTHING
        `;
      } catch (adminErr) {
        console.warn('[Neon Admin Init Notice]:', adminErr);
      }
    }

    // 3. Check if posts table is empty, seed initial posts if so
    const existingPosts = await sql`SELECT COUNT(*)::int as count FROM posts`;
    const postCount = existingPosts[0]?.count ?? 0;

    if (postCount === 0) {
      for (const p of initialPosts) {
        await sql`
          INSERT INTO posts (
            id, title, slug, excerpt, content, category, tags, cover_image, cover_image_alt,
            status, is_featured, published_at, word_count, reading_time_minutes, views_count,
            seo_title, seo_description, footnotes, created_at, updated_at
          ) VALUES (
            ${p.id}, ${p.title}, ${p.slug}, ${p.excerpt || ''}, ${p.content}, ${p.category},
            ${p.tags || []}, ${p.coverImage || null}, ${p.coverImageAlt || null},
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
        INSERT INTO site_settings (key, value, singleton, payload)
        VALUES ('main', ${JSON.stringify(initialSettings)}::jsonb, 1, ${JSON.stringify(initialSettings)}::jsonb)
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

// Log activity safely to Neon PostgreSQL
export async function logActivity(action: string, details: string, type = 'system') {
  try {
    const sql = getSqlClient();
    const now = new Date().toISOString();
    const id = `act-${Date.now()}`;
    if (sql) {
      await initNeonTables();
      await sql`
        INSERT INTO activity_logs (id, action, details, timestamp, created_at, type)
        VALUES (${id}, ${action}, ${details}, ${now}, ${now}, ${type})
      `;
      return;
    }

    const db = loadLocalDb();
    db.activity.unshift({ id, action, details, timestamp: now, type: type as any });
    saveLocalDb(db);
  } catch (err) {
    console.warn('[logActivity warning]:', err);
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
    id: String(row.id),
    title: String(row.title),
    slug: String(row.slug),
    excerpt: row.excerpt || '',
    content: row.content || '',
    category: row.category || 'Essays',
    tags: Array.isArray(row.tags)
      ? row.tags.map(String)
      : (typeof row.tags === 'string' && row.tags.startsWith('{')
          ? row.tags.slice(1, -1).split(',').map((s: string) => s.replace(/^"|"$/g, '').trim()).filter(Boolean)
          : (typeof row.tags === 'string' && row.tags.startsWith('[')
              ? JSON.parse(row.tags)
              : [])),
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
