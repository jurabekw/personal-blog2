'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, FileText, Loader2, Upload } from 'lucide-react'
import { upload } from '@vercel/blob/client'
import { deleteMedia, listMedia, registerMedia, updateMedia, uploadMedia } from '@/app/admin/_actions/media'
import type { MediaItem } from '@/lib/admin-types'
import { slugify } from '@/lib/content/text'
import { formatBytes } from '@/lib/format'
import { Field, Modal } from './ui'

export type StorageMode = 'blob' | 'local' | 'none'

async function imageSize(file: File): Promise<{ width: number | null; height: number | null }> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return { width: null, height: null }
  try {
    const bmp = await createImageBitmap(file)
    const out = { width: bmp.width, height: bmp.height }
    bmp.close()
    return out
  } catch {
    return { width: null, height: null }
  }
}

export async function uploadFile(
  file: File,
  storage: StorageMode,
  onProgress?: (pct: number) => void,
): Promise<{ ok: true; item: MediaItem } | { ok: false; error: string }> {
  if (file.size > 20 * 1024 * 1024) return { ok: false, error: `${file.name}: larger than 20 MB.` }
  if (storage === 'blob') {
    try {
      const dims = await imageSize(file)
      const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
      const now = new Date()
      const pathname = `uploads/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${slugify(file.name.replace(/\.[^.]+$/, ''), 80) || 'file'}.${ext}`
      const blob = await upload(pathname, file, {
        access: 'public',
        handleUploadUrl: '/api/admin/blob-upload',
        contentType: file.type,
        onUploadProgress: (p) => onProgress?.(p.percentage),
      })
      const res = await registerMedia({
        url: blob.url,
        pathname: blob.pathname,
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        ...dims,
      })
      return res.ok && res.data ? { ok: true, item: res.data } : { ok: false, error: res.ok ? 'Upload failed' : res.error }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Upload failed' }
    }
  }
  if (storage === 'none') {
    return { ok: false, error: 'File storage is not set up. In Vercel, create a Blob store and connect it to this project.' }
  }
  const fd = new FormData()
  fd.append('file', file)
  onProgress?.(30)
  const res = await uploadMedia(fd)
  onProgress?.(100)
  return res.ok && res.data ? { ok: true, item: res.data } : { ok: false, error: res.ok ? 'Upload failed' : res.error }
}

function Thumb({ item }: { item: MediaItem }) {
  if (item.mimeType.startsWith('image/')) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.url} alt={item.alt} loading="lazy" />
  }
  return (
    <span className="wpa-media-item__file">
      <FileText size={28} />
      {item.filename}
    </span>
  )
}

export function MediaDetails({
  item,
  onSaved,
  onDeleted,
  canDelete,
}: {
  item: MediaItem
  onSaved: (m: MediaItem) => void
  onDeleted?: (id: number) => void
  canDelete?: boolean
}) {
  const [alt, setAlt] = useState(item.alt)
  const [title, setTitle] = useState(item.title)
  const [caption, setCaption] = useState(item.caption)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  useEffect(() => {
    setAlt(item.alt)
    setTitle(item.title)
    setCaption(item.caption)
    setMsg('')
  }, [item])
  const dirty = alt !== item.alt || title !== item.title || caption !== item.caption
  return (
    <div>
      <p className="wpa-muted" style={{ wordBreak: 'break-all' }}>
        <b style={{ color: 'var(--a-text)' }}>{item.filename}</b>
        <br />
        {new Date(item.createdAt).toLocaleDateString()} · {formatBytes(item.size)}
        {item.width ? ` · ${item.width}×${item.height}` : ''}
      </p>
      <Field label="Alternative text" help="Describe the image for screen readers and Google Images. Include the keyphrase when it fits.">
        <textarea className="wpa-textarea" rows={2} value={alt} onChange={(e) => setAlt(e.target.value)} />
      </Field>
      <Field label="Title">
        <input className="wpa-input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Caption">
        <textarea className="wpa-textarea" rows={2} value={caption} onChange={(e) => setCaption(e.target.value)} />
      </Field>
      <Field label="File URL">
        <div className="wpa-inline">
          <input className="wpa-input wpa-input--sm" readOnly value={item.url} onFocus={(e) => e.currentTarget.select()} />
          <button type="button" className="wpa-btn wpa-btn--sm" onClick={() => navigator.clipboard?.writeText(item.url).then(() => setMsg('URL copied'))}>
            Copy
          </button>
        </div>
      </Field>
      <div className="wpa-between">
        <button
          type="button"
          className="wpa-btn wpa-btn--primary"
          disabled={!dirty || saving}
          onClick={async () => {
            setSaving(true)
            const res = await updateMedia(item.id, { alt, title, caption })
            setSaving(false)
            if (res.ok && res.data) {
              onSaved(res.data)
              setMsg('Saved')
            } else setMsg(res.ok ? '' : res.error)
          }}
        >
          {saving ? 'Saving…' : 'Save details'}
        </button>
        {canDelete && onDeleted ? (
          <button
            type="button"
            className="wpa-link-btn wpa-link-btn--danger"
            onClick={async () => {
              if (!confirm('Delete this file permanently? Posts using it will show a broken image.')) return
              const res = await deleteMedia(item.id)
              if (res.ok) onDeleted(item.id)
              else setMsg(res.error)
            }}
          >
            Delete permanently
          </button>
        ) : null}
      </div>
      {msg ? <p className="wpa-help">{msg}</p> : null}
    </div>
  )
}

export function MediaLibrary({
  storage,
  picker = false,
  imagesOnly = false,
  onSelect,
  onPick,
  canDelete = false,
  initial,
}: {
  storage: StorageMode
  picker?: boolean
  imagesOnly?: boolean
  onSelect?: (item: MediaItem | null) => void
  onPick?: (item: MediaItem) => void
  canDelete?: boolean
  initial?: { items: MediaItem[]; total: number }
}) {
  const [items, setItems] = useState<MediaItem[]>(initial?.items ?? [])
  const [total, setTotal] = useState(initial?.total ?? 0)
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState<'' | 'image' | 'other'>(imagesOnly ? 'image' : '')
  const [selected, setSelected] = useState<MediaItem | null>(null)
  const [loading, setLoading] = useState(!initial)
  const [uploads, setUploads] = useState<{ name: string; pct: number; error?: string }[]>([])
  const [over, setOver] = useState(false)
  const [page, setPage] = useState(1)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(
    async (p = 1) => {
      setLoading(true)
      const res = await listMedia({ search, kind, page: p, perPage: 60 })
      setItems((prev) => (p === 1 ? res.items : [...prev, ...res.items]))
      setTotal(res.total)
      setPage(p)
      setLoading(false)
    },
    [search, kind],
  )

  useEffect(() => {
    const t = setTimeout(() => load(1), initial && !search && kind === (imagesOnly ? 'image' : '') ? 0 : 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, kind])

  useEffect(() => {
    onSelect?.(selected)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files)
    setUploads(list.map((f) => ({ name: f.name, pct: 0 })))
    for (let i = 0; i < list.length; i++) {
      const res = await uploadFile(list[i], storage, (pct) =>
        setUploads((u) => u.map((x, j) => (j === i ? { ...x, pct } : x))),
      )
      if (res.ok) {
        setItems((prev) => [res.item, ...prev])
        setTotal((t) => t + 1)
        setSelected(res.item)
        setUploads((u) => u.map((x, j) => (j === i ? { ...x, pct: 100 } : x)))
      } else {
        setUploads((u) => u.map((x, j) => (j === i ? { ...x, error: res.error } : x)))
      }
    }
    setTimeout(() => setUploads((u) => u.filter((x) => x.error)), 1500)
  }

  return (
    <div>
      <div
        className={`wpa-dropzone${over ? ' is-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
        }}
      >
        <Upload size={22} />
        <p style={{ margin: '6px 0' }}>Drop files to upload, or</p>
        <button type="button" className="wpa-btn" onClick={() => inputRef.current?.click()}>
          Select Files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple={!picker}
          accept={imagesOnly ? 'image/*' : 'image/*,application/pdf,video/mp4,video/webm,audio/mpeg'}
          hidden
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <p className="wpa-help">Maximum upload file size: 20 MB. Images are automatically resized and converted to WebP/AVIF for visitors.</p>
        {storage === 'none' ? (
          <p className="wpa-notice wpa-notice--warning" style={{ textAlign: 'left', marginTop: 10 }}>
            Uploads are disabled until a Vercel Blob store is connected (Vercel → Storage → Blob → Connect to project).
          </p>
        ) : null}
        {uploads.map((u, i) => (
          <div key={i} style={{ textAlign: 'left', marginTop: 8 }}>
            <div className="wpa-between">
              <span>{u.name}</span>
              <span className={u.error ? '' : 'wpa-muted'} style={u.error ? { color: 'var(--a-red)' } : undefined}>
                {u.error ?? `${Math.round(u.pct)}%`}
              </span>
            </div>
            {!u.error ? (
              <div className="wpa-progress">
                <span style={{ width: `${u.pct}%` }} />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="wpa-tablenav">
        <div className="wpa-tablenav__left">
          {!imagesOnly ? (
            <select className="wpa-select wpa-input--sm" style={{ width: 'auto' }} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
              <option value="">All media items</option>
              <option value="image">Images</option>
              <option value="other">Documents & video</option>
            </select>
          ) : null}
          <span className="wpa-muted">
            {total} item{total === 1 ? '' : 's'}
          </span>
        </div>
        <div className="wpa-tablenav__right">
          <input className="wpa-input wpa-input--sm" type="search" placeholder="Search media" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 220 }} />
        </div>
      </div>

      <div className={selected ? 'wpa-media-detail' : undefined}>
        <div>
          {loading && !items.length ? (
            <p className="wpa-empty">
              <Loader2 className="wpa-spin" size={18} /> Loading…
            </p>
          ) : items.length ? (
            <div className="wpa-media-grid">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`wpa-media-item${selected?.id === item.id ? ' is-selected' : ''}`}
                  onClick={() => setSelected(selected?.id === item.id ? null : item)}
                  onDoubleClick={() => picker && onPick?.(item)}
                  title={item.filename}
                >
                  <Thumb item={item} />
                  {selected?.id === item.id ? (
                    <span className="wpa-media-item__check">
                      <Check size={14} />
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <p className="wpa-empty">No media files found.</p>
          )}
          {items.length < total ? (
            <p style={{ textAlign: 'center', marginTop: 14 }}>
              <button type="button" className="wpa-btn" onClick={() => load(page + 1)} disabled={loading}>
                {loading ? 'Loading…' : 'Load more'}
              </button>
            </p>
          ) : null}
        </div>
        {selected ? (
          <div className="wpa-box" style={{ alignSelf: 'start' }}>
            <div className="wpa-box__head">
              <h2>Attachment details</h2>
            </div>
            <div className="wpa-box__body">
              {selected.mimeType.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.url} alt="" style={{ width: '100%', borderRadius: 4, marginBottom: 10, background: '#f0f0f1' }} />
              ) : null}
              <MediaDetails
                item={selected}
                canDelete={canDelete}
                onSaved={(m) => {
                  setItems((list) => list.map((x) => (x.id === m.id ? m : x)))
                  setSelected(m)
                }}
                onDeleted={(id) => {
                  setItems((list) => list.filter((x) => x.id !== id))
                  setTotal((t) => t - 1)
                  setSelected(null)
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** Modal wrapper: "Select or upload media". */
export function MediaPicker({
  storage,
  title = 'Select or upload media',
  button = 'Select',
  imagesOnly = true,
  onPick,
  onClose,
}: {
  storage: StorageMode
  title?: string
  button?: string
  imagesOnly?: boolean
  onPick: (item: MediaItem) => void
  onClose: () => void
}) {
  const [sel, setSel] = useState<MediaItem | null>(null)
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="wpa-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="wpa-btn wpa-btn--primary" disabled={!sel} onClick={() => sel && onPick(sel)}>
            {button}
          </button>
        </>
      }
    >
      <MediaLibrary storage={storage} picker imagesOnly={imagesOnly} onSelect={setSel} onPick={onPick} />
    </Modal>
  )
}
