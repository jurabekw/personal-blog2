import path from 'node:path'
import fs from 'node:fs/promises'
import { LOCAL_UPLOAD_DIR } from '@/lib/storage'

const TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif', gif: 'image/gif',
  svg: 'image/svg+xml', ico: 'image/x-icon', pdf: 'application/pdf', mp4: 'video/mp4', webm: 'video/webm', mp3: 'audio/mpeg',
}

/** Serves locally stored uploads (development and self-hosting; Vercel uses Blob URLs instead). */
export async function GET(_req: Request, ctx: RouteContext<'/uploads/[...path]'>) {
  const parts = (await ctx.params).path.map((p) => decodeURIComponent(p))
  const full = path.join(LOCAL_UPLOAD_DIR, ...parts)
  if (!full.startsWith(LOCAL_UPLOAD_DIR + path.sep)) return new Response('Not found', { status: 404 })
  try {
    const data = await fs.readFile(full)
    const ext = full.split('.').pop()?.toLowerCase() || ''
    return new Response(data, {
      headers: {
        'Content-Type': TYPES[ext] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
        ...(ext === 'svg' ? { 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'" } : {}),
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
