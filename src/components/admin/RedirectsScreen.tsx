'use client'

import { useState, useTransition } from 'react'
import { deleteRedirects, importRedirects, listRedirects, saveRedirect, type RedirectRowDto } from '@/app/admin/_actions/seo'
import { useToast } from './ui'

const TYPES = [
  { v: 301, l: '301 Moved Permanently' },
  { v: 302, l: '302 Found (temporary)' },
  { v: 307, l: '307 Temporary Redirect' },
  { v: 410, l: '410 Content Deleted' },
]

export function RedirectsScreen({ initial, siteUrl }: { initial: RedirectRowDto[]; siteUrl: string }) {
  const toast = useToast()
  const [rows, setRows] = useState(initial)
  const [form, setForm] = useState({ id: 0, source: '', target: '', statusCode: 301 })
  const [q, setQ] = useState('')
  const [csv, setCsv] = useState('')
  const [showCsv, setShowCsv] = useState(false)
  const [pending, start] = useTransition()
  const reload = async (query = q) => setRows(await listRedirects(query))

  return (
    <>
      {toast.node}
      <div className="wpa-head">
        <h1>Redirects</h1>
        <button type="button" className="wpa-btn" onClick={() => setShowCsv((v) => !v)}>
          Import CSV
        </button>
      </div>
      <p className="wpa-desc">
        Send visitors and Google from an old URL to a new one. Redirects are created automatically when you change a published post&apos;s or category&apos;s URL. Use “Old path/*” to match a whole folder.
      </p>

      {showCsv ? (
        <div className="wpa-box">
          <div className="wpa-box__body">
            <textarea className="wpa-textarea wpa-textarea--code" rows={6} placeholder={'/old-post/, /new-post/, 301\n/removed-page/, , 410'} value={csv} onChange={(e) => setCsv(e.target.value)} />
            <button
              type="button"
              className="wpa-btn wpa-btn--primary wpa-mt"
              disabled={pending || !csv.trim()}
              onClick={() =>
                start(async () => {
                  const r = await importRedirects(csv)
                  if (r.ok) {
                    toast.success(r.message || 'Imported')
                    setCsv('')
                    setShowCsv(false)
                  } else toast.error(r.error)
                  await reload()
                })
              }
            >
              Import
            </button>
          </div>
        </div>
      ) : null}

      <form
        className="wpa-box"
        onSubmit={(e) => {
          e.preventDefault()
          start(async () => {
            const r = await saveRedirect({ id: form.id || undefined, source: form.source, target: form.target, statusCode: form.statusCode })
            if (r.ok) {
              toast.success(r.message || 'Saved')
              setForm({ id: 0, source: '', target: '', statusCode: 301 })
              await reload()
            } else toast.error(r.error)
          })
        }}
      >
        <div className="wpa-box__body">
          <div className="wpa-grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) 220px auto', alignItems: 'end', gap: 10 }}>
            <div>
              <label className="wpa-label" htmlFor="r-src">Old URL (path)</label>
              <input id="r-src" className="wpa-input" required placeholder="/old-post-slug/" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
            </div>
            <div>
              <label className="wpa-label" htmlFor="r-tgt">New URL</label>
              <input id="r-tgt" className="wpa-input" placeholder="/new-post-slug/ or https://…" disabled={form.statusCode === 410} value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} />
            </div>
            <div>
              <label className="wpa-label" htmlFor="r-type">Type</label>
              <select id="r-type" className="wpa-select" value={form.statusCode} onChange={(e) => setForm({ ...form, statusCode: Number(e.target.value) })}>
                {TYPES.map((t) => (
                  <option key={t.v} value={t.v}>
                    {t.l}
                  </option>
                ))}
              </select>
            </div>
            <div className="wpa-flex">
              <button className="wpa-btn wpa-btn--primary" type="submit" disabled={pending}>
                {form.id ? 'Update' : 'Add redirect'}
              </button>
              {form.id ? (
                <button type="button" className="wpa-btn" onClick={() => setForm({ id: 0, source: '', target: '', statusCode: 301 })}>
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </form>

      <div className="wpa-tablenav">
        <span className="wpa-muted">{rows.length} redirects</span>
        <input
          className="wpa-input wpa-input--sm"
          type="search"
          placeholder="Search redirects"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            reload(e.target.value)
          }}
          style={{ width: 240 }}
        />
      </div>
      <div className="wpa-table-wrap">
        <table className="wpa-table">
          <thead>
            <tr>
              <th>Old URL</th>
              <th>New URL</th>
              <th>Type</th>
              <th className="wpa-right">Hits</th>
              <th>Note</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <a href={`${siteUrl}${r.source}${r.source.endsWith('*') ? '' : '/'}`} target="_blank" rel="noreferrer">
                      {r.source}
                    </a>
                  </td>
                  <td>{r.statusCode === 410 ? <span className="muted">— (deleted)</span> : r.target}</td>
                  <td>
                    <span className={`wpa-badge${r.statusCode === 410 ? ' wpa-badge--red' : r.statusCode === 301 ? ' wpa-badge--green' : ' wpa-badge--orange'}`}>{r.statusCode}</span>
                  </td>
                  <td className="wpa-right">{r.hits}</td>
                  <td className="muted" style={{ maxWidth: 240 }}>{r.note}</td>
                  <td className="wpa-nowrap">
                    <button type="button" className="wpa-link-btn" onClick={() => setForm({ id: r.id, source: r.source, target: r.target, statusCode: r.statusCode })}>
                      Edit
                    </button>{' '}
                    ·{' '}
                    <button
                      type="button"
                      className="wpa-link-btn wpa-link-btn--danger"
                      onClick={() =>
                        start(async () => {
                          if (!confirm(`Delete redirect ${r.source}?`)) return
                          await deleteRedirects([r.id])
                          await reload()
                        })
                      }
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="wpa-table__empty">
                  No redirects yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
