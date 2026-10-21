'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import type { AllSettings } from '@/lib/settings-defaults'
import { MediaPicker, type StorageMode } from './MediaLibrary'
import { RichEditor } from './RichEditor'
import { CheckRow, SelectRow, TextRow, useSettingsForm } from './SettingsForm'
import { Tabs } from './ui'

type Tab = 'author' | 'home' | 'texts' | 'brand' | 'sidebar'

export function AppearanceScreen({
  initial,
  pages,
  storage,
}: {
  initial: AllSettings['appearance']
  pages: { title: string; slug: string }[]
  storage: StorageMode
}) {
  const f = useSettingsForm('appearance', initial)
  const a = f.value
  const [tab, setTab] = useState<Tab>('author')
  const [picker, setPicker] = useState(false)

  const socials = a.author.socials
  const setSocials = (next: typeof socials) => f.set('author.socials', next)

  return (
    <>
      {f.toastNode}
      <div className="wpa-head">
        <h1>Customize</h1>
        <div className="wpa-head__actions">
          <a className="wpa-btn" href="/" target="_blank">
            View site
          </a>
        </div>
      </div>
      <p className="wpa-desc">The same options as the WordPress theme Customizer (Jurabek Blog: muallif, bosh sahifa, matnlar, brend) plus the sidebar widgets.</p>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'author', label: 'Author (muallif)' },
          { id: 'home', label: 'Homepage (bosh sahifa)' },
          { id: 'texts', label: 'Texts (matnlar)' },
          { id: 'brand', label: 'Brand (brend)' },
          { id: 'sidebar', label: 'Sidebar widgets' },
        ]}
      />
      <div className="wpa-box">
        <div className="wpa-box__body">
          {tab === 'author' ? (
            <table className="wpa-form-table">
              <tbody>
                <tr>
                  <td colSpan={2} className="wpa-muted">
                    Used in the “Men haqimda” widget, the homepage author card, the byline under posts and the About page — edit once, updated everywhere.
                  </td>
                </tr>
                <TextRow label="Name (Ism)" value={a.author.name} onChange={(v) => f.set('author.name', v)} />
                <TextRow label="Role (Kasb / lavozim)" value={a.author.role} onChange={(v) => f.set('author.role', v)} />
                <TextRow label="Short bio (Qisqa bio)" value={a.author.bio} multiline onChange={(v) => f.set('author.bio', v)} />
                <tr>
                  <th>Profile photo</th>
                  <td>
                    <div className="wpa-flex">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="wpa-avatar" src={a.author.photoUrl || '/images/profile.png'} alt="" width={64} height={64} />
                      <button type="button" className="wpa-btn wpa-btn--sm" onClick={() => setPicker(true)}>
                        Change photo
                      </button>
                      {a.author.photoUrl ? (
                        <button type="button" className="wpa-link-btn" onClick={() => f.set('author.photoUrl', '')}>
                          Use default
                        </button>
                      ) : null}
                    </div>
                    <div className="wpa-help">Square image, at least 300×300.</div>
                  </td>
                </tr>
                <tr>
                  <th>Social links</th>
                  <td>
                    {socials.map((s, i) => (
                      <div key={i} className="wpa-inline wpa-mb">
                        <input className="wpa-input" style={{ maxWidth: 160 }} placeholder="Telegram" value={s.label} onChange={(e) => setSocials(socials.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                        <input className="wpa-input" placeholder="https://t.me/username" value={s.url} onChange={(e) => setSocials(socials.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
                        <button type="button" className="wpa-btn wpa-btn--ghost wpa-btn--sm" aria-label="Remove" onClick={() => setSocials(socials.filter((_, j) => j !== i))}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <button type="button" className="wpa-btn wpa-btn--sm" onClick={() => setSocials([...socials, { label: '', url: '' }])}>
                      <Plus size={14} /> Add link
                    </button>
                  </td>
                </tr>
                <SelectRow
                  label="“Men haqimda” page"
                  value={a.author.aboutUrl}
                  onChange={(v) => f.set('author.aboutUrl', v)}
                  options={[{ value: '', label: '— None (hide the links) —' }, ...pages.map((p) => ({ value: `/${p.slug}/`, label: p.title }))]}
                />
              </tbody>
            </table>
          ) : null}

          {tab === 'home' ? (
            <>
              <table className="wpa-form-table">
                <tbody>
                  <CheckRow label="Show the hero block" checked={a.hero.enabled} onChange={(v) => f.set('hero.enabled', v)} />
                  <CheckRow label="Show the author card" checked={a.hero.card} onChange={(v) => f.set('hero.card', v)} />
                  <TextRow label="Badge (Kichik yorliq)" value={a.hero.badge} onChange={(v) => f.set('hero.badge', v)} />
                  <TextRow label="Headline (Sarlavha)" value={a.hero.title} onChange={(v) => f.set('hero.title', v)} help="This is the homepage H1 — include your main keyword." />
                  <TextRow label="Description (Tavsif)" value={a.hero.text} multiline onChange={(v) => f.set('hero.text', v)} />
                </tbody>
              </table>
              <h3 style={{ margin: '20px 0 8px' }}>Extra homepage content (optional)</h3>
              <p className="wpa-help" style={{ marginBottom: 8 }}>
                Shown under the hero, like content added to the front page with Elementor. Leave empty for the standard layout.
              </p>
              <RichEditor value={a.homeContent} onChange={(v) => f.set('homeContent', v)} storage={storage} placeholder="(empty)" />
            </>
          ) : null}

          {tab === 'texts' ? (
            <table className="wpa-form-table">
              <tbody>
                <TextRow label="Blog page title" value={a.blogTitle} onChange={(v) => f.set('blogTitle', v)} />
                <TextRow label="Blog page intro (izoh)" value={a.blogIntro} multiline onChange={(v) => f.set('blogIntro', v)} />
                <TextRow label="Footer text" value={a.footerText} multiline onChange={(v) => f.set('footerText', v)} />
                <TextRow label="Footer links heading" value={a.footerLinksTitle} onChange={(v) => f.set('footerLinksTitle', v)} help="Shown above the Footer menu (Appearance → Menus)." />
              </tbody>
            </table>
          ) : null}

          {tab === 'brand' ? (
            <table className="wpa-form-table">
              <tbody>
                <tr>
                  <th>Primary colour</th>
                  <td>
                    <div className="wpa-flex">
                      <input type="color" value={a.primaryColor} onChange={(e) => f.set('primaryColor', e.target.value)} style={{ width: 48, height: 34, padding: 2, border: '1px solid #8c8f94', borderRadius: 4 }} />
                      <input className="wpa-input" style={{ maxWidth: 140 }} value={a.primaryColor} onChange={(e) => f.set('primaryColor', e.target.value)} />
                      <button type="button" className="wpa-link-btn" onClick={() => f.set('primaryColor', '#1cca59')}>
                        Reset to #1cca59
                      </button>
                    </div>
                  </td>
                </tr>
                <TextRow label="Content width (px)" type="number" value={a.contentWidth} onChange={(v) => f.set('contentWidth', Number(v))} help="960–1440. Default 1180." />
                <TextRow label="Header button text" value={a.headerCtaText} onChange={(v) => f.set('headerCtaText', v)} help="Leave empty to hide the button." />
                <TextRow label="Header button link" value={a.headerCtaUrl} onChange={(v) => f.set('headerCtaUrl', v)} placeholder="https://t.me/…" />
              </tbody>
            </table>
          ) : null}

          {tab === 'sidebar' ? (
            <>
              {[
                { key: 'about', label: 'Men haqimda' },
                { key: 'blogNav', label: 'Blog navigatsiyasi' },
                { key: 'toc', label: 'Mundarija (table of contents, sticky on posts)' },
              ].map((w, idx) => {
                const widget = a.sidebar[w.key as keyof typeof a.sidebar]
                return (
                  <div key={w.key} className="wpa-box" style={{ marginBottom: 12 }}>
                    <div className="wpa-box__head">
                      <h2>
                        {idx + 1}. {w.label}
                      </h2>
                      <label className="wpa-switch">
                        <input type="checkbox" checked={widget.enabled} onChange={(e) => f.set(`sidebar.${w.key}.enabled`, e.target.checked)} />
                        <span>{widget.enabled ? 'Shown' : 'Hidden'}</span>
                      </label>
                    </div>
                    <div className="wpa-box__body">
                      <table className="wpa-form-table">
                        <tbody>
                          <TextRow label="Title" value={widget.title} onChange={(v) => f.set(`sidebar.${w.key}.title`, v)} />
                          {w.key === 'blogNav' ? (
                            <>
                              <CheckRow label="Show categories" checked={a.sidebar.blogNav.showCategories} onChange={(v) => f.set('sidebar.blogNav.showCategories', v)} />
                              <CheckRow label="Show recent posts" checked={a.sidebar.blogNav.showRecent} onChange={(v) => f.set('sidebar.blogNav.showRecent', v)} />
                              <TextRow label="Number of posts" type="number" value={a.sidebar.blogNav.recentCount} onChange={(v) => f.set('sidebar.blogNav.recentCount', Number(v))} />
                            </>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}
              <p className="wpa-help">
                <ArrowUp size={12} /> <ArrowDown size={12} /> Order is fixed like the theme setup: Men haqimda → Blog navigatsiyasi → Mundarija (last, so it can stick while reading).
              </p>
            </>
          ) : null}
        </div>
      </div>
      {f.saveBar}
      {picker ? (
        <MediaPicker
          storage={storage}
          title="Profile photo"
          onClose={() => setPicker(false)}
          onPick={(m) => {
            f.set('author.photoUrl', m.url)
            setPicker(false)
          }}
        />
      ) : null}
    </>
  )
}
