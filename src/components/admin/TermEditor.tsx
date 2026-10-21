'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { updateTerm } from '@/app/admin/_actions/terms'
import type { TermOption } from '@/lib/admin-types'
import type { PostSeo, TermSeo } from '@/lib/types'
import type { StorageMode } from './MediaLibrary'
import { SeoPanel, type SeoSiteSettings } from './SeoPanel'
import { Field, useToast } from './ui'

export function TermEditor({
  term,
  taxonomy,
  all,
  site,
  storage,
  parentPath,
}: {
  term: TermOption
  taxonomy: 'category' | 'tag'
  all: TermOption[]
  site: SeoSiteSettings
  storage: StorageMode
  parentPath: string
}) {
  const toast = useToast()
  const [name, setName] = useState(term.name)
  const [slug, setSlug] = useState(term.slug)
  const [parentId, setParentId] = useState(term.parentId)
  const [description, setDescription] = useState(term.description)
  const [seo, setSeo] = useState<TermSeo>(term.seo)
  const [pending, start] = useTransition()
  const isCat = taxonomy === 'category'

  return (
    <>
      {toast.node}
      <div className="wpa-head">
        <h1>Edit {isCat ? 'Category' : 'Tag'}</h1>
        <Link className="wpa-btn" href={isCat ? '/admin/categories/' : '/admin/tags/'}>
          ← Back
        </Link>
      </div>
      <div className="wpa-cols">
        <div>
          <div className="wpa-box">
            <div className="wpa-box__body">
              <Field label="Name" htmlFor="name">
                <input id="name" className="wpa-input" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Slug" htmlFor="slug" help="Changing it adds a 301 redirect from the old URL automatically.">
                <input id="slug" className="wpa-input" value={slug} onChange={(e) => setSlug(e.target.value)} />
              </Field>
              {isCat ? (
                <Field label="Parent Category" htmlFor="parent">
                  <select id="parent" className="wpa-select" value={parentId ?? ''} onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)}>
                    <option value="">None</option>
                    {all
                      .filter((t) => t.id !== term.id)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                </Field>
              ) : null}
              <Field label="Description" htmlFor="desc" help="Shown at the top of the archive page; used as meta description by default.">
                <textarea id="desc" className="wpa-textarea" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
              </Field>
            </div>
          </div>
          <SeoPanel
            ctx={{ type: taxonomy, title: name, slug, html: '', excerpt: description, pathPrefix: parentPath }}
            seo={seo as PostSeo}
            onChange={(s) => setSeo(s as TermSeo)}
            site={site}
            usedKeyphrases={[]}
            storage={storage}
            showAnalysis={false}
          />
        </div>
        <div className="wpa-sticky">
          <div className="wpa-box">
            <div className="wpa-box__head">
              <h2>Update</h2>
            </div>
            <div className="wpa-box__body">
              <p className="wpa-muted">{term.count} posts</p>
              <button
                type="button"
                className="wpa-btn wpa-btn--primary wpa-btn--block"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await updateTerm(term.id, { taxonomy, name, slug, description, parentId, seo: seo as Record<string, unknown> })
                    if (r.ok) toast.success(r.message || 'Saved.')
                    else toast.error(r.error)
                  })
                }
              >
                {pending ? 'Saving…' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
