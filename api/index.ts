import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Post, Category, Tag, MediaItem, SiteSettings, ActivityLog } from '../src/types';
import {
  getSqlClient,
  initNeonTables,
  getDatabaseUrl,
  mapRowToPost,
  loadLocalDb,
  saveLocalDb,
  logActivity,
  DbStatus
} from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'jurabek-publishing-secure-jwt-key-2026';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'James1995.123';

export function calculateReadingTime(text: string): { wordCount: number; readingTimeMinutes: number } {
  if (!text) return { wordCount: 0, readingTimeMinutes: 1 };
  const words = text.trim().split(/\s+/).filter((w) => w.length > 0).length;
  const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));
  return { wordCount: words, readingTimeMinutes };
}

export function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function createExpressApp() {
  const app = express();

  // CORS Middleware
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    next();
  });

  // Standard body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get(['/api', '/api/'], (req, res) => {
    res.json({ status: 'ok', name: 'Jurabek Publishing Platform API', version: '2.0.0' });
  });

  // Safeguard body normalization
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (typeof req.body === 'string') {
      try {
        req.body = JSON.parse(req.body);
      } catch {
        // Keep as is
      }
    }
    if (!req.body || typeof req.body !== 'object') {
      req.body = {};
    }
    next();
  });

  // JWT Verification Middleware for Admin Routes
  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized. Bearer token missing.' });
      }

      const token = authHeader.replace('Bearer ', '').trim();
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized. Empty token.' });
      }

      // 1. Verify stateless JWT token
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { role: string; username: string };
        if (decoded && decoded.role === 'admin') {
          (req as any).user = decoded;
          return next();
        }
      } catch {
        // If JWT verify fails, check legacy token string for backwards compatibility
        if (token.startsWith('token-')) {
          return next();
        }
      }

      return res.status(401).json({ error: 'Unauthorized. Invalid or expired admin session token.' });
    } catch (err: any) {
      console.error('[requireAdmin error]:', err);
      return res.status(401).json({ error: 'Unauthorized. Authentication failed.' });
    }
  };

  // --- API ENDPOINTS ---

  // GET /api/health
  app.get('/api/health', async (req, res) => {
    const hasDbUrl = Boolean(getDatabaseUrl());
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      databaseConfigured: hasDbUrl,
      driver: hasDbUrl ? 'Neon Serverless PostgreSQL' : 'Local file fallback'
    });
  });

  // GET /api/db/status
  app.get('/api/db/status', async (req, res) => {
    const dbUrl = getDatabaseUrl();
    if (!dbUrl) {
      return res.json({
        connected: false,
        provider: 'local_file',
        message: 'DATABASE_URL is not set. The app is running in local fallback mode. Configure DATABASE_URL in Vercel to use Neon PostgreSQL.'
      } as DbStatus);
    }

    try {
      const sql = getSqlClient();
      if (!sql) throw new Error('Could not instantiate Neon SQL client');
      await initNeonTables();
      const check = await sql`SELECT 1 as connected, NOW() as current_time`;
      return res.json({
        connected: true,
        provider: 'neon',
        message: `Connected to Neon PostgreSQL successfully at ${check[0]?.current_time}`
      } as DbStatus);
    } catch (err: any) {
      return res.json({
        connected: false,
        provider: 'local_file',
        message: `Neon connection error: ${err.message}. Operating in local fallback mode.`
      } as DbStatus);
    }
  });

  // GET /api/posts
  app.get('/api/posts', async (req, res) => {
    try {
      const { status, category, tag, search, featured } = req.query;
      const sql = getSqlClient();

      if (sql) {
        await initNeonTables();
        const rows = await sql`SELECT * FROM posts ORDER BY published_at DESC, created_at DESC`;
        let posts = rows.map(mapRowToPost);

        if (status && status !== 'all') {
          posts = posts.filter((p) => p.status === status);
        }
        if (category) {
          posts = posts.filter((p) => p.category?.toLowerCase() === (category as string).toLowerCase());
        }
        if (tag) {
          posts = posts.filter((p) => p.tags?.map((t) => t.toLowerCase()).includes((tag as string).toLowerCase()));
        }
        if (featured === 'true') {
          posts = posts.filter((p) => p.isFeatured);
        }
        if (search) {
          const q = (search as string).toLowerCase();
          posts = posts.filter(
            (p) =>
              p.title?.toLowerCase().includes(q) ||
              p.excerpt?.toLowerCase().includes(q) ||
              p.content?.toLowerCase().includes(q)
          );
        }

        return res.json(posts);
      }

      // Local fallback
      const db = loadLocalDb();
      let filtered = [...db.posts];
      if (status && status !== 'all') filtered = filtered.filter((p) => p.status === status);
      if (category) filtered = filtered.filter((p) => p.category?.toLowerCase() === (category as string).toLowerCase());
      if (tag) filtered = filtered.filter((p) => p.tags?.map((t) => t.toLowerCase()).includes((tag as string).toLowerCase()));
      if (featured === 'true') filtered = filtered.filter((p) => p.isFeatured);
      if (search) {
        const q = (search as string).toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.title?.toLowerCase().includes(q) ||
            p.excerpt?.toLowerCase().includes(q) ||
            p.content?.toLowerCase().includes(q)
        );
      }
      filtered.sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime());
      return res.json(filtered);
    } catch (err: any) {
      console.error('[GET /api/posts error]:', err);
      return res.status(500).json({ error: 'Failed to fetch posts: ' + err.message });
    }
  });

  // GET /api/posts/:idOrSlug
  app.get('/api/posts/:idOrSlug', async (req, res) => {
    try {
      const { idOrSlug } = req.params;
      const cleanIdOrSlug = decodeURIComponent(String(idOrSlug).trim());
      const incrementView = req.query.incrementView === 'true';
      const sql = getSqlClient();

      if (sql) {
        await initNeonTables();
        const rows = await sql`
          SELECT * FROM posts WHERE id = ${cleanIdOrSlug} OR LOWER(slug) = LOWER(${cleanIdOrSlug}) LIMIT 1
        `;

        if (!rows || rows.length === 0) {
          return res.status(404).json({ error: 'Post not found' });
        }

        const post = mapRowToPost(rows[0]);

        if (incrementView) {
          post.viewsCount = (post.viewsCount || 0) + 1;
          await sql`
            UPDATE posts SET views_count = ${post.viewsCount} WHERE id = ${post.id}
          `;
        }

        return res.json(post);
      }

      // Local fallback
      const db = loadLocalDb();
      const post = db.posts.find((p) => p.id === cleanIdOrSlug || p.slug.toLowerCase() === cleanIdOrSlug.toLowerCase());
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }
      if (incrementView) {
        post.viewsCount = (post.viewsCount || 0) + 1;
        saveLocalDb(db);
      }
      return res.json(post);
    } catch (err: any) {
      console.error('[GET /api/posts/:idOrSlug error]:', err);
      return res.status(500).json({ error: 'Failed to fetch post details' });
    }
  });

  // POST /api/posts (Protected)
  app.post('/api/posts', requireAdmin, async (req, res) => {
    try {
      const {
        title, slug, excerpt, content, category, tags, coverImage, coverImageAlt,
        status, isFeatured, seoTitle, seoDescription, footnotes, faqs
      } = req.body;

      if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
      }

      const generateSlug = (t: string) =>
        t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const baseSlug = slug ? generateSlug(slug) : generateSlug(title);

      const { wordCount, readingTimeMinutes } = calculateReadingTime(content);
      const now = new Date().toISOString();
      const postId = `post-${Date.now()}`;
      let finalSlug = baseSlug;

      const sql = getSqlClient();
      if (sql) {
        await initNeonTables();
        const existing = await sql`SELECT slug FROM posts WHERE slug = ${baseSlug} LIMIT 1`;
        if (existing && existing.length > 0) {
          finalSlug = `${baseSlug}-${Date.now().toString(36)}`;
        }

        const newPost: Post = {
          id: postId,
          title,
          slug: finalSlug,
          excerpt: excerpt || content.slice(0, 160).replace(/[#*`]/g, '') + '...',
          content,
          category: category || 'Essays',
          tags: tags || [],
          coverImage,
          coverImageAlt,
          status: status || 'draft',
          isFeatured: !!isFeatured,
          createdAt: now,
          updatedAt: now,
          publishedAt: status === 'published' ? now : undefined,
          scheduledAt: status === 'scheduled' ? req.body.scheduledAt : undefined,
          wordCount,
          readingTimeMinutes,
          viewsCount: 0,
          seoTitle,
          seoDescription,
          footnotes: footnotes || [],
          faqs: faqs || []
        };

        await sql`
          INSERT INTO posts (
            id, title, slug, excerpt, content, category, tags, cover_image, cover_image_alt,
            status, is_featured, published_at, scheduled_at, word_count, reading_time_minutes,
            views_count, seo_title, seo_description, footnotes, faqs, created_at, updated_at
          ) VALUES (
            ${newPost.id}, ${newPost.title}, ${newPost.slug}, ${newPost.excerpt || ''}, ${newPost.content},
            ${newPost.category}, ${newPost.tags || []}, ${newPost.coverImage || null},
            ${newPost.coverImageAlt || null}, ${newPost.status}, ${newPost.isFeatured},
            ${newPost.publishedAt || null}, ${newPost.scheduledAt || null}, ${newPost.wordCount},
            ${newPost.readingTimeMinutes}, ${newPost.viewsCount}, ${newPost.seoTitle || null},
            ${newPost.seoDescription || null}, ${JSON.stringify(newPost.footnotes || [])}::jsonb,
            ${JSON.stringify(newPost.faqs || [])}::jsonb,
            ${newPost.createdAt}, ${newPost.updatedAt}
          )
        `;

        // Try to update static category count column if present
        try {
          await sql`
            UPDATE categories SET count = count + 1 WHERE LOWER(name) = LOWER(${newPost.category})
          `;
        } catch {
          // ignore if categories table doesn't have count column
        }

        // Record activity log safely
        await logActivity(
          `Post ${status === 'published' ? 'Published' : 'Created'}`,
          `Created "${title}" (${status})`,
          'post'
        );

        return res.status(201).json(newPost);
      }

      // Local fallback
      const db = loadLocalDb();
      const slugExists = db.posts.some((p) => p.slug === baseSlug);
      finalSlug = slugExists ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;

      const newPost: Post = {
        id: postId,
        title,
        slug: finalSlug,
        excerpt: excerpt || content.slice(0, 160).replace(/[#*`]/g, '') + '...',
        content,
        category: category || 'Essays',
        tags: tags || [],
        coverImage,
        coverImageAlt,
        status: status || 'draft',
        isFeatured: !!isFeatured,
        createdAt: now,
        updatedAt: now,
        publishedAt: status === 'published' ? now : undefined,
        scheduledAt: status === 'scheduled' ? req.body.scheduledAt : undefined,
        wordCount,
        readingTimeMinutes,
        viewsCount: 0,
        seoTitle,
        seoDescription,
        footnotes: footnotes || [],
        faqs: faqs || []
      };

      db.posts.unshift(newPost);
      const catObj = db.categories.find((c) => c.name.toLowerCase() === newPost.category.toLowerCase());
      if (catObj) catObj.count = (catObj.count || 0) + 1;

      db.activity.unshift({
        id: `act-${Date.now()}`,
        action: `Post ${status === 'published' ? 'Published' : 'Created'}`,
        details: `Created "${title}" (${status})`,
        timestamp: now,
        type: 'post'
      });

      saveLocalDb(db);
      return res.status(201).json(newPost);
    } catch (err: any) {
      console.error('[POST /api/posts error]:', err);
      return res.status(500).json({ error: 'Failed to create post: ' + err.message });
    }
  });

  // PUT /api/posts/:id (Protected)
  app.put('/api/posts/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const {
        title, slug, excerpt, content, category, tags, coverImage, coverImageAlt,
        status, isFeatured, seoTitle, seoDescription, footnotes, faqs, scheduledAt
      } = req.body;

      const now = new Date().toISOString();
      const sql = getSqlClient();

      if (sql) {
        await initNeonTables();
        const existingRows = await sql`SELECT * FROM posts WHERE id = ${id} LIMIT 1`;
        if (!existingRows || existingRows.length === 0) {
          return res.status(404).json({ error: 'Post not found' });
        }
        const existing = mapRowToPost(existingRows[0]);
        const finalContent = content !== undefined ? content : existing.content;
        const { wordCount, readingTimeMinutes } = calculateReadingTime(finalContent);

        const wasPublished = existing.status === 'published';
        const isNowPublished = status === 'published';
        const publishedAt = isNowPublished && !wasPublished ? now : (existing.publishedAt || (isNowPublished ? now : null));

        const updated: Post = {
          ...existing,
          title: title !== undefined ? title : existing.title,
          slug: slug !== undefined ? slug : existing.slug,
          excerpt: excerpt !== undefined ? excerpt : existing.excerpt,
          content: finalContent,
          category: category !== undefined ? category : existing.category,
          tags: tags !== undefined ? tags : existing.tags,
          coverImage: coverImage !== undefined ? coverImage : existing.coverImage,
          coverImageAlt: coverImageAlt !== undefined ? coverImageAlt : existing.coverImageAlt,
          status: status !== undefined ? status : existing.status,
          isFeatured: isFeatured !== undefined ? isFeatured : existing.isFeatured,
          seoTitle: seoTitle !== undefined ? seoTitle : existing.seoTitle,
          seoDescription: seoDescription !== undefined ? seoDescription : existing.seoDescription,
          footnotes: footnotes !== undefined ? footnotes : existing.footnotes,
          faqs: faqs !== undefined ? faqs : existing.faqs,
          scheduledAt: scheduledAt !== undefined ? scheduledAt : existing.scheduledAt,
          publishedAt: publishedAt || undefined,
          wordCount,
          readingTimeMinutes,
          updatedAt: now
        };

        await sql`
          UPDATE posts SET
            title = ${updated.title},
            slug = ${updated.slug},
            excerpt = ${updated.excerpt || ''},
            content = ${updated.content},
            category = ${updated.category},
            tags = ${updated.tags || []},
            cover_image = ${updated.coverImage || null},
            cover_image_alt = ${updated.coverImageAlt || null},
            status = ${updated.status},
            is_featured = ${updated.isFeatured},
            published_at = ${updated.publishedAt || null},
            scheduled_at = ${updated.scheduledAt || null},
            word_count = ${updated.wordCount},
            reading_time_minutes = ${updated.readingTimeMinutes},
            seo_title = ${updated.seoTitle || null},
            seo_description = ${updated.seoDescription || null},
            footnotes = ${JSON.stringify(updated.footnotes || [])}::jsonb,
            faqs = ${JSON.stringify(updated.faqs || [])}::jsonb,
            updated_at = ${updated.updatedAt}
          WHERE id = ${id}
        `;

        await logActivity('Post Updated', `Updated "${updated.title}"`, 'post');

        return res.json(updated);
      }

      // Local fallback
      const db = loadLocalDb();
      const postIndex = db.posts.findIndex((p) => p.id === id);
      if (postIndex === -1) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const existing = db.posts[postIndex];
      const finalContent = content !== undefined ? content : existing.content;
      const { wordCount, readingTimeMinutes } = calculateReadingTime(finalContent);

      const wasPublished = existing.status === 'published';
      const isNowPublished = status === 'published';

      const updatedPost: Post = {
        ...existing,
        title: title !== undefined ? title : existing.title,
        slug: slug !== undefined ? slug : existing.slug,
        excerpt: excerpt !== undefined ? excerpt : existing.excerpt,
        content: finalContent,
        category: category !== undefined ? category : existing.category,
        tags: tags !== undefined ? tags : existing.tags,
        coverImage: coverImage !== undefined ? coverImage : existing.coverImage,
        coverImageAlt: coverImageAlt !== undefined ? coverImageAlt : existing.coverImageAlt,
        status: status !== undefined ? status : existing.status,
        isFeatured: isFeatured !== undefined ? isFeatured : existing.isFeatured,
        seoTitle: seoTitle !== undefined ? seoTitle : existing.seoTitle,
        seoDescription: seoDescription !== undefined ? seoDescription : existing.seoDescription,
        footnotes: footnotes !== undefined ? footnotes : existing.footnotes,
        faqs: faqs !== undefined ? faqs : existing.faqs,
        scheduledAt: scheduledAt !== undefined ? scheduledAt : existing.scheduledAt,
        publishedAt: isNowPublished && !wasPublished ? now : existing.publishedAt,
        wordCount,
        readingTimeMinutes,
        updatedAt: now
      };

      db.posts[postIndex] = updatedPost;
      db.activity.unshift({
        id: `act-${Date.now()}`,
        action: 'Post Updated',
        details: `Updated "${updatedPost.title}"`,
        timestamp: now,
        type: 'post'
      });

      saveLocalDb(db);
      return res.json(updatedPost);
    } catch (err: any) {
      console.error('[PUT /api/posts/:id error]:', err);
      return res.status(500).json({ error: 'Failed to update post: ' + err.message });
    }
  });

  // DELETE /api/posts/:id (Protected)
  app.delete('/api/posts/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const sql = getSqlClient();

      if (sql) {
        await initNeonTables();
        const existing = await sql`SELECT title FROM posts WHERE id = ${id} LIMIT 1`;
        if (!existing || existing.length === 0) {
          return res.status(404).json({ error: 'Post not found' });
        }
        const postTitle = existing[0].title;
        await sql`DELETE FROM posts WHERE id = ${id}`;

        await logActivity('Post Deleted', `Deleted "${postTitle}"`, 'post');
        return res.json({ success: true });
      }

      // Local fallback
      const db = loadLocalDb();
      const postIndex = db.posts.findIndex((p) => p.id === id);
      if (postIndex === -1) {
        return res.status(404).json({ error: 'Post not found' });
      }
      const [deleted] = db.posts.splice(postIndex, 1);

      db.activity.unshift({
        id: `act-${Date.now()}`,
        action: 'Post Deleted',
        details: `Deleted "${deleted.title}"`,
        timestamp: new Date().toISOString(),
        type: 'post'
      });

      saveLocalDb(db);
      return res.json({ success: true });
    } catch (err: any) {
      console.error('[DELETE /api/posts/:id error]:', err);
      return res.status(500).json({ error: 'Failed to delete post' });
    }
  });

  // GET /api/categories
  app.get('/api/categories', async (req, res) => {
    try {
      const sql = getSqlClient();
      if (sql) {
        await initNeonTables();
        const rows = await sql`
          SELECT c.id, c.name, c.slug, COALESCE(c.description, '') AS description,
                 COUNT(p.id)::int AS count
          FROM categories c
          LEFT JOIN posts p ON LOWER(p.category) = LOWER(c.name)
          GROUP BY c.id, c.name, c.slug, c.description
          ORDER BY c.name ASC
        `;
        return res.json(rows);
      }
      const db = loadLocalDb();
      return res.json(db.categories);
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  // POST /api/categories (Protected)
  app.post('/api/categories', requireAdmin, async (req, res) => {
    try {
      const { name, description } = req.body;
      if (!name) return res.status(400).json({ error: 'Category name is required' });

      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const newCategory: Category = {
        id: `cat-${Date.now()}`,
        name,
        slug,
        description: description || '',
        count: 0
      };

      const sql = getSqlClient();
      if (sql) {
        await initNeonTables();
        await sql`
          INSERT INTO categories (id, name, slug, description)
          VALUES (${newCategory.id}, ${newCategory.name}, ${newCategory.slug}, ${newCategory.description || ''})
          ON CONFLICT (id) DO NOTHING
        `;
        return res.status(201).json(newCategory);
      }

      const db = loadLocalDb();
      db.categories.push(newCategory);
      saveLocalDb(db);
      return res.status(201).json(newCategory);
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to create category' });
    }
  });

  // DELETE /api/categories/:id (Protected)
  app.delete('/api/categories/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const sql = getSqlClient();
      if (sql) {
        await initNeonTables();
        await sql`DELETE FROM categories WHERE id = ${id}`;
        return res.json({ success: true });
      }
      const db = loadLocalDb();
      db.categories = db.categories.filter((c) => c.id !== id);
      saveLocalDb(db);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to delete category' });
    }
  });

  // GET /api/tags
  app.get('/api/tags', async (req, res) => {
    try {
      const sql = getSqlClient();
      if (sql) {
        await initNeonTables();
        const rows = await sql`SELECT * FROM tags ORDER BY name ASC`;
        return res.json(rows);
      }
      const db = loadLocalDb();
      return res.json(db.tags);
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to fetch tags' });
    }
  });

  // POST /api/tags (Protected)
  app.post('/api/tags', requireAdmin, async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: 'Tag name is required' });

      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const newTag: Tag = {
        id: `tag-${Date.now()}`,
        name,
        slug
      };

      const sql = getSqlClient();
      if (sql) {
        await initNeonTables();
        await sql`
          INSERT INTO tags (id, name, slug)
          VALUES (${newTag.id}, ${newTag.name}, ${newTag.slug})
          ON CONFLICT (slug) DO NOTHING
        `;
        return res.status(201).json(newTag);
      }

      const db = loadLocalDb();
      if (!db.tags.some((t) => t.slug === slug)) {
        db.tags.push(newTag);
        saveLocalDb(db);
      }
      return res.status(201).json(newTag);
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to create tag' });
    }
  });

  // DELETE /api/tags/:id (Protected)
  app.delete('/api/tags/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const sql = getSqlClient();
      if (sql) {
        await initNeonTables();
        await sql`DELETE FROM tags WHERE id = ${id}`;
        return res.json({ success: true });
      }
      const db = loadLocalDb();
      db.tags = db.tags.filter((t) => t.id !== id);
      saveLocalDb(db);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to delete tag' });
    }
  });

  // GET /api/media
  app.get('/api/media', async (req, res) => {
    try {
      const sql = getSqlClient();
      if (sql) {
        await initNeonTables();
        const rows = await sql`SELECT * FROM media ORDER BY created_at DESC`;
        const items = rows.map((r: any) => ({
          id: r.id,
          name: r.name,
          url: r.url,
          altText: r.alt_text,
          mimeType: r.mime_type,
          sizeBytes: Number(r.size_bytes),
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
        }));
        return res.json(items);
      }
      const db = loadLocalDb();
      return res.json(db.media);
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to fetch media items' });
    }
  });

  // POST /api/media (Protected)
  app.post('/api/media', requireAdmin, async (req, res) => {
    try {
      const { name, url, altText, mimeType, sizeBytes } = req.body;
      if (!url) return res.status(400).json({ error: 'Media URL is required' });

      const newMedia: MediaItem = {
        id: `media-${Date.now()}`,
        name: name || 'Uploaded image',
        url,
        altText: altText || '',
        mimeType: mimeType || 'image/jpeg',
        sizeBytes: sizeBytes || 0,
        createdAt: new Date().toISOString()
      };

      const sql = getSqlClient();
      if (sql) {
        await initNeonTables();
        await sql`
          INSERT INTO media (id, name, url, alt_text, mime_type, size_bytes, created_at)
          VALUES (
            ${newMedia.id}, ${newMedia.name}, ${newMedia.url}, ${newMedia.altText || ''},
            ${newMedia.mimeType || ''}, ${newMedia.sizeBytes || 0}, ${newMedia.createdAt}
          )
        `;
        return res.status(201).json(newMedia);
      }

      const db = loadLocalDb();
      db.media.unshift(newMedia);
      saveLocalDb(db);
      return res.status(201).json(newMedia);
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to save media record' });
    }
  });

  // DELETE /api/media/:id (Protected)
  app.delete('/api/media/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const sql = getSqlClient();
      if (sql) {
        await initNeonTables();
        await sql`DELETE FROM media WHERE id = ${id}`;
        return res.json({ success: true });
      }
      const db = loadLocalDb();
      db.media = db.media.filter((m) => m.id !== id);
      saveLocalDb(db);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to delete media item' });
    }
  });

  // GET /api/settings
  app.get('/api/settings', async (req, res) => {
    try {
      const sql = getSqlClient();
      if (sql) {
        await initNeonTables();
        const rows = await sql`
          SELECT COALESCE(payload, value) as data FROM site_settings LIMIT 1
        `;
        if (rows && rows.length > 0 && rows[0].data) {
          const val = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
          return res.json(val);
        }
      }
      const db = loadLocalDb();
      return res.json(db.settings);
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  // PUT /api/settings (Protected)
  app.put('/api/settings', requireAdmin, async (req, res) => {
    try {
      const sql = getSqlClient();
      if (sql) {
        await initNeonTables();
        const currentRows = await sql`SELECT COALESCE(payload, value) as data FROM site_settings LIMIT 1`;
        const current = currentRows[0]?.data ? (typeof currentRows[0].data === 'string' ? JSON.parse(currentRows[0].data) : currentRows[0].data) : {};
        const updated = { ...current, ...req.body };
        const updatedJson = JSON.stringify(updated);

        try {
          await sql`
            INSERT INTO site_settings (singleton, payload, updated_at)
            VALUES (1, ${updatedJson}::jsonb, NOW())
            ON CONFLICT (singleton) DO UPDATE SET payload = ${updatedJson}::jsonb, updated_at = NOW()
          `;
        } catch {
          await sql`
            INSERT INTO site_settings (key, value)
            VALUES ('main', ${updatedJson}::jsonb)
            ON CONFLICT (key) DO UPDATE SET value = ${updatedJson}::jsonb
          `;
        }

        await logActivity('Settings Updated', 'Updated site configuration settings', 'settings');

        return res.json(updated);
      }

      const db = loadLocalDb();
      db.settings = { ...db.settings, ...req.body };
      db.activity.unshift({
        id: `act-${Date.now()}`,
        action: 'Settings Updated',
        details: 'Updated site configuration settings',
        timestamp: new Date().toISOString(),
        type: 'settings'
      });
      saveLocalDb(db);
      return res.json(db.settings);
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  // GET /api/activity (Protected)
  app.get('/api/activity', requireAdmin, async (req, res) => {
    try {
      const sql = getSqlClient();
      if (sql) {
        await initNeonTables();
        const rows = await sql`
          SELECT id, action, details, COALESCE(timestamp, created_at, NOW()) AS timestamp, type
          FROM activity_logs
          ORDER BY COALESCE(timestamp, created_at, NOW()) DESC
          LIMIT 25
        `;
        const logs: ActivityLog[] = rows.map((r: any) => ({
          id: String(r.id),
          action: String(r.action),
          details: String(r.details || ''),
          timestamp: r.timestamp ? new Date(r.timestamp).toISOString() : new Date().toISOString(),
          type: (r.type as ActivityLog['type']) || 'system'
        }));
        return res.json(logs);
      }
      const db = loadLocalDb();
      return res.json(db.activity.slice(0, 25));
    } catch (err: any) {
      console.error('[GET /api/activity error]:', err);
      return res.status(500).json({ error: 'Failed to fetch activity' });
    }
  });

  // POST /api/auth/login (Issues Stateless Signed JWT, supports bcrypt and auto-provisioning)
  app.post('/api/auth/login', async (req, res) => {
    try {
      const body = req.body || {};
      const password = String(body.password || '').trim();

      if (!password) {
        return res.status(400).json({ error: 'Password is required' });
      }

      const sql = getSqlClient();
      let isValid = false;
      const defaultPassword = process.env.ADMIN_PASSWORD || 'James1995.123';

      if (sql) {
        await initNeonTables();

        // 1. Check admin_users table (bcrypt hash)
        const userRows = await sql`SELECT id, username, password_hash FROM admin_users ORDER BY created_at ASC LIMIT 1`;
        if (userRows && userRows.length > 0) {
          const storedHash = userRows[0].password_hash;
          if (storedHash.startsWith('$2')) {
            try {
              isValid = bcrypt.compareSync(password, storedHash);
            } catch {
              isValid = false;
            }
          }
          if (!isValid && (password === storedHash || password === defaultPassword)) {
            isValid = true;
          }
        } else {
          // Auto-provision if no admin user exists in DB yet
          try {
            const salt = bcrypt.genSaltSync(10);
            const hash = bcrypt.hashSync(defaultPassword, salt);
            await sql`
              INSERT INTO admin_users (id, username, password_hash, created_at, updated_at)
              VALUES ('admin-default', 'Jurabek', ${hash}, NOW(), NOW())
              ON CONFLICT (id) DO UPDATE SET password_hash = ${hash}, updated_at = NOW()
            `;
          } catch (autoErr) {
            console.warn('[Admin auto-provision warning]:', autoErr);
          }
          if (password === defaultPassword) {
            isValid = true;
          }
        }

        // 2. Check admin_config table
        if (!isValid) {
          const confRows = await sql`SELECT value FROM admin_config WHERE key = 'admin_password' LIMIT 1`;
          if (confRows && confRows.length > 0 && confRows[0].value) {
            if (password === confRows[0].value) {
              isValid = true;
            }
          }
        }

        // 3. Check environment override
        if (!isValid && process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD) {
          isValid = true;
        }

        // 4. Default fallback match
        if (!isValid && password === defaultPassword) {
          isValid = true;
        }
      } else {
        const db = loadLocalDb();
        const expected = process.env.ADMIN_PASSWORD || db.adminPasswordHash || defaultPassword;
        if (expected.startsWith('$2')) {
          try {
            isValid = bcrypt.compareSync(password, expected);
          } catch {
            isValid = false;
          }
        }
        if (!isValid && (password === expected || password === defaultPassword)) {
          isValid = true;
        }
      }

      if (isValid) {
        // Sign a 30-day stateless JWT token
        const token = jwt.sign(
          {
            role: 'admin',
            username: 'Jurabek',
            loginAt: new Date().toISOString()
          },
          JWT_SECRET,
          { expiresIn: '30d' }
        );

        try {
          await logActivity('Admin Login', 'Admin logged in with JWT session', 'auth');
        } catch (logErr) {
          console.warn('[Login log notice]:', logErr);
        }

        return res.json({
          token,
          user: {
            username: 'Jurabek',
            role: 'Admin',
            lastLogin: new Date().toISOString()
          }
        });
      } else {
        return res.status(401).json({ error: 'Invalid admin credentials' });
      }
    } catch (err: any) {
      console.error('[POST /api/auth/login error]:', err);
      return res.status(500).json({ error: err?.message || 'Server error during login' });
    }
  });

  // POST /api/auth/change-password (Protected)
  app.post('/api/auth/change-password', requireAdmin, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long' });
      }

      const sql = getSqlClient();
      const defaultPassword = process.env.ADMIN_PASSWORD || 'James1995.123';

      if (sql) {
        await initNeonTables();
        const userRows = await sql`SELECT id, username, password_hash FROM admin_users ORDER BY created_at ASC LIMIT 1`;
        let isCurrentValid = false;

        if (userRows && userRows.length > 0) {
          const hash = userRows[0].password_hash;
          if (hash.startsWith('$2')) {
            try {
              isCurrentValid = bcrypt.compareSync(currentPassword, hash);
            } catch {
              isCurrentValid = false;
            }
          }
          if (!isCurrentValid && (currentPassword === hash || currentPassword === defaultPassword)) {
            isCurrentValid = true;
          }
        } else if (currentPassword === defaultPassword) {
          isCurrentValid = true;
        }

        if (!isCurrentValid) {
          return res.status(400).json({ error: 'Current password is incorrect' });
        }

        const newHash = bcrypt.hashSync(newPassword, 10);
        await sql`
          UPDATE admin_users SET password_hash = ${newHash}, updated_at = NOW()
        `;
        await sql`
          INSERT INTO admin_config (key, value)
          VALUES ('admin_password', ${newPassword})
          ON CONFLICT (key) DO UPDATE SET value = ${newPassword}
        `;
        await logActivity('Password Changed', 'Admin password was updated', 'auth');
        return res.json({ success: true, message: 'Admin password updated in Neon database successfully' });
      }

      // Local fallback
      const db = loadLocalDb();
      const currentExpected = db.adminPasswordHash || defaultPassword;
      if (currentPassword !== currentExpected) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
      db.adminPasswordHash = newPassword;
      saveLocalDb(db);
      await logActivity('Password Changed', 'Admin password was updated', 'auth');
      return res.json({ success: true, message: 'Admin password updated successfully' });
    } catch (err: any) {
      console.error('[POST /api/auth/change-password error]:', err);
      return res.status(500).json({ error: 'Failed to change password' });
    }
  });

  // CRON endpoint for scheduled post publishing (Vercel Cron)
  app.all(['/api/cron/publish', '/api/cron/publish/'], async (req, res) => {
    try {
      const sql = getSqlClient();
      if (sql) {
        await initNeonTables();
        const result = await sql`
          UPDATE posts
          SET status = 'published',
              published_at = COALESCE(published_at, NOW()),
              updated_at = NOW()
          WHERE status = 'scheduled'
            AND scheduled_at IS NOT NULL
            AND scheduled_at <= NOW()
          RETURNING id, title
        `;
        const count = result.length;
        if (count > 0) {
          await logActivity('Auto-published Scheduled Posts', `Auto-published ${count} scheduled post(s)`, 'system');
        }
        return res.json({ success: true, publishedCount: count, posts: result });
      }

      const db = loadLocalDb();
      const now = new Date();
      let publishedCount = 0;
      for (const p of db.posts) {
        if (p.status === 'scheduled' && p.scheduledAt && new Date(p.scheduledAt) <= now) {
          p.status = 'published';
          p.publishedAt = p.publishedAt || now.toISOString();
          p.updatedAt = now.toISOString();
          publishedCount++;
        }
      }
      if (publishedCount > 0) {
        saveLocalDb(db);
        await logActivity('Auto-published Scheduled Posts', `Auto-published ${publishedCount} scheduled post(s)`, 'system');
      }
      return res.json({ success: true, publishedCount });
    } catch (err: any) {
      console.error('[CRON /api/cron/publish error]:', err);
      return res.status(500).json({ error: 'Failed to run publishing cron' });
    }
  });

  // GET /api/auth/session
  app.get('/api/auth/session', (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.json({ isAuthenticated: false, user: null });
      }

      const token = authHeader.replace('Bearer ', '').trim();
      if (!token) {
        return res.json({ isAuthenticated: false, user: null });
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { role: string; username: string };
        if (decoded && decoded.role === 'admin') {
          return res.json({
            isAuthenticated: true,
            user: {
              username: decoded.username || 'Jurabek',
              role: 'Admin'
            }
          });
        }
      } catch {
        // Fallback for legacy tokens
        if (token.startsWith('token-')) {
          return res.json({
            isAuthenticated: true,
            user: { username: 'Jurabek', role: 'Admin' }
          });
        }
      }

      return res.json({ isAuthenticated: false, user: null });
    } catch {
      return res.json({ isAuthenticated: false, user: null });
    }
  });

  // POST /api/auth/logout
  app.post('/api/auth/logout', (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
  });

  // GET /robots.txt
  app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send(`User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${req.protocol}://${req.get('host')}/sitemap.xml\n`);
  });

  // GET /sitemap.xml
  app.get('/sitemap.xml', async (req, res) => {
    try {
      let posts: Post[] = [];
      const sql = getSqlClient();
      if (sql) {
        await initNeonTables();
        const rows = await sql`SELECT * FROM posts WHERE status = 'published' ORDER BY published_at DESC`;
        posts = rows.map(mapRowToPost);
      } else {
        const db = loadLocalDb();
        posts = db.posts.filter((p) => p.status === 'published');
      }

      const host = `${req.protocol}://${req.get('host')}`;
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

      xml += `  <url>\n    <loc>${host}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
      xml += `  <url>\n    <loc>${host}/blog</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;

      for (const p of posts) {
        const date = p.updatedAt || p.publishedAt || new Date().toISOString();
        xml += `  <url>\n    <loc>${host}/blog/${escapeXml(p.slug)}</loc>\n    <lastmod>${date.split('T')[0]}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
      }
      xml += `</urlset>`;

      res.type('application/xml');
      res.send(xml);
    } catch (err: any) {
      res.status(500).send('Error generating sitemap');
    }
  });

  // GET /rss.xml or /feed
  app.get(['/rss.xml', '/feed', '/rss'], async (req, res) => {
    try {
      let posts: Post[] = [];
      const sql = getSqlClient();
      if (sql) {
        await initNeonTables();
        const rows = await sql`SELECT * FROM posts WHERE status = 'published' ORDER BY published_at DESC LIMIT 20`;
        posts = rows.map(mapRowToPost);
      } else {
        const db = loadLocalDb();
        posts = db.posts.filter((p) => p.status === 'published').slice(0, 20);
      }

      const host = `${req.protocol}://${req.get('host')}`;
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n`;
      xml += `  <channel>\n`;
      xml += `    <title>Jurabek — Shaxsiy Blog &amp; Qaydlar</title>\n`;
      xml += `    <link>${host}</link>\n`;
      xml += `    <description>Dizayn, dasturiy ta'minot arxitekturasi va raqamli mahorat haqida insholar.</description>\n`;
      xml += `    <language>uz</language>\n`;
      xml += `    <atom:link href="${host}/rss.xml" rel="self" type="application/rss+xml" />\n`;

      for (const p of posts) {
        const pubDate = new Date(p.publishedAt || p.createdAt).toUTCString();
        xml += `    <item>\n`;
        xml += `      <title>${escapeXml(p.title)}</title>\n`;
        xml += `      <link>${host}/blog/${escapeXml(p.slug)}</link>\n`;
        xml += `      <guid isPermaLink="true">${host}/blog/${escapeXml(p.slug)}</guid>\n`;
        xml += `      <pubDate>${pubDate}</pubDate>\n`;
        xml += `      <description>${escapeXml(p.excerpt || '')}</description>\n`;
        xml += `    </item>\n`;
      }

      xml += `  </channel>\n`;
      xml += `</rss>`;

      res.type('application/xml');
      res.send(xml);
    } catch (err: any) {
      res.status(500).send('Error generating RSS feed');
    }
  });

  // Scoped 404 Handler for unmatched API routes
  app.use('/api', (req: express.Request, res: express.Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: `No route handler for ${req.method} ${req.originalUrl || req.url}`
    });
  });

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Unhandled Express Error]:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err?.message || 'Unknown server error'
    });
  });

  return { app };
}

const { app } = createExpressApp();

// Catch-all for standalone serverless function invocations
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `No route handler for ${req.method} ${req.originalUrl || req.url}`
  });
});

export default app;
