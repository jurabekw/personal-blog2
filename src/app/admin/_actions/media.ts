'use server'

import { and, desc, eq, ilike, like, or, sql, type SQL } from 'drizzle-orm'
import { getDb, schema } from '@/lib/db'
import { can, requireUser } from '@/lib/auth'
import { toMediaItem } from '@/lib/data/admin'
import { sanitizePlain } from '@/lib/content/sanitize'
import { ALLOWED_TYPES, MAX_UPLOAD_BYTES, buildPathname, deleteStoredFile, readDimensions, storeFile } from '@/lib/storage'
import { revalidateSite } from '@/lib/revalidate'
import type { ActionResult, MediaItem } from '@/lib/admin-types'

const { media } = schema

export async function listMedia(opts: { search?: string; kind?: 'image' | 'other' | ''; page?: number; perPage?: number }): Promise<{ items: MediaItem[]; total: number }> {
  await requireUser()
  const db = getDb()
  const conds: SQL[] = []
  if (opts.search?.trim()) {
    const q = `%${opts.search.trim()}%`
    conds.push(or(ilike(media.filename, q), ilike(media.title, q), ilike(media.alt, q))!)
  }
  if (opts.kind === 'image') conds.push(like(media.mimeType, 'image/%'))
  if (opts.kind === 'other') conds.push(sql`${media.mimeType} not like 'image/%'`)
  const where = conds.length ? and(...conds) : undefined
  const perPage = Math.min(200, opts.perPage ?? 60)
  const page = Math.max(1, opts.page ?? 1)
  const [rows, [{ total }]] = await Promise.all([
    db.select().from(media).where(where).orderBy(desc(media.createdAt), desc(media.id)).limit(perPage).offset((page - 1) * perPage),
    db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(media).where(where),
  ])
  return { items: rows.map(toMediaItem), total }
}

/** Register a file the browser uploaded directly to Vercel Blob. */
export async function registerMedia(input: {
  url: string
  pathname: string
  filename: string
  mimeType: string
  size: number
  width: number | null
  height: number | null
}): Promise<ActionResult<MediaItem>> {
  const user = await requireUser()
  if (!can(user, 'upload')) return { ok: false, error: 'Not allowed.' }
  if (!/^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\//.test(input.url)) return { ok: false, error: 'Unexpected file location.' }
  if (!ALLOWED_TYPES[input.mimeType]) return { ok: false, error: 'This file type is not allowed.' }
  const [row] = await getDb()
    .insert(media)
    .values({
      url: input.url,
      pathname: input.pathname,
      filename: sanitizePlain(input.filename).slice(0, 200),
      mimeType: input.mimeType,
      size: Math.max(0, Math.round(input.size)),
      width: input.width,
      height: input.height,
      title: sanitizePlain(input.filename.replace(/\.[^.]+$/, '')).slice(0, 200),
      uploadedBy: user.id,
    })
    .returning()
  return { ok: true, data: toMediaItem(row) }
}

/** Server-side upload (local development, or small files without Blob client uploads). */
export async function uploadMedia(form: FormData): Promise<ActionResult<MediaItem>> {
  const user = await requireUser()
  if (!can(user, 'upload')) return { ok: false, error: 'Not allowed.' }
  const file = form.get('file')
  if (!(file instanceof File)) return { ok: false, error: 'No file received.' }
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: 'File is larger than 20 MB.' }
  const mime = file.type || 'application/octet-stream'
  if (!ALLOWED_TYPES[mime]) return { ok: false, error: `File type ${mime} is not allowed.` }
  try {
    const buf = Buffer.from(await file.arrayBuffer())
    const stored = await storeFile(buildPathname(file.name, mime), buf, mime)
    const dims = readDimensions(buf, mime)
    const [row] = await getDb()
      .insert(media)
      .values({
        url: stored.url,
        pathname: stored.pathname,
        filename: sanitizePlain(file.name).slice(0, 200),
        mimeType: mime,
        size: file.size,
        width: dims.width,
        height: dims.height,
        title: sanitizePlain(file.name.replace(/\.[^.]+$/, '')).slice(0, 200),
        uploadedBy: user.id,
      })
      .returning()
    return { ok: true, data: toMediaItem(row) }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Upload failed.' }
  }
}

export async function updateMedia(id: number, data: { alt: string; title: string; caption: string }): Promise<ActionResult<MediaItem>> {
  await requireUser('upload')
  const [row] = await getDb()
    .update(media)
    .set({ alt: sanitizePlain(data.alt).slice(0, 500), title: sanitizePlain(data.title).slice(0, 300), caption: sanitizePlain(data.caption).slice(0, 1000) })
    .where(eq(media.id, id))
    .returning()
  if (!row) return { ok: false, error: 'Not found.' }
  revalidateSite()
  return { ok: true, data: toMediaItem(row) }
}

export async function deleteMedia(id: number): Promise<ActionResult> {
  await requireUser('edit_others')
  const db = getDb()
  const [row] = await db.select().from(media).where(eq(media.id, id)).limit(1)
  if (!row) return { ok: false, error: 'Not found.' }
  await db.delete(media).where(eq(media.id, id))
  await deleteStoredFile(row.url)
  revalidateSite()
  return { ok: true, message: 'File deleted.' }
}
