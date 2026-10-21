'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { createTerm, deleteTerms } from '@/app/admin/_actions/terms'
import type { TermOption } from '@/lib/admin-types'
import { Field, useToast } from './ui'

function ordered(all: TermOption[], parentId: number | null = null, depth = 0): { term: TermOption; depth: number }[] {
  return all
    .filter((t) => (t.parentId ?? null) === parentId)
    .flatMap((t) => [{ term: t, depth }, ...ordered(all, t.id, depth + 1)])
}

export function TermsScreen({ taxonomy, terms, siteUrl }: { taxonomy: 'category' | 'tag'; terms: TermOption[]; siteUrl: string }) {
  const router = useRouter()
  const toast = useToast()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [parent, setParent] = useState<number | null>(null)
  const [description, setDescription] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [q, setQ] = useState('')
  const [pending, start] = useTransition()
  const isCat = taxonomy === 'category'
  const label = isCat ? 'Category' : 'Tag'
  const base = isCat ? '/admin/categories/' : '/admin/tags/'
  const rows = (isCat ? ordered(terms) : terms.map((t) => ({ term: t, depth: 0 }))).filter(
    (r) => !q || r.term.name.toLowerCase().includes(q.toLowerCase()),
  )
  // Orphans (parent missing) for categories.
  if (isCat) for (const t of terms) if (t.parentId && !terms.some((p) => p.id === t.parentId) && !rows.some((r) => r.term.id === t.id)) rows.push({ term: t, depth: 0 })

  return (
    <>
      {toast.node}
      <div className="wpa-head">
        <h1>{isCat ? 'Categories' : 'Tags'}</h1>
      </div>
      <div className="wpa-cols wpa-cols--left">
        <div>
          <h2 style={{ marginBottom: 12 }}>Add New {label}</h2>
          <form
            className="wpa-box"
            onSubmit={(e) => {
              e.preventDefault()
              start(async () => {
                const r = await createTerm({ taxonomy, name, slug, description, parentId: parent })
                if (r.ok) {
                  toast.success(`${label} added.`)
                  setName('')
                  setSlug('')
                  setDescription('')
                  setParent(null)
                  router.refresh()
                } else toast.error(r.error)
              })
            }}
          >
            <div className="wpa-box__body">
              <Field label="Name" htmlFor="t-name" help="The name is how it appears on your site.">
                <input id="t-name" className="wpa-input" required value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Slug" htmlFor="t-slug" help="The URL-friendly version of the name. Leave empty to generate it.">
                <input id="t-slug" className="wpa-input" value={slug} onChange={(e) => setSlug(e.target.value)} />
              </Field>
              {isCat ? (
                <Field label="Parent Category" htmlFor="t-parent" help="Categories can have a hierarchy, e.g. Digital marketing → Target.">
                  <select id="t-parent" className="wpa-select" value={parent ?? ''} onChange={(e) => setParent(e.target.value ? Number(e.target.value) : null)}>
                    <option value="">None</option>
                    {ordered(terms).map(({ term, depth }) => (
                      <option key={term.id} value={term.id}>
                        {'  '.repeat(depth)}
                        {term.name}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              <Field label="Description" htmlFor="t-desc" help="Shown on the archive page and used for the meta description.">
                <textarea id="t-desc" className="wpa-textarea" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
              </Field>
              <button className="wpa-btn wpa-btn--primary" type="submit" disabled={pending}>
                Add New {label}
              </button>
            </div>
          </form>
        </div>

        <div>
          <div className="wpa-tablenav">
            <div className="wpa-tablenav__left">
              <button
                type="button"
                className="wpa-btn wpa-btn--sm wpa-btn--danger"
                disabled={!selected.length || pending}
                onClick={() => {
                  if (!confirm(`Delete ${selected.length} ${label.toLowerCase()}(s)? Posts are kept.`)) return
                  start(async () => {
                    const r = await deleteTerms(selected)
                    if (r.ok) {
                      setSelected([])
                      router.refresh()
                    } else toast.error(r.error)
                  })
                }}
              >
                Delete selected
              </button>
            </div>
            <div className="wpa-tablenav__right">
              <input className="wpa-input wpa-input--sm" type="search" placeholder={`Search ${label.toLowerCase()}s`} value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          <div className="wpa-table-wrap">
            <table className="wpa-table">
              <thead>
                <tr>
                  <th className="check-column">
                    <input type="checkbox" aria-label="Select all" checked={rows.length > 0 && selected.length === rows.length} onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.term.id) : [])} />
                  </th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Slug</th>
                  <th>SEO</th>
                  <th className="wpa-right">Count</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map(({ term, depth }) => (
                    <tr key={term.id}>
                      <td className="check-column">
                        <input type="checkbox" checked={selected.includes(term.id)} onChange={(e) => setSelected((s) => (e.target.checked ? [...s, term.id] : s.filter((x) => x !== term.id)))} />
                      </td>
                      <td>
                        <Link className="row-title" href={`${base}${term.id}/`}>
                          {'— '.repeat(depth)}
                          {term.name}
                        </Link>
                        <div className="row-actions">
                          <Link href={`${base}${term.id}/`}>Edit</Link>
                          <a href={`${siteUrl}/${isCat ? 'category' : 'tag'}/${term.slug}/`} target="_blank" rel="noreferrer">
                            View
                          </a>
                        </div>
                      </td>
                      <td className="muted">{term.description || '—'}</td>
                      <td className="muted">{term.slug}</td>
                      <td className="muted">{term.seo.title || term.seo.metaDescription ? 'Custom' : 'Default'}{term.seo.robotsIndex === 'noindex' ? ' · noindex' : ''}</td>
                      <td className="wpa-right">
                        <Link href={`/admin/posts/?cat=${term.id}`}>{term.count}</Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="wpa-table__empty">
                      No {label.toLowerCase()}s found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
