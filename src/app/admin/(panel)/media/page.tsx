import type { Metadata } from 'next'
import { desc, sql } from 'drizzle-orm'
import { can, requireUser } from '@/lib/auth'
import { getDb, schema } from '@/lib/db'
import { toMediaItem } from '@/lib/data/admin'
import { storageKind } from '@/lib/storage'
import { MediaLibrary } from '@/components/admin/MediaLibrary'

export const metadata: Metadata = { title: 'Media Library' }

export default async function MediaPage() {
  const user = await requireUser('upload')
  const db = getDb()
  const [rows, [{ total }]] = await Promise.all([
    db.select().from(schema.media).orderBy(desc(schema.media.createdAt), desc(schema.media.id)).limit(60),
    db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(schema.media),
  ])
  return (
    <>
      <div className="wpa-head">
        <h1>Media Library</h1>
      </div>
      <p className="wpa-desc">
        Upload images once and reuse them anywhere. Visitors automatically get resized WebP/AVIF versions, so you can upload full-size photos.
      </p>
      <MediaLibrary storage={storageKind()} canDelete={can(user, 'edit_others')} initial={{ items: rows.map(toMediaItem), total }} />
    </>
  )
}
