'use client'

import { useState } from 'react'
import type { AllSettings } from '@/lib/settings-defaults'
import { MediaPicker, type StorageMode } from './MediaLibrary'
import { CheckRow, SelectRow, TextRow, useSettingsForm } from './SettingsForm'
import { Tabs } from './ui'

export function GeneralSettingsScreen({
  general,
  reading,
  storage,
  envSiteUrl,
  initialTab,
}: {
  general: AllSettings['general']
  reading: AllSettings['reading']
  storage: StorageMode
  envSiteUrl: string
  initialTab: 'general' | 'reading'
}) {
  const [tab, setTab] = useState<'general' | 'reading'>(initialTab)
  const g = useSettingsForm('general', general)
  const r = useSettingsForm('reading', reading)
  const [picker, setPicker] = useState<null | 'logoUrl' | 'faviconUrl'>(null)

  return (
    <>
      {g.toastNode}
      {r.toastNode}
      <div className="wpa-head">
        <h1>Settings</h1>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'general', label: 'General' },
          { id: 'reading', label: 'Reading' },
        ]}
      />
      {tab === 'general' ? (
        <>
          <div className="wpa-box">
            <div className="wpa-box__body">
              <table className="wpa-form-table">
                <tbody>
                  <TextRow label="Site Title" value={g.value.siteName} onChange={(v) => g.set('siteName', v)} />
                  <TextRow label="Tagline" value={g.value.tagline} onChange={(v) => g.set('tagline', v)} help="In a few words, explain what this site is about. Shown under the logo." />
                  <TextRow
                    label="Site Address (URL)"
                    value={g.value.siteUrl}
                    onChange={(v) => g.set('siteUrl', v)}
                    placeholder={envSiteUrl}
                    help={<>Used for canonical URLs, sitemaps and social tags. Set to <code>https://www.jurabek.blog</code> once the domain points to Vercel. Empty = {envSiteUrl}.</>}
                  />
                  <SelectRow
                    label="Site Language"
                    value={g.value.language}
                    onChange={(v) => {
                      g.set('language', v)
                      g.set('locale', v === 'uz' ? 'uz_UZ' : v === 'ru' ? 'ru_RU' : 'en_US')
                    }}
                    options={[
                      { value: 'uz', label: "O'zbekcha" },
                      { value: 'ru', label: 'Русский' },
                      { value: 'en', label: 'English' },
                    ]}
                    help="Sets <html lang> and og:locale (WordPress was sending en_US by mistake)."
                  />
                  <TextRow label="Timezone" value={g.value.timezone} onChange={(v) => g.set('timezone', v)} help="IANA name, e.g. Asia/Tashkent." />
                  {(['logoUrl', 'faviconUrl'] as const).map((k) => (
                    <tr key={k}>
                      <th>{k === 'logoUrl' ? 'Logo' : 'Site Icon (favicon)'}</th>
                      <td>
                        <div className="wpa-flex">
                          {g.value[k] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={g.value[k]} alt="" style={{ height: 40, maxWidth: 160, objectFit: 'contain', background: '#f0f0f1', borderRadius: 4 }} />
                          ) : null}
                          <button type="button" className="wpa-btn wpa-btn--sm" onClick={() => setPicker(k)}>
                            {g.value[k] ? 'Change' : 'Select image'}
                          </button>
                          {g.value[k] ? (
                            <button type="button" className="wpa-link-btn" onClick={() => g.set(k, '')}>
                              Remove
                            </button>
                          ) : null}
                        </div>
                        <div className="wpa-help">{k === 'logoUrl' ? 'Optional. Without a logo the green initial + site title is shown (theme default).' : 'Square, 512×512. Without one, the green “J” icon is used.'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {g.saveBar}
        </>
      ) : (
        <>
          <div className="wpa-box">
            <div className="wpa-box__body">
              <table className="wpa-form-table">
                <tbody>
                  <TextRow label="Blog pages show at most" type="number" value={r.value.postsPerPage} onChange={(v) => r.set('postsPerPage', Number(v))} help="Posts per page on /blog/ and category/tag archives." />
                  <TextRow label="Homepage recent posts" type="number" value={r.value.homeRecentCount} onChange={(v) => r.set('homeRecentCount', Number(v))} help="Cards under “So'nggi postlar”." />
                  <TextRow label="Syndication feeds show the most recent" type="number" value={r.value.feedItems} onChange={(v) => r.set('feedItems', Number(v))} />
                  <CheckRow label="Feed shows excerpt only" checked={r.value.feedSummaryOnly} onChange={(v) => r.set('feedSummaryOnly', v)} />
                  <CheckRow
                    label="Discourage search engines"
                    checked={r.value.discourageSearchEngines}
                    onChange={(v) => r.set('discourageSearchEngines', v)}
                    help={<b style={{ color: r.value.discourageSearchEngines ? 'var(--a-red)' : undefined }}>When on, every page gets noindex and robots.txt blocks crawlers. Use only for staging.</b>}
                  />
                </tbody>
              </table>
            </div>
          </div>
          {r.saveBar}
        </>
      )}
      {picker ? (
        <MediaPicker
          storage={storage}
          onClose={() => setPicker(null)}
          onPick={(m) => {
            g.set(picker, m.url)
            setPicker(null)
          }}
        />
      ) : null}
    </>
  )
}
