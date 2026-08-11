import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import createExpressApp, { escapeXml } from './api/serverApp';

async function startServer() {
  const { app, db } = createExpressApp();
  const PORT = 3000;

  // Vite & Static file middleware setup for development / standalone Node server
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    // Custom HTML transformer in dev mode for /blog/ articles
    app.use(async (req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.includes('.')) {
        return next();
      }

      if (req.path.startsWith('/blog/')) {
        const slug = req.path.replace('/blog/', '');
        const post = db.posts.find((p) => p.slug === slug || p.id === slug);
        if (post) {
          try {
            const indexPath = path.join(process.cwd(), 'index.html');
            let html = fs.readFileSync(indexPath, 'utf-8');
            const pageTitle = `${post.title} — ${db.settings.title || 'Jurabek'}`;
            const pageDesc = post.excerpt || post.content.substring(0, 160);
            const pageImage = post.coverImage || db.settings.authorAvatar || '';
            const host = req.get('host') || 'localhost:3000';
            const fullUrl = `${req.protocol}://${host}${req.originalUrl}`;

            const metaTags = `
    <title>${escapeXml(pageTitle)}</title>
    <meta name="description" content="${escapeXml(pageDesc)}" />
    <link rel="canonical" href="${fullUrl}" />
    <meta property="og:site_name" content="${escapeXml(db.settings.title || 'Jurabek')}" />
    <meta property="og:title" content="${escapeXml(pageTitle)}" />
    <meta property="og:description" content="${escapeXml(pageDesc)}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${fullUrl}" />
    ${pageImage ? `<meta property="og:image" content="${escapeXml(pageImage)}" />` : ''}
    <meta name="twitter:card" content="${pageImage ? 'summary_large_image' : 'summary'}" />
    <meta name="twitter:title" content="${escapeXml(pageTitle)}" />
    <meta name="twitter:description" content="${escapeXml(pageDesc)}" />
    ${pageImage ? `<meta name="twitter:image" content="${escapeXml(pageImage)}" />` : ''}
`;
            html = html.replace(/<title>.*?<\/title>/i, metaTags);
            html = await vite.transformIndexHtml(req.originalUrl, html);
            return res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
          } catch (e) {
            return next(e);
          }
        }
      }

      next();
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false }));

    app.get('*', (req, res) => {
      const isBlogPath = req.path.startsWith('/blog/');
      let pageTitle = db.settings.title || 'Jurabek';
      let pageDesc = db.settings.description || 'Sokin raqamli vositalar, marketing va vebsaytlar haqida platforma.';
      let pageImage = db.settings.authorAvatar || '';
      let pageType = 'website';

      if (isBlogPath) {
        const slug = req.path.replace('/blog/', '');
        const post = db.posts.find((p) => p.slug === slug || p.id === slug);
        if (post) {
          pageTitle = `${post.title} — ${db.settings.title || 'Jurabek'}`;
          pageDesc = post.excerpt || post.content.substring(0, 160);
          if (post.coverImage) pageImage = post.coverImage;
          pageType = 'article';
        }
      }

      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        let html = fs.readFileSync(indexPath, 'utf-8');
        const host = req.get('host') || 'localhost:3000';
        const fullUrl = `${req.protocol}://${host}${req.originalUrl}`;
        const metaTags = `
    <title>${escapeXml(pageTitle)}</title>
    <meta name="description" content="${escapeXml(pageDesc)}" />
    <link rel="canonical" href="${fullUrl}" />
    <meta property="og:site_name" content="${escapeXml(db.settings.title || 'Jurabek')}" />
    <meta property="og:title" content="${escapeXml(pageTitle)}" />
    <meta property="og:description" content="${escapeXml(pageDesc)}" />
    <meta property="og:type" content="${pageType}" />
    <meta property="og:url" content="${fullUrl}" />
    ${pageImage ? `<meta property="og:image" content="${escapeXml(pageImage)}" />` : ''}
    <meta name="twitter:card" content="${pageImage ? 'summary_large_image' : 'summary'}" />
    <meta name="twitter:title" content="${escapeXml(pageTitle)}" />
    <meta name="twitter:description" content="${escapeXml(pageDesc)}" />
    ${pageImage ? `<meta name="twitter:image" content="${escapeXml(pageImage)}" />` : ''}
`;
        html = html.replace(/<title>.*?<\/title>/i, metaTags);
        return res.send(html);
      }
      res.sendFile(indexPath);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Jurabek Publishing Platform running on http://localhost:${PORT}`);
  });
}

startServer();
