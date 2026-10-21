import 'server-only'
import path from 'node:path'
import fs from 'node:fs/promises'
import { put, del } from '@vercel/blob'
import { imageSize } from 'image-size'
import { slugify } from '@/lib/content/text'

export type StorageKind = 'blob' | 'local' | 'none'

export function storageKind(): StorageKind {
  if (process.env.BLOB_READ_WRITE_TOKEN) return 'blob'
  // Vercel's filesystem is read-only/ephemeral: a Blob store is required there.
  if (process.env.VERCEL) return 'none'
  return 'local'
}

/** Folder for local uploads (development / self-hosting), served at /uploads/... */
export const LOCAL_UPLOAD_DIR = path.join(process.cwd(), '.uploads')

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024

export const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
  'application/pdf': 'pdf',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'audio/mpeg': 'mp3',
}

/** "Marketing Rasm (1).JPG" → "uploads/2026/10/marketing-rasm-1.jpg" (WordPress-like year/month folders). */
export function buildPathname(filename: string, mime: string): string {
  const ext = ALLOWED_TYPES[mime] || filename.split('.').pop()?.toLowerCase() || 'bin'
  const base = slugify(filename.replace(/\.[^.]+$/, ''), 80) || 'file'
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  return `uploads/${now.getFullYear()}/${mm}/${base}.${ext}`
}

export function readDimensions(buf: Buffer, mime: string): { width: number | null; height: number | null } {
  if (!mime.startsWith('image/')) return { width: null, height: null }
  try {
    const d = imageSize(buf)
    return { width: d.width ?? null, height: d.height ?? null }
  } catch {
    return { width: null, height: null }
  }
}

export interface StoredFile {
  url: string
  pathname: string
}

/** Save a file to Vercel Blob (production) or /public/uploads (local development). */
export async function storeFile(pathname: string, data: Buffer, contentType: string): Promise<StoredFile> {
  const kind = storageKind()
  if (kind === 'blob') {
    const blob = await put(pathname, data, {
      access: 'public',
      contentType,
      addRandomSuffix: true,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    })
    return { url: blob.url, pathname: blob.pathname }
  }
  if (kind === 'local') {
    const base = pathname.replace(/^uploads\//, '')
    let rel = base
    let full = path.join(LOCAL_UPLOAD_DIR, rel)
    let n = 1
    while (
      await fs
        .access(full)
        .then(() => true)
        .catch(() => false)
    ) {
      rel = base.replace(/(\.[^.]+)$/, `-${n++}$1`)
      full = path.join(LOCAL_UPLOAD_DIR, rel)
    }
    await fs.mkdir(path.dirname(full), { recursive: true })
    await fs.writeFile(full, data)
    return { url: `/uploads/${rel}`, pathname: `uploads/${rel}` }
  }
  throw new Error(
    'File storage is not configured. In Vercel: Storage → Create → Blob, connect it to this project, then redeploy (adds BLOB_READ_WRITE_TOKEN).',
  )
}

export async function deleteStoredFile(url: string): Promise<void> {
  try {
    if (/\.public\.blob\.vercel-storage\.com\//.test(url) && process.env.BLOB_READ_WRITE_TOKEN) {
      await del(url)
    } else if (url.startsWith('/uploads/') && storageKind() === 'local') {
      const full = path.join(LOCAL_UPLOAD_DIR, url.slice('/uploads/'.length))
      if (full.startsWith(LOCAL_UPLOAD_DIR)) await fs.unlink(full)
    }
  } catch (error) {
    console.warn('[storage] delete failed', error)
  }
}
