'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { bulkPostAction, emptyTrash } from '@/app/admin/_actions/posts'
import type { AdminPostRow } from '@/lib/data/admin'
import { ScoreDot, useToast } from './ui'

function dateCell(row: AdminPostRow) {
  const now = Date.now()
  const d = row.publishedAt ? new Date(row.publishedAt) : null
  const fmt = (x: Date) =>
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(x)
  if (row.status === 'publish' && d && d.getTime() > now) return { label: 'Scheduled', value: fmt(d) }
  if (row.status === 'publish' && d) return { label: 'Published', value: fmt(d) }
  return { label: 'Last Modified', value: fmt(new Date(row.updatedAt)) }
}

export function PostsTable({
  rows,
  type,
  status,
  trashCount,
}: {
  rows: AdminPostRow[]
  type: 'post' | 'page'
  status: string
  trashCount: number
}) {
  const router = useRouter()
  const toast = useToast()
  const [selected, setSelected] = useState<number[]>([])
  const [bulk, setBulk] = useState('')
  const [pending, start] = useTransition()
  const base = type === 'post' ? '/admin/posts' : '/admin/pages'
  const inTrash = status === 'trash'

  const run = (ids: number[], action: Parameters<typeof bulkPostAction>[1]) => {
    if (action === 'delete' && !confirm('Delete permanently? This cannot be undone.')) return
    start(async () => {
      const res = await bulkPostAction(ids, action)
      if (res.ok) {
        toast.success(res.message || 'Done')
        setSelected([])
        router.refresh()
      } else toast.error(res.error)
    })
  }

  const allChecked = rows.length > 0 && selected.length === rows.length
  const now = Date.now()

  return (
    <>
      {toast.node}
      <div className="wpa-tablenav">
        <div className="wpa-tablenav__left">
          <select className="wpa-select wpa-input--sm" style={{ width: 'auto' }} value={bulk} onChange={(e) => setBulk(e.target.value)} aria-label="Bulk actions">
            <option value="">Bulk actions</option>
            {inTrash ? (
              <>
                <option value="restore">Restore</option>
                <option value="delete">Delete permanently</option>
              </>
            ) : (
              <>
                <option value="publish">Publish</option>
                <option value="draft">Switch to draft</option>
                <option value="trash">Move to Trash</option>
              </>
            )}
          </select>
          <button
            type="button"
            className="wpa-btn wpa-btn--sm"
            disabled={!bulk || !selected.length || pending}
            onClick={() => run(selected, bulk as Parameters<typeof bulkPostAction>[1])}
          >
            Apply
          </button>
          {inTrash && trashCount > 0 ? (
            <button
              type="button"
              className="wpa-btn wpa-btn--sm wpa-btn--danger"
              disabled={pending}
              onClick={() => {
                if (!confirm('Permanently delete everything in the Trash?')) return
                start(async () => {
                  await emptyTrash(type)
                  router.refresh()
                })
              }}
            >
              Empty Trash
            </button>
          ) : null}
        </div>
      </div>

      <div className="wpa-table-wrap">
        <table className="wpa-table">
          <thead>
            <tr>
              <th className="check-column">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={allChecked}
                  onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.id) : [])}
                />
              </th>
              <th>Title</th>
              {type === 'post' ? (
                <>
                  <th>Categories</th>
                  <th>Tags</th>
                </>
              ) : (
                <th>Template</th>
              )}
              <th title="SEO score">SEO</th>
              <th title="Readability score">Read.</th>
              <th>Keyphrase</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => {
                const date = dateCell(row)
                const states: string[] = []
                if (row.status === 'draft') states.push('Draft')
                if (row.status === 'pending') states.push('Pending')
                if (row.status === 'publish' && row.publishedAt && new Date(row.publishedAt).getTime() > now) states.push('Scheduled')
                if (row.sticky) states.push('Sticky')
                if (row.cornerstone) states.push('Cornerstone')
                if (row.noindex) states.push('noindex')
                if (type === 'page' && row.template === 'about') states.push('About template')
                const live = row.status === 'publish'
                return (
                  <tr key={row.id}>
                    <td className="check-column">
                      <input
                        type="checkbox"
                        aria-label={`Select ${row.title}`}
                        checked={selected.includes(row.id)}
                        onChange={(e) => setSelected((s) => (e.target.checked ? [...s, row.id] : s.filter((x) => x !== row.id)))}
                      />
                    </td>
                    <td style={{ minWidth: 260 }}>
                      {inTrash ? (
                        <span className="row-title">{row.title || '(no title)'}</span>
                      ) : (
                        <Link className="row-title" href={`${base}/${row.id}/`}>
                          {row.title || '(no title)'}
                        </Link>
                      )}
                      {states.length ? <span className="post-state"> — {states.join(', ')}</span> : null}
                      <div className="row-actions">
                        {inTrash ? (
                          <>
                            <button className="wpa-link-btn" type="button" onClick={() => run([row.id], 'restore')}>
                              Restore
                            </button>
                            <button className="wpa-link-btn wpa-link-btn--danger" type="button" onClick={() => run([row.id], 'delete')}>
                              Delete Permanently
                            </button>
                          </>
                        ) : (
                          <>
                            <Link href={`${base}/${row.id}/`}>Edit</Link>
                            <button className="wpa-link-btn wpa-link-btn--danger" type="button" onClick={() => run([row.id], 'trash')}>
                              Trash
                            </button>
                            {live ? (
                              <a href={`/${row.slug}/`} target="_blank" rel="noreferrer">
                                View
                              </a>
                            ) : (
                              <a href={`/draft-preview/${row.id}/`} target="_blank" rel="noreferrer">
                                Preview
                              </a>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    {type === 'post' ? (
                      <>
                        <td>
                          {row.categories.length
                            ? row.categories.map((c, i) => (
                                <span key={c.id}>
                                  {i ? ', ' : ''}
                                  <Link href={`/admin/posts/?cat=${c.id}`}>{c.name}</Link>
                                </span>
                              ))
                            : <span className="muted">—</span>}
                        </td>
                        <td className="muted">{row.tags.length ? row.tags.map((t) => t.name).join(', ') : '—'}</td>
                      </>
                    ) : (
                      <td className="muted">{row.template === 'about' ? 'Men haqimda' : row.template === 'full-width' ? 'Full width' : 'Default'}</td>
                    )}
                    <td>
                      <ScoreDot score={row.seoScore} label="SEO" />
                    </td>
                    <td>
                      <ScoreDot score={row.readabilityScore} label="Readability" />
                    </td>
                    <td className="muted" style={{ maxWidth: 160 }}>
                      {row.focusKeyphrase || '—'}
                    </td>
                    <td className="wpa-nowrap">
                      <div className="muted">{date.label}</div>
                      <div>{date.value}</div>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={8} className="wpa-table__empty">
                  No {type === 'post' ? 'posts' : 'pages'} found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
