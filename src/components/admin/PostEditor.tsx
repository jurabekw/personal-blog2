'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { ArrowDown, ArrowUp, ExternalLink, History, Plus, Trash2, X } from 'lucide-react'
import { bulkPostAction, getRevision, getRevisions, savePost, storePreview } from '@/app/admin/_actions/posts'
import { createTerm } from '@/app/admin/_actions/terms'
import type { MediaItem, PostInput, TermOption } from '@/lib/admin-types'
import type { FaqItem, PageTemplate, PostSeo } from '@/lib/types'
import { decodeEntities, slugify } from '@/lib/content/text'
import { RichEditor } from './RichEditor'
import { MediaPicker, type StorageMode } from './MediaLibrary'
import { SeoPanel, type SeoSiteSettings } from './SeoPanel'
import { Modal, ScoreDot, useToast, useUnsavedWarning } from './ui'

export interface EditorInitial {
  id?: number
  type: 'post' | 'page'
  title: string
  slug: string
  content: string
  excerpt: string
  status: 'draft' | 'pending' | 'publish' | 'trash'
  publishedAt: string | null
  updatedAt: string | null
  sticky: boolean
  template: PageTemplate
  parentId: number | null
  menuOrder: number
  categoryIds: number[]
  tagNames: string[]
  primaryCategoryId: number | null
  featuredImage: MediaItem | null
  seo: PostSeo
  faq: FaqItem[]
  seoScore: number | null
  readabilityScore: number | null
}

/** "2026-10-02T10:52" for <input type="datetime-local"> in the browser's timezone. */
function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  ).trim()
}

function CategoryTree({
  all,
  parentId,
  selected,
  toggle,
}: {
  all: TermOption[]
  parentId: number | null
  selected: number[]
  toggle: (id: number) => void
}) {
  const items = all.filter((c) => (c.parentId ?? null) === parentId)
  if (!items.length) return null
  return (
    <ul>
      {items.map((c) => (
        <li key={c.id}>
          <label className="wpa-check">
            <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} /> {c.name}
          </label>
          <CategoryTree all={all} parentId={c.id} selected={selected} toggle={toggle} />
        </li>
      ))}
    </ul>
  )
}

export function PostEditor({
  initial,
  categories: initialCategories,
  allTags,
  parents,
  site,
  siteUrl,
  usedKeyphrases,
  storage,
  canPublish,
}: {
  initial: EditorInitial
  categories: TermOption[]
  allTags: string[]
  parents: { id: number; title: string }[]
  site: SeoSiteSettings
  siteUrl: string
  usedKeyphrases: string[]
  storage: StorageMode
  canPublish: boolean
}) {
  const toast = useToast()
  const isPost = initial.type === 'post'
  const label = isPost ? 'Post' : 'Page'
  const listUrl = isPost ? '/admin/posts/' : '/admin/pages/'

  const [id, setId] = useState(initial.id)
  const [title, setTitle] = useState(initial.title)
  const [slug, setSlug] = useState(initial.slug)
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id))
  const [editingSlug, setEditingSlug] = useState(false)
  const [content, setContent] = useState(initial.content)
  const [excerpt, setExcerpt] = useState(initial.excerpt)
  const [status, setStatus] = useState(initial.status === 'trash' ? 'draft' : initial.status)
  const [savedStatus, setSavedStatus] = useState(initial.status)
  const [publishedAt, setPublishedAt] = useState(toLocalInput(initial.publishedAt))
  const [sticky, setSticky] = useState(initial.sticky)
  const [template, setTemplate] = useState<PageTemplate>(initial.template)
  const [parentId, setParentId] = useState<number | null>(initial.parentId)
  const [menuOrder, setMenuOrder] = useState(initial.menuOrder)
  const [categories, setCategories] = useState(initialCategories)
  const [categoryIds, setCategoryIds] = useState(initial.categoryIds)
  const [primaryCategoryId, setPrimaryCategoryId] = useState(initial.primaryCategoryId)
  const [tagNames, setTagNames] = useState(initial.tagNames)
  const [tagInput, setTagInput] = useState('')
  const [featured, setFeatured] = useState<MediaItem | null>(initial.featuredImage)
  const [seo, setSeo] = useState<PostSeo>(initial.seo)
  const [faq, setFaq] = useState<FaqItem[]>(initial.faq.map((q) => ({ question: q.question, answer: htmlToText(q.answer) })))
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(initial.updatedAt)
  const [scores, setScores] = useState({ seo: initial.seoScore, read: initial.readabilityScore })
  const [picker, setPicker] = useState(false)
  const [newCat, setNewCat] = useState<{ open: boolean; name: string; parent: number | null }>({ open: false, name: '', parent: null })
  const [revisionsOpen, setRevisionsOpen] = useState(false)
  const [revisions, setRevisions] = useState<{ id: number; title: string; createdAt: string; size: number }[]>([])
  const [backup, setBackup] = useState<{ at: string; data: Partial<PostInput> } | null>(null)
  const editorRef = useRef<Editor | null>(null)
  const [editorKey, setEditorKey] = useState(0)

  const input = useMemo<PostInput>(
    () => ({
      id,
      type: initial.type,
      title,
      slug,
      content,
      excerpt,
      status: status as PostInput['status'],
      publishedAt: publishedAt ? new Date(publishedAt).toISOString() : '',
      sticky,
      template,
      parentId,
      menuOrder,
      categoryIds,
      tagNames,
      primaryCategoryId,
      featuredImageId: featured?.id ?? null,
      seo,
      faq,
    }),
    [id, initial.type, title, slug, content, excerpt, status, publishedAt, sticky, template, parentId, menuOrder, categoryIds, tagNames, primaryCategoryId, featured, seo, faq],
  )
  const snapshot = useMemo(() => JSON.stringify({ ...input, status: undefined, publishedAt: undefined }), [input])
  const [savedSnapshot, setSavedSnapshot] = useState(snapshot)
  const dirty = snapshot !== savedSnapshot || status !== savedStatus
  useUnsavedWarning(dirty)

  // Local autosave backup (protects against closed tabs / lost connection).
  const backupKey = `jb-autosave-${id ?? `new-${initial.type}`}`
  useEffect(() => {
    try {
      const raw = localStorage.getItem(backupKey)
      if (!raw) return
      const b = JSON.parse(raw) as { at: string; data: Partial<PostInput> }
      if (!initial.updatedAt || new Date(b.at) > new Date(initial.updatedAt)) {
        if (b.data.content !== initial.content || b.data.title !== initial.title) setBackup(b)
      } else localStorage.removeItem(backupKey)
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (!dirty) return
    const t = setTimeout(() => {
      try {
        localStorage.setItem(backupKey, JSON.stringify({ at: new Date().toISOString(), data: { title, content, excerpt } }))
      } catch {
        /* quota */
      }
    }, 1500)
    return () => clearTimeout(t)
  }, [dirty, backupKey, title, content, excerpt])

  // Auto-slug from the title until the slug is edited manually.
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title))
  }, [title, slugTouched])

  const isScheduled = status === 'publish' && publishedAt && new Date(publishedAt).getTime() > Date.now()
  const live = savedStatus === 'publish'

  const save = useCallback(
    async (nextStatus?: PostInput['status']) => {
      setSaving(true)
      const payload = { ...input, status: nextStatus ?? input.status }
      if (payload.status === 'publish' && !payload.publishedAt) payload.publishedAt = ''
      const res = await savePost(payload)
      setSaving(false)
      if (!res.ok) {
        toast.error(res.error)
        return null
      }
      setId(res.id)
      setSlug(res.slug)
      setSlugTouched(true)
      setStatus(res.status as typeof status)
      setSavedStatus(res.status as typeof status)
      if (res.publishedAt) setPublishedAt(toLocalInput(res.publishedAt))
      setSavedAt(res.savedAt)
      setScores({ seo: res.seoScore, read: res.readabilityScore })
      setSavedSnapshot(JSON.stringify({ ...payload, id: res.id, slug: res.slug, status: undefined, publishedAt: undefined }))
      try {
        localStorage.removeItem(backupKey)
        localStorage.removeItem(`jb-autosave-new-${initial.type}`)
      } catch {
        /* ignore */
      }
      if (!id) window.history.replaceState(null, '', `${listUrl}${res.id}/`)
      const verb = res.status === 'publish' ? (new Date(res.publishedAt!).getTime() > Date.now() ? 'scheduled' : live ? 'updated' : 'published') : res.status === 'pending' ? 'submitted for review' : 'saved as draft'
      toast.success(`${label} ${verb}.${res.redirectCreated ? ` Redirect added: ${res.redirectCreated}` : ''}`)
      return res
    },
    [input, toast, backupKey, initial.type, id, listUrl, label, live],
  )

  // Ctrl/Cmd + S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (!saving) save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [save, saving])

  const preview = async () => {
    if (!id || savedStatus !== 'publish') {
      const res = await save(savedStatus === 'publish' ? 'publish' : (status === 'publish' ? 'draft' : status) as PostInput['status'])
      if (res) window.open(`/draft-preview/${res.id}/`, '_blank')
      return
    }
    const r = await storePreview(id, { title, content, excerpt })
    if (r.ok) window.open(`/draft-preview/${id}/?changes=1`, '_blank')
    else toast.error(r.error)
  }

  const toggleCat = (cid: number) =>
    setCategoryIds((ids) => {
      const next = ids.includes(cid) ? ids.filter((x) => x !== cid) : [...ids, cid]
      if (primaryCategoryId && !next.includes(primaryCategoryId)) setPrimaryCategoryId(null)
      return next
    })

  const addTags = (raw: string) => {
    const names = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (!names.length) return
    setTagNames((t) => [...t, ...names.filter((n) => !t.some((x) => x.toLowerCase() === n.toLowerCase()))])
    setTagInput('')
  }
  const tagSuggestions = tagInput.trim()
    ? allTags.filter((t) => t.toLowerCase().includes(tagInput.trim().toLowerCase()) && !tagNames.includes(t)).slice(0, 8)
    : []

  const selectedCats = categories.filter((c) => categoryIds.includes(c.id))
  const primaryName = categories.find((c) => c.id === (primaryCategoryId ?? categoryIds[0]))?.name
  const permalink = `${siteUrl}/${slug}/`

  return (
    <>
      {toast.node}
      <div className="wpa-head">
        <h1>{id ? `Edit ${label}` : `Add New ${label}`}</h1>
        {id ? (
          <Link className="wpa-btn" href={`${listUrl}new/`}>
            Add New {label}
          </Link>
        ) : null}
        <div className="wpa-head__actions">
          {live ? (
            <a className="wpa-btn" href={`/${slug}/`} target="_blank" rel="noreferrer">
              View {label} <ExternalLink size={14} />
            </a>
          ) : null}
        </div>
      </div>

      {backup ? (
        <div className="wpa-notice wpa-notice--warning">
          <p>
            There is an autosave of this {label.toLowerCase()} that is more recent than the version below ({new Date(backup.at).toLocaleString()}).{' '}
            <button
              type="button"
              className="wpa-link-btn"
              onClick={() => {
                if (backup.data.title !== undefined) setTitle(backup.data.title)
                if (backup.data.excerpt !== undefined) setExcerpt(backup.data.excerpt)
                if (backup.data.content !== undefined) {
                  setContent(backup.data.content)
                  editorRef.current?.commands.setContent(backup.data.content)
                }
                setBackup(null)
              }}
            >
              Restore the backup
            </button>{' '}
            ·{' '}
            <button
              type="button"
              className="wpa-link-btn"
              onClick={() => {
                localStorage.removeItem(backupKey)
                setBackup(null)
              }}
            >
              Dismiss
            </button>
          </p>
        </div>
      ) : null}

      <div className="wpa-cols">
        <div style={{ minWidth: 0 }}>
          <input
            className="wpa-input wpa-input--title"
            placeholder="Add title"
            aria-label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="wpa-permalink">
            <strong>Permalink:</strong>
            {editingSlug ? (
              <>
                <span>{siteUrl}/</span>
                <input
                  className="wpa-input wpa-input--sm"
                  style={{ width: 280 }}
                  autoFocus
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true)
                    setSlug(e.target.value)
                  }}
                  onBlur={() => {
                    setSlug((s) => slugify(s) || slugify(title))
                    setEditingSlug(false)
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
                />
                <span>/</span>
              </>
            ) : (
              <>
                <a href={live ? `/${slug}/` : undefined} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>
                  {permalink}
                </a>
                <button type="button" className="wpa-btn wpa-btn--sm" onClick={() => setEditingSlug(true)}>
                  Edit
                </button>
              </>
            )}
          </div>

          <RichEditor
            key={editorKey}
            value={content}
            onChange={setContent}
            storage={storage}
            onReady={(e) => {
              editorRef.current = e
            }}
          />

          <div className="wpa-mt" />
          <SeoPanel
            ctx={{
              type: initial.type,
              title,
              slug,
              html: content,
              excerpt,
              categories: selectedCats.map((c) => c.name),
              primaryCategory: primaryName,
              date: publishedAt ? new Date(publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : undefined,
              featuredImage: featured?.url,
              pathPrefix: '/',
            }}
            seo={seo}
            onChange={setSeo}
            onSlugChange={(s) => {
              setSlugTouched(true)
              setSlug(s)
            }}
            site={site}
            usedKeyphrases={usedKeyphrases}
            storage={storage}
          />

          <div className="wpa-box">
            <div className="wpa-box__head">
              <h2>FAQ (adds FAQ rich results)</h2>
              <button type="button" className="wpa-btn wpa-btn--sm" onClick={() => setFaq((f) => [...f, { question: '', answer: '' }])}>
                <Plus size={14} /> Add question
              </button>
            </div>
            <div className="wpa-box__body">
              {faq.length ? (
                faq.map((q, i) => (
                  <div key={i} className="wpa-box" style={{ marginBottom: 10 }}>
                    <div className="wpa-box__body">
                      <div className="wpa-between" style={{ marginBottom: 6 }}>
                        <b>Question {i + 1}</b>
                        <span className="wpa-flex">
                          <button type="button" className="wpa-btn wpa-btn--ghost wpa-btn--sm" disabled={i === 0} aria-label="Move up" onClick={() => setFaq((f) => { const n = [...f]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n })}>
                            <ArrowUp size={14} />
                          </button>
                          <button type="button" className="wpa-btn wpa-btn--ghost wpa-btn--sm" disabled={i === faq.length - 1} aria-label="Move down" onClick={() => setFaq((f) => { const n = [...f]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; return n })}>
                            <ArrowDown size={14} />
                          </button>
                          <button type="button" className="wpa-btn wpa-btn--ghost wpa-btn--sm" aria-label="Remove" onClick={() => setFaq((f) => f.filter((_, j) => j !== i))}>
                            <Trash2 size={14} />
                          </button>
                        </span>
                      </div>
                      <input className="wpa-input" placeholder="Question" value={q.question} onChange={(e) => setFaq((f) => f.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))} />
                      <textarea className="wpa-textarea wpa-mt" rows={3} placeholder="Answer" value={q.answer} onChange={(e) => setFaq((f) => f.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="wpa-muted" style={{ margin: 0 }}>
                  Add common questions and short answers. They appear at the end of the {label.toLowerCase()} and can show as rich results in Google and in AI answers.
                </p>
              )}
            </div>
          </div>

          <div className="wpa-box">
            <div className="wpa-box__head">
              <h2>Excerpt</h2>
            </div>
            <div className="wpa-box__body">
              <textarea className="wpa-textarea" rows={3} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} aria-label="Excerpt" />
              <p className="wpa-help">
                Optional hand-written summary. Shown on cards and under the title; used as the meta description when none is set.
              </p>
            </div>
          </div>
        </div>

        {/* ---------------- Sidebar ---------------- */}
        <div className="wpa-sticky">
          <div className="wpa-box">
            <div className="wpa-box__head">
              <h2>Publish</h2>
              <span className="wpa-flex">
                <ScoreDot score={scores.seo} label="SEO" />
                <ScoreDot score={scores.read} label="Readability" />
              </span>
            </div>
            <div className="wpa-box__body">
              <div className="wpa-between wpa-mb">
                <button type="button" className="wpa-btn wpa-btn--sm" disabled={saving} onClick={() => save(live ? 'publish' : status === 'publish' ? 'draft' : (status as PostInput['status']))}>
                  {live ? 'Save' : 'Save Draft'}
                </button>
                <button type="button" className="wpa-btn wpa-btn--sm" disabled={saving} onClick={preview}>
                  {live && dirty ? 'Preview Changes' : 'Preview'}
                </button>
              </div>
              <div className="wpa-field">
                <label className="wpa-label" htmlFor="pub-status">
                  Status
                </label>
                <select id="pub-status" className="wpa-select" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending Review</option>
                  {canPublish ? <option value="publish">{isScheduled ? 'Scheduled' : 'Published'}</option> : null}
                </select>
              </div>
              <div className="wpa-field">
                <label className="wpa-label" htmlFor="pub-date">
                  Publish date <small>(empty = immediately)</small>
                </label>
                <input id="pub-date" className="wpa-input" type="datetime-local" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} />
                {isScheduled ? <p className="wpa-help">Will go live automatically at this time (within the hour).</p> : null}
              </div>
              {isPost ? (
                <label className="wpa-check">
                  <input type="checkbox" checked={sticky} onChange={(e) => setSticky(e.target.checked)} /> Featured post (sticky, shown as “Tanlangan post”)
                </label>
              ) : null}
              {savedAt ? <p className="wpa-help">Last saved {new Date(savedAt).toLocaleString()}{dirty ? ' · unsaved changes' : ''}</p> : null}
            </div>
            <div className="wpa-box__foot">
              {id ? (
                <button
                  type="button"
                  className="wpa-link-btn wpa-link-btn--danger"
                  onClick={async () => {
                    if (!confirm(`Move this ${label.toLowerCase()} to the Trash?`)) return
                    const r = await bulkPostAction([id], 'trash')
                    if (r.ok) {
                      window.onbeforeunload = null
                      window.location.href = `${listUrl}?status=trash`
                    }
                  }}
                >
                  Move to Trash
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                className="wpa-btn wpa-btn--primary"
                disabled={saving}
                onClick={() => save(canPublish ? 'publish' : 'pending')}
              >
                {saving ? 'Saving…' : !canPublish ? 'Submit for Review' : live ? 'Update' : isScheduled ? 'Schedule' : 'Publish'}
              </button>
            </div>
          </div>

          {isPost ? (
            <>
              <div className="wpa-box">
                <div className="wpa-box__head">
                  <h2>Categories</h2>
                </div>
                <div className="wpa-box__body">
                  <div className="wpa-cat-tree">
                    {categories.length ? <CategoryTree all={categories} parentId={null} selected={categoryIds} toggle={toggleCat} /> : <p className="wpa-muted">No categories yet.</p>}
                  </div>
                  {categoryIds.length > 1 ? (
                    <div className="wpa-field wpa-mt">
                      <label className="wpa-label" htmlFor="primary-cat">
                        Primary category <small>(badge, breadcrumbs, %%primary_category%%)</small>
                      </label>
                      <select id="primary-cat" className="wpa-select" value={primaryCategoryId ?? ''} onChange={(e) => setPrimaryCategoryId(e.target.value ? Number(e.target.value) : null)}>
                        <option value="">Automatic ({selectedCats[0]?.name})</option>
                        {selectedCats.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                  {newCat.open ? (
                    <div className="wpa-mt">
                      <input className="wpa-input wpa-input--sm" placeholder="New category name" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} />
                      <select className="wpa-select wpa-input--sm wpa-mt" value={newCat.parent ?? ''} onChange={(e) => setNewCat({ ...newCat, parent: e.target.value ? Number(e.target.value) : null })}>
                        <option value="">— Parent category —</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="wpa-btn wpa-btn--sm wpa-mt"
                        onClick={async () => {
                          const r = await createTerm({ taxonomy: 'category', name: newCat.name, parentId: newCat.parent })
                          if (r.ok && r.data) {
                            setCategories((c) => [...c, r.data!].sort((a, b) => a.name.localeCompare(b.name)))
                            setCategoryIds((ids) => [...ids, r.data!.id])
                            setNewCat({ open: false, name: '', parent: null })
                          } else if (!r.ok) toast.error(r.error)
                        }}
                      >
                        Add New Category
                      </button>
                    </div>
                  ) : (
                    <button type="button" className="wpa-link-btn wpa-mt" onClick={() => setNewCat({ ...newCat, open: true })}>
                      + Add New Category
                    </button>
                  )}
                </div>
              </div>

              <div className="wpa-box">
                <div className="wpa-box__head">
                  <h2>Tags</h2>
                </div>
                <div className="wpa-box__body">
                  <div className="wpa-inline" style={{ position: 'relative' }}>
                    <input
                      className="wpa-input wpa-input--sm"
                      value={tagInput}
                      placeholder="Add tags, separated by commas"
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addTags(tagInput)
                        }
                      }}
                    />
                    <button type="button" className="wpa-btn wpa-btn--sm" onClick={() => addTags(tagInput)}>
                      Add
                    </button>
                    {tagSuggestions.length ? (
                      <div className="wpa-suggest">
                        {tagSuggestions.map((s) => (
                          <button key={s} type="button" onClick={() => addTags(s)}>
                            {s}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="wpa-chips">
                    {tagNames.map((t) => (
                      <span key={t} className="wpa-chip">
                        {t}
                        <button type="button" aria-label={`Remove ${t}`} onClick={() => setTagNames((x) => x.filter((n) => n !== t))}>
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="wpa-box">
              <div className="wpa-box__head">
                <h2>Page Attributes</h2>
              </div>
              <div className="wpa-box__body">
                <div className="wpa-field">
                  <label className="wpa-label" htmlFor="tpl">
                    Template
                  </label>
                  <select id="tpl" className="wpa-select" value={template} onChange={(e) => setTemplate(e.target.value as PageTemplate)}>
                    <option value="default">Default template</option>
                    <option value="about">Men haqimda (profile header + sidebar)</option>
                    <option value="full-width">Full width (no sidebar)</option>
                  </select>
                </div>
                <div className="wpa-field">
                  <label className="wpa-label" htmlFor="parent">
                    Parent
                  </label>
                  <select id="parent" className="wpa-select" value={parentId ?? ''} onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)}>
                    <option value="">(no parent)</option>
                    {parents.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="wpa-field">
                  <label className="wpa-label" htmlFor="order">
                    Order
                  </label>
                  <input id="order" className="wpa-input" type="number" value={menuOrder} onChange={(e) => setMenuOrder(Number(e.target.value) || 0)} />
                </div>
              </div>
            </div>
          )}

          <div className="wpa-box">
            <div className="wpa-box__head">
              <h2>Featured image</h2>
            </div>
            <div className="wpa-box__body">
              {featured ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="wpa-thumb" src={featured.url} alt={featured.alt} onClick={() => setPicker(true)} />
                  {!featured.alt ? <p className="wpa-help" style={{ color: '#b45309' }}>This image has no alt text — add it in Media for better SEO.</p> : null}
                  <div className="wpa-between wpa-mt">
                    <button type="button" className="wpa-link-btn" onClick={() => setPicker(true)}>
                      Replace
                    </button>
                    <button type="button" className="wpa-link-btn wpa-link-btn--danger" onClick={() => setFeatured(null)}>
                      Remove featured image
                    </button>
                  </div>
                </>
              ) : (
                <button type="button" className="wpa-link-btn" onClick={() => setPicker(true)}>
                  Set featured image
                </button>
              )}
              <p className="wpa-help">Recommended 1600×900 or larger. Also used as the social sharing image.</p>
            </div>
          </div>

          {id ? (
            <div className="wpa-box">
              <div className="wpa-box__head">
                <h2>Revisions</h2>
              </div>
              <div className="wpa-box__body">
                <button
                  type="button"
                  className="wpa-btn wpa-btn--sm"
                  onClick={async () => {
                    setRevisions(await getRevisions(id))
                    setRevisionsOpen(true)
                  }}
                >
                  <History size={14} /> Browse revisions
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {picker ? (
        <MediaPicker
          storage={storage}
          title="Featured image"
          button="Set featured image"
          onClose={() => setPicker(false)}
          onPick={(m) => {
            setFeatured(m)
            setPicker(false)
          }}
        />
      ) : null}

      {revisionsOpen ? (
        <Modal title="Revisions" onClose={() => setRevisionsOpen(false)} size="sm">
          {revisions.length ? (
            <ul className="wpa-list">
              {revisions.map((r, i) => (
                <li key={r.id}>
                  <span>
                    <b>{new Date(r.createdAt).toLocaleString()}</b>
                    {i === 0 ? <span className="wpa-badge wpa-badge--green" style={{ marginLeft: 6 }}>Current</span> : null}
                    <br />
                    <span className="wpa-muted">
                      {r.title || '(no title)'} · {Math.round(r.size / 1024)} KB
                    </span>
                  </span>
                  {i > 0 ? (
                    <button
                      type="button"
                      className="wpa-btn wpa-btn--sm"
                      onClick={async () => {
                        const rev = await getRevision(r.id)
                        if (!rev) return
                        setTitle(rev.title)
                        setExcerpt(rev.excerpt)
                        setContent(rev.content)
                        setEditorKey((k) => k + 1)
                        setRevisionsOpen(false)
                        toast.success('Revision loaded — review it, then click Update to keep it.')
                      }}
                    >
                      Restore
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="wpa-muted">No revisions yet.</p>
          )}
        </Modal>
      ) : null}
    </>
  )
}
