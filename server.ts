import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { createExpressApp } from './api/index';

/**
 * Standalone Node server (local dev and `npm start`). Public pages are server-rendered by the
 * same handler Vercel uses (api/index.ts → api/ssr/renderPage.ts); only the HTML template differs.
 */
async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'custom' });
    const { app } = createExpressApp({
      getTemplate: async (req) => {
        const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
        return vite.transformIndexHtml(req.originalUrl, html);
      },
    });
    app.use(vite.middlewares);
    // Admin is a client-only SPA.
    app.get(['/admin', '/admin/*'], async (req, res, next) => {
      try {
        const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
        res.type('html').send(await vite.transformIndexHtml(req.originalUrl, html));
      } catch (e) {
        next(e);
      }
    });
    app.listen(PORT, '0.0.0.0', () => console.log(`Dev server on http://localhost:${PORT}`));
    return;
  }

  const distPath = path.join(process.cwd(), 'dist');
  const { app } = createExpressApp();
  app.use(express.static(distPath, { index: false }));
  app.get(['/admin', '/admin/*'], (_req, res) => res.sendFile(path.join(distPath, '_shell.html')));
  app.listen(PORT, '0.0.0.0', () => console.log(`Jurabek Publishing Platform running on http://localhost:${PORT}`));
}

startServer();
