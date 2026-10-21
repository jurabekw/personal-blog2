'use client'

import { useState, useTransition } from 'react'
import { listBulk, recalcScores, saveBulkRow, saveRobotsTxt, type BulkRow } from '@/app/admin/_actions/seo'
import { META_MAX, TITLE_MAX_PX, titleWidth } from '@/lib/seo/analysis'
import { ScoreDot, Tabs, useToast } from './ui'

function BulkEditor({ initial, titleTemplate }: { initial: BulkRow[]; titleTemplate: string }) {
  const toast = useToast()
  const [type, setType] = useState<'post' | 'page'>('post')
  const [rows, setRows] = useState(initial)
  const [edits, setEdits] = useState<Record<number, Partial<BulkRow>>>({})
  const [pending, start] = useTransition()
  const edit = (id: number, k: keyof BulkRow, v: string) => setEdits((e) => ({ ...e, [id]: { ...e[id], [k]: v } }))

  return (
    <>
      {toast.node}
      <div className="wpa-tablenav">
        <div className="wpa-tablenav__left">
          <select
            className="wpa-select wpa-input--sm"
            style={{ width: 'auto' }}
            value={type}
            onChange={(e) => {
              const t = e.target.value as 'post' | 'page'
              setType(t)
              start(async () => setRows(await listBulk(t)))
            }}
          >
            <option value="post">Posts</option>
            <option value="page">Pages</option>
          </select>
          <span className="wpa-muted">Edit titles, descriptions and keyphrases for many items at once. Empty title = template ({titleTemplate}).</span>
        </div>
      </div>
      <div className="wpa-table-wrap">
        <table className="wpa-table">
          <thead>
            <tr>
              <th>Title</th>
              <th style={{ width: '24%' }}>SEO title</th>
              <th style={{ width: '32%' }}>Meta description</th>
              <th style={{ width: '14%' }}>Focus keyphrase</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const e = { ...r, ...edits[r.id] }
              const changed = Boolean(edits[r.id])
              return (
                <tr key={r.id}>
                  <td>
                    <a href={`/admin/${r.type === 'page' ? 'pages' : 'posts'}/${r.id}/`}>{r.title || '(no title)'}</a>
                    <div className="muted">
                      <ScoreDot score={r.seoScore} label="SEO" /> /{r.slug}/ {r.status !== 'publish' ? `· ${r.status}` : ''}
                    </div>
                  </td>
                  <td>
                    <input className="wpa-input wpa-input--sm" value={e.seoTitle} placeholder="(template)" onChange={(x) => edit(r.id, 'seoTitle', x.target.value)} />
                    {e.seoTitle ? <div className="wpa-help" style={titleWidth(e.seoTitle) > TITLE_MAX_PX ? { color: '#b45309' } : undefined}>{titleWidth(e.seoTitle)}px</div> : null}
                  </td>
                  <td>
                    <textarea className="wpa-textarea" style={{ minHeight: 54 }} rows={2} value={e.metaDescription} onChange={(x) => edit(r.id, 'metaDescription', x.target.value)} />
                    <div className="wpa-help" style={e.metaDescription.length > META_MAX ? { color: '#b45309' } : undefined}>{e.metaDescription.length} chars</div>
                  </td>
                  <td>
                    <input className="wpa-input wpa-input--sm" value={e.focusKeyphrase} onChange={(x) => edit(r.id, 'focusKeyphrase', x.target.value)} />
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`wpa-btn wpa-btn--sm${changed ? ' wpa-btn--primary' : ''}`}
                      disabled={!changed || pending}
                      onClick={() =>
                        start(async () => {
                          const res = await saveBulkRow(r.id, { seoTitle: e.seoTitle, metaDescription: e.metaDescription, focusKeyphrase: e.focusKeyphrase })
                          if (res.ok) {
                            setEdits((x) => {
                              const n = { ...x }
                              delete n[r.id]
                              return n
                            })
                            setRows(await listBulk(type))
                            toast.success('Saved.')
                          } else toast.error(res.error)
                        })
                      }
                    >
                      Save
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

export function SeoTools({
  bulk,
  robotsTxt,
  defaultRobots,
  titleTemplate,
  isAdmin,
}: {
  bulk: BulkRow[]
  robotsTxt: string
  defaultRobots: string
  titleTemplate: string
  isAdmin: boolean
}) {
  const toast = useToast()
  const [tab, setTab] = useState<'bulk' | 'robots' | 'scores'>('bulk')
  const [robots, setRobots] = useState(robotsTxt)
  const [pending, start] = useTransition()
  return (
    <>
      {toast.node}
      <div className="wpa-head">
        <h1>SEO Tools</h1>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'bulk', label: 'Bulk editor' },
          { id: 'robots', label: 'robots.txt' },
          { id: 'scores', label: 'Recalculate scores' },
        ]}
      />
      {tab === 'bulk' ? <BulkEditor initial={bulk} titleTemplate={titleTemplate} /> : null}
      {tab === 'robots' ? (
        <div className="wpa-box">
          <div className="wpa-box__body">
            <p className="wpa-muted">
              Leave empty to use the recommended default (shown greyed out). The sitemap line is added automatically. <a href="/robots.txt" target="_blank">View robots.txt</a>
            </p>
            <textarea className="wpa-textarea wpa-textarea--code" rows={12} value={robots} placeholder={defaultRobots} onChange={(e) => setRobots(e.target.value)} disabled={!isAdmin} />
            <button
              type="button"
              className="wpa-btn wpa-btn--primary wpa-mt"
              disabled={pending || !isAdmin}
              onClick={() =>
                start(async () => {
                  const r = await saveRobotsTxt(robots)
                  if (r.ok) toast.success(r.message || 'Saved')
                  else toast.error(r.error)
                })
              }
            >
              Save robots.txt
            </button>
          </div>
        </div>
      ) : null}
      {tab === 'scores' ? (
        <div className="wpa-box">
          <div className="wpa-box__body">
            <p>Re-run the SEO and readability analysis for every post and page (useful after an import or after changing title templates).</p>
            <button
              type="button"
              className="wpa-btn wpa-btn--primary"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await recalcScores()
                  if (r.ok) toast.success(r.message || 'Done')
                  else toast.error(r.error)
                })
              }
            >
              {pending ? 'Analysing…' : 'Recalculate all scores'}
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
