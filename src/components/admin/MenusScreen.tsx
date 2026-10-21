'use client'

import { useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Trash2 } from 'lucide-react'
import type { AllSettings } from '@/lib/settings-defaults'
import type { MenuItem } from '@/lib/types'
import { useSettingsForm } from './SettingsForm'
import { Tabs } from './ui'

interface FlatItem {
  id: string
  label: string
  url: string
  newTab: boolean
  depth: 0 | 1
}

function flatten(items: MenuItem[]): FlatItem[] {
  return items.flatMap((i) => [
    { id: i.id, label: i.label, url: i.url, newTab: Boolean(i.newTab), depth: 0 as const },
    ...(i.children ?? []).map((c) => ({ id: c.id, label: c.label, url: c.url, newTab: Boolean(c.newTab), depth: 1 as const })),
  ])
}

function tree(flat: FlatItem[]): MenuItem[] {
  const out: MenuItem[] = []
  for (const f of flat) {
    const item: MenuItem = { id: f.id, label: f.label, url: f.url, ...(f.newTab ? { newTab: true } : {}) }
    if (f.depth === 1 && out.length) {
      const parent = out[out.length - 1]
      parent.children = [...(parent.children ?? []), item]
    } else out.push(item)
  }
  return out
}

const uid = () => Math.random().toString(36).slice(2, 10)

export function MenusScreen({
  initial,
  pages,
  categories,
}: {
  initial: AllSettings['menus']
  pages: { title: string; slug: string }[]
  categories: { name: string; path: string }[]
}) {
  const f = useSettingsForm('menus', initial)
  const [which, setWhich] = useState<'primary' | 'footer'>('primary')
  const [custom, setCustom] = useState({ label: '', url: '' })
  const items = flatten(f.value[which])
  const setItems = (next: FlatItem[]) => f.set(which, tree(next))
  const add = (label: string, url: string) => setItems([...items, { id: uid(), label, url, newTab: /^https?:/.test(url), depth: 0 }])
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[i], next[j]] = [next[j], next[i]]
    if (next[0].depth === 1) next[0] = { ...next[0], depth: 0 }
    setItems(next)
  }

  return (
    <>
      {f.toastNode}
      <div className="wpa-head">
        <h1>Menus</h1>
      </div>
      <Tabs
        value={which}
        onChange={setWhich}
        tabs={[
          { id: 'primary', label: 'Primary menu (header)' },
          { id: 'footer', label: 'Footer menu' },
        ]}
      />
      <div className="wpa-cols wpa-cols--left">
        <div>
          <div className="wpa-box">
            <div className="wpa-box__head">
              <h2>Pages</h2>
            </div>
            <div className="wpa-box__body">
              <ul className="wpa-list">
                <li>
                  <span>Home (Asosiy sahifa)</span>
                  <button type="button" className="wpa-btn wpa-btn--sm" onClick={() => add('Asosiy sahifa', '/')}>
                    Add
                  </button>
                </li>
                <li>
                  <span>Blog</span>
                  <button type="button" className="wpa-btn wpa-btn--sm" onClick={() => add('Blog', '/blog/')}>
                    Add
                  </button>
                </li>
                {pages.map((p) => (
                  <li key={p.slug}>
                    <span>{p.title}</span>
                    <button type="button" className="wpa-btn wpa-btn--sm" onClick={() => add(p.title, `/${p.slug}/`)}>
                      Add
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="wpa-box">
            <div className="wpa-box__head">
              <h2>Categories</h2>
            </div>
            <div className="wpa-box__body">
              {categories.length ? (
                <ul className="wpa-list">
                  {categories.map((c) => (
                    <li key={c.path}>
                      <span>{c.name}</span>
                      <button type="button" className="wpa-btn wpa-btn--sm" onClick={() => add(c.name, c.path)}>
                        Add
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="wpa-muted">No categories.</p>
              )}
            </div>
          </div>
          <div className="wpa-box">
            <div className="wpa-box__head">
              <h2>Custom link</h2>
            </div>
            <div className="wpa-box__body">
              <input className="wpa-input wpa-mb" placeholder="https://t.me/… or /path/" value={custom.url} onChange={(e) => setCustom({ ...custom, url: e.target.value })} />
              <input className="wpa-input wpa-mb" placeholder="Link text" value={custom.label} onChange={(e) => setCustom({ ...custom, label: e.target.value })} />
              <button
                type="button"
                className="wpa-btn wpa-btn--sm"
                disabled={!custom.url || !custom.label}
                onClick={() => {
                  add(custom.label, custom.url)
                  setCustom({ label: '', url: '' })
                }}
              >
                Add to Menu
              </button>
            </div>
          </div>
        </div>

        <div>
          <div className="wpa-box">
            <div className="wpa-box__head">
              <h2>Menu structure</h2>
              <span className="wpa-muted">{items.length} items</span>
            </div>
            <div className="wpa-box__body">
              {items.length ? (
                items.map((it, i) => (
                  <div key={it.id} className={`wpa-menu-item${it.depth ? ' wpa-menu-item--child' : ''}`}>
                    <span className="wpa-muted">{i + 1}.</span>
                    <input className="wpa-input wpa-input--sm" value={it.label} aria-label="Navigation label" onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                    <input className="wpa-input wpa-input--sm" value={it.url} aria-label="URL" onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
                    <div className="wpa-menu-item__btns">
                      <label className="wpa-check" title="Open in a new tab" style={{ margin: '0 6px 0 0' }}>
                        <input type="checkbox" checked={it.newTab} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, newTab: e.target.checked } : x)))} /> new tab
                      </label>
                      <button type="button" className="wpa-btn wpa-btn--ghost wpa-btn--sm" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                        <ArrowUp size={14} />
                      </button>
                      <button type="button" className="wpa-btn wpa-btn--ghost wpa-btn--sm" aria-label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                        <ArrowDown size={14} />
                      </button>
                      {which === 'primary' ? (
                        it.depth ? (
                          <button type="button" className="wpa-btn wpa-btn--ghost wpa-btn--sm" aria-label="Move out" onClick={() => setItems(items.map((x, j) => (j === i ? { ...x, depth: 0 } : x)))}>
                            <ArrowLeft size={14} />
                          </button>
                        ) : (
                          <button type="button" className="wpa-btn wpa-btn--ghost wpa-btn--sm" aria-label="Make sub-item" disabled={i === 0} onClick={() => setItems(items.map((x, j) => (j === i ? { ...x, depth: 1 } : x)))}>
                            <ArrowRight size={14} />
                          </button>
                        )
                      ) : null}
                      <button type="button" className="wpa-btn wpa-btn--ghost wpa-btn--sm" aria-label="Remove" onClick={() => setItems(items.filter((_, j) => j !== i))}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="wpa-empty">Add items from the left.</p>
              )}
            </div>
          </div>
          {f.saveBar}
        </div>
      </div>
    </>
  )
}
