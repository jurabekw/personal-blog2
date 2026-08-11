import express from 'express';
import path from 'path';
import fs from 'fs';
import { initialPosts, initialCategories, initialTags, initialMedia, initialSettings, initialActivityLogs } from './src/data/seedData';
import { Post, Category, Tag, MediaItem, SiteSettings, ActivityLog } from './src/types';

const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
const DATA_DIR = isVercel ? '/tmp/data' : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface DatabaseSchema {
  posts: Post[];
  categories: Category[];
  tags: Tag[];
  media: MediaItem[];
  settings: SiteSettings;
  activity: ActivityLog[];
  adminPasswordHash: string; // Default: 'James1995.123'
}

// Ensure database file exists
export function loadDb(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
      console.warn('Failed to create DATA_DIR:', e);
    }
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const db: DatabaseSchema = JSON.parse(content);
      if (!db.adminPasswordHash || db.adminPasswordHash === 'admin123') {
        db.adminPasswordHash = 'James1995.123';
      }
      return db;
    } catch (err) {
      console.error('Failed to parse database file, resetting:', err);
    }
  }

  // Fallback to checking root data directory if committed
  const rootDb = path.join(process.cwd(), 'data', 'db.json');
  if (fs.existsSync(rootDb)) {
    try {
      const content = fs.readFileSync(rootDb, 'utf-8');
      const db: DatabaseSchema = JSON.parse(content);
      if (!db.adminPasswordHash || db.adminPasswordHash === 'admin123') {
        db.adminPasswordHash = 'James1995.123';
      }
      return db;
    } catch (err) {
      console.error('Failed to read root db.json:', err);
    }
  }

  const initialDb: DatabaseSchema = {
    posts: initialPosts,
    categories: initialCategories,
    tags: initialTags,
    media: initialMedia,
    settings: initialSettings,
    activity: initialActivityLogs,
    adminPasswordHash: 'James1995.123',
  };
  saveDb(initialDb);
  return initialDb;
}

export function saveDb(db: DatabaseSchema) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save database file to disk:', err);
  }
}

export function calculateReadingTime(text: string): { wordCount: number; readingTimeMinutes: number } {
  const words = text.trim().split(/\s+/).filter((w) => w.length > 0).length;
  const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));
  return { wordCount: words, readingTimeMinutes };
}

export function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function createExpressApp() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));

  const db = loadDb();
  const activeSessions = new Set<string>();

  // Helper middleware for protected admin routes
  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token && activeSessions.has(token)) {
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized. Admin session required.' });
    }
  };

  // --- API ENDPOINTS ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // GET /api/posts
  app.get('/api/posts', (req, res) => {
    const { status, category, tag, search, featured } = req.query;
    let filtered = [...db.posts];

    if (status && status !== 'all') {
      filtered = filtered.filter((p) => p.status === status);
    }

    if (category) {
      filtered = filtered.filter((p) => p.category.toLowerCase() === (category as string).toLowerCase());
    }

    if (tag) {
      filtered = filtered.filter((p) => p.tags.map((t) => t.toLowerCase()).includes((tag as string).toLowerCase()));
    }

    if (featured === 'true') {
      filtered = filtered.filter((p) => p.isFeatured);
    }

    if (search) {
      const q = (search as string).toLowerCase();
      filtered = filtered.filter(
        (p) => p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q) || p.content.toLowerCase().includes(q)
      );
    }

    // Sort: published / scheduled by publishedAt desc, drafts by updatedAt desc
    filtered.sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime());

    res.json(filtered);
  });

  // GET /api/posts/:idOrSlug
  app.get('/api/posts/:idOrSlug', (req, res) => {
    const { idOrSlug } = req.params;
    const post = db.posts.find((p) => p.id === idOrSlug || p.slug === idOrSlug);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Increment view count if requested
    if (req.query.incrementView === 'true') {
      post.viewsCount = (post.viewsCount || 0) + 1;
      saveDb(db);
    }

    res.json(post);
  });

  // POST /api/posts (Protected)
  app.post('/api/posts', requireAdmin, (req, res) => {
    const { title, slug, excerpt, content, category, tags, coverImage, coverImageAlt, status, isFeatured, seoTitle, seoDescription, footnotes } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const generateSlug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const finalSlug = slug ? generateSlug(slug) : generateSlug(title);

    // Check slug uniqueness
    const slugExists = db.posts.some((p) => p.slug === finalSlug);
    const uniqueSlug = slugExists ? `${finalSlug}-${Date.now().toString(36)}` : finalSlug;

    const { wordCount, readingTimeMinutes } = calculateReadingTime(content);
    const now = new Date().toISOString();

    const newPost: Post = {
      id: `post-${Date.now()}`,
      title,
      slug: uniqueSlug,
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
      footnotes: footnotes || []
    };

    db.posts.unshift(newPost);

    // Update category post count
    const catObj = db.categories.find((c) => c.name.toLowerCase() === newPost.category.toLowerCase());
    if (catObj) {
      catObj.count = (catObj.count || 0) + 1;
    }

    // Add activity log
    db.activity.unshift({
      id: `act-${Date.now()}`,
      action: `Post ${status === 'published' ? 'Published' : 'Created'}`,
      details: `Created "${title}" (${status})`,
      timestamp: now,
      type: 'post'
    });

    saveDb(db);
    res.status(201).json(newPost);
  });

  // PUT /api/posts/:id (Protected)
  app.put('/api/posts/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const postIndex = db.posts.findIndex((p) => p.id === id);

    if (postIndex === -1) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const existing = db.posts[postIndex];
    const { title, slug, excerpt, content, category, tags, coverImage, coverImageAlt, status, isFeatured, seoTitle, seoDescription, footnotes, scheduledAt } = req.body;

    const { wordCount, readingTimeMinutes } = calculateReadingTime(content || existing.content);
    const now = new Date().toISOString();

    const wasPublished = existing.status === 'published';
    const isNowPublished = status === 'published';

    const updatedPost: Post = {
      ...existing,
      title: title !== undefined ? title : existing.title,
      slug: slug !== undefined ? slug : existing.slug,
      excerpt: excerpt !== undefined ? excerpt : existing.excerpt,
      content: content !== undefined ? content : existing.content,
      category: category !== undefined ? category : existing.category,
      tags: tags !== undefined ? tags : existing.tags,
      coverImage: coverImage !== undefined ? coverImage : existing.coverImage,
      coverImageAlt: coverImageAlt !== undefined ? coverImageAlt : existing.coverImageAlt,
      status: status !== undefined ? status : existing.status,
      isFeatured: isFeatured !== undefined ? isFeatured : existing.isFeatured,
      seoTitle: seoTitle !== undefined ? seoTitle : existing.seoTitle,
      seoDescription: seoDescription !== undefined ? seoDescription : existing.seoDescription,
      footnotes: footnotes !== undefined ? footnotes : existing.footnotes,
      scheduledAt: scheduledAt !== undefined ? scheduledAt : existing.scheduledAt,
      wordCount,
      readingTimeMinutes,
      updatedAt: now,
      publishedAt: !wasPublished && isNowPublished ? now : existing.publishedAt
    };

    db.posts[postIndex] = updatedPost;

    db.activity.unshift({
      id: `act-${Date.now()}`,
      action: 'Post Updated',
      details: `Updated "${updatedPost.title}"`,
      timestamp: now,
      type: 'post'
    });

    saveDb(db);
    res.json(updatedPost);
  });

  // DELETE /api/posts/:id (Protected)
  app.delete('/api/posts/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const post = db.posts.find((p) => p.id === id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    db.posts = db.posts.filter((p) => p.id !== id);

    db.activity.unshift({
      id: `act-${Date.now()}`,
      action: 'Post Deleted',
      details: `Deleted "${post.title}"`,
      timestamp: new Date().toISOString(),
      type: 'post'
    });

    saveDb(db);
    res.json({ success: true, message: 'Post deleted successfully' });
  });

  // GET /api/categories
  app.get('/api/categories', (req, res) => {
    res.json(db.categories);
  });

  // POST /api/categories (Protected)
  app.post('/api/categories', requireAdmin, (req, res) => {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name,
      slug,
      description,
      count: 0
    };

    db.categories.push(newCat);

    db.activity.unshift({
      id: `act-${Date.now()}`,
      action: 'Category Created',
      details: `Created category "${name}"`,
      timestamp: new Date().toISOString(),
      type: 'category'
    });

    saveDb(db);
    res.status(201).json(newCat);
  });

  // PUT /api/categories/:id (Protected)
  app.put('/api/categories/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;

    const catIndex = db.categories.findIndex((c) => c.id === id);
    if (catIndex === -1) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const existing = db.categories[catIndex];
    const oldName = existing.name;
    const newName = name !== undefined ? name : existing.name;
    const newSlug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const updatedCat: Category = {
      ...existing,
      name: newName,
      slug: newSlug,
      description: description !== undefined ? description : existing.description
    };

    db.categories[catIndex] = updatedCat;

    // Reassign category on existing posts if category name changed
    if (oldName.toLowerCase() !== newName.toLowerCase()) {
      db.posts.forEach((p) => {
        if (p.category.toLowerCase() === oldName.toLowerCase()) {
          p.category = newName;
        }
      });
    }

    db.activity.unshift({
      id: `act-${Date.now()}`,
      action: 'Category Updated',
      details: `Updated category "${newName}"`,
      timestamp: new Date().toISOString(),
      type: 'category'
    });

    saveDb(db);
    res.json(updatedCat);
  });

  // DELETE /api/categories/:id (Protected)
  app.delete('/api/categories/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const cat = db.categories.find((c) => c.id === id);
    if (!cat) {
      return res.status(404).json({ error: 'Category not found' });
    }

    db.categories = db.categories.filter((c) => c.id !== id);
    const fallbackCategory = db.categories[0]?.name || 'General';

    // Reassign posts using deleted category to fallback category
    db.posts.forEach((p) => {
      if (p.category.toLowerCase() === cat.name.toLowerCase()) {
        p.category = fallbackCategory;
      }
    });

    db.activity.unshift({
      id: `act-${Date.now()}`,
      action: 'Category Deleted',
      details: `Deleted category "${cat.name}"`,
      timestamp: new Date().toISOString(),
      type: 'category'
    });

    saveDb(db);
    res.json({ success: true, message: 'Category deleted successfully' });
  });

  // GET /api/tags
  app.get('/api/tags', (req, res) => {
    res.json(db.tags);
  });

  // GET /api/media
  app.get('/api/media', (req, res) => {
    res.json(db.media);
  });

  // POST /api/media (Protected)
  app.post('/api/media', requireAdmin, (req, res) => {
    const { name, url, altText, sizeBytes, mimeType } = req.body;
    if (!url) return res.status(400).json({ error: 'Media URL is required' });

    const newMedia: MediaItem = {
      id: `media-${Date.now()}`,
      name: name || 'Uploaded Image',
      url,
      altText: altText || '',
      mimeType: mimeType || 'image/jpeg',
      sizeBytes: sizeBytes || 350000,
      createdAt: new Date().toISOString()
    };

    db.media.unshift(newMedia);

    db.activity.unshift({
      id: `act-${Date.now()}`,
      action: 'Media Uploaded',
      details: `Uploaded asset "${newMedia.name}"`,
      timestamp: new Date().toISOString(),
      type: 'media'
    });

    saveDb(db);
    res.status(201).json(newMedia);
  });

  // DELETE /api/media/:id (Protected)
  app.delete('/api/media/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    db.media = db.media.filter((m) => m.id !== id);
    saveDb(db);
    res.json({ success: true });
  });

  // GET /api/settings
  app.get('/api/settings', (req, res) => {
    res.json(db.settings);
  });

  // PUT /api/settings (Protected)
  app.put('/api/settings', requireAdmin, (req, res) => {
    db.settings = { ...db.settings, ...req.body };

    db.activity.unshift({
      id: `act-${Date.now()}`,
      action: 'Settings Updated',
      details: 'Updated site configuration settings',
      timestamp: new Date().toISOString(),
      type: 'settings'
    });

    saveDb(db);
    res.json(db.settings);
  });

  // GET /api/activity (Protected)
  app.get('/api/activity', requireAdmin, (req, res) => {
    res.json(db.activity.slice(0, 20));
  });

  // POST /api/auth/login
  app.post('/api/auth/login', (req, res) => {
    const { password } = req.body;
    if (password === db.adminPasswordHash) {
      const token = `token-${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
      activeSessions.add(token);

      db.activity.unshift({
        id: `act-${Date.now()}`,
        action: 'Admin Login',
        details: 'Admin logged in successfully',
        timestamp: new Date().toISOString(),
        type: 'auth'
      });
      saveDb(db);

      res.json({
        token,
        user: {
          username: 'Jurabek',
          role: 'Admin',
          lastLogin: new Date().toISOString()
        }
      });
    } else {
      res.status(401).json({ error: 'Invalid admin credentials' });
    }
  });

  // POST /api/auth/change-password (Protected)
  app.post('/api/auth/change-password', requireAdmin, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (currentPassword !== db.adminPasswordHash) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }
    db.adminPasswordHash = newPassword;
    saveDb(db);
    res.json({ success: true, message: 'Admin password updated successfully' });
  });

  // GET /api/auth/session
  app.get('/api/auth/session', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token && activeSessions.has(token)) {
      res.json({
        isAuthenticated: true,
        user: {
          username: 'Jurabek',
          role: 'Admin',
          lastLogin: new Date().toISOString()
        }
      });
    } else {
      res.json({ isAuthenticated: false, user: null });
    }
  });

  // POST /api/auth/logout
  app.post('/api/auth/logout', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      activeSessions.delete(token);
    }
    res.json({ success: true });
  });

  // --- TECHNICAL SEO ENDPOINTS ---

  // GET /robots.txt
  app.get('/robots.txt', (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.type('text/plain');
    res.send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
`);
  });

  // GET /sitemap.xml
  app.get('/sitemap.xml', (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const publishedPosts = db.posts.filter((p) => p.status === 'published');

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Static pages
    xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
    xml += `  <url>\n    <loc>${baseUrl}/writing</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    xml += `  <url>\n    <loc>${baseUrl}/contact</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;

    // Published posts
    for (const post of publishedPosts) {
      const postUrl = `${baseUrl}/blog/${post.slug}`;
      const lastMod = post.updatedAt || post.publishedAt || new Date().toISOString();
      xml += `  <url>\n    <loc>${postUrl}</loc>\n    <lastmod>${new Date(lastMod).toISOString()}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
    }

    // Categories
    for (const cat of db.categories) {
      xml += `  <url>\n    <loc>${baseUrl}/writing?category=${encodeURIComponent(cat.slug)}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
    }

    xml += `</urlset>`;
    res.type('application/xml');
    res.send(xml);
  });

  // GET /rss.xml or /feed.xml
  app.get(['/rss.xml', '/feed.xml', '/rss'], (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const publishedPosts = db.posts.filter((p) => p.status === 'published');

    let rss = `<?xml version="1.0" encoding="UTF-8" ?>\n`;
    rss += `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n`;
    rss += `<channel>\n`;
    rss += `  <title>${escapeXml(db.settings.title || 'Jurabek')}</title>\n`;
    rss += `  <link>${baseUrl}</link>\n`;
    rss += `  <description>${escapeXml(db.settings.description || '')}</description>\n`;
    rss += `  <language>uz</language>\n`;
    rss += `  <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />\n`;

    for (const post of publishedPosts) {
      const postUrl = `${baseUrl}/blog/${post.slug}`;
      const pubDate = new Date(post.publishedAt || post.createdAt).toUTCString();
      rss += `  <item>\n`;
      rss += `    <title>${escapeXml(post.title)}</title>\n`;
      rss += `    <link>${postUrl}</link>\n`;
      rss += `    <guid isPermaLink="true">${postUrl}</guid>\n`;
      rss += `    <pubDate>${pubDate}</pubDate>\n`;
      rss += `    <description>${escapeXml(post.excerpt || post.content.substring(0, 200))}</description>\n`;
      if (post.category) {
        rss += `    <category>${escapeXml(post.category)}</category>\n`;
      }
      rss += `  </item>\n`;
    }

    rss += `</channel>\n</rss>`;
    res.type('application/xml');
    res.send(rss);
  });

  return { app, db };
}

export default createExpressApp;
