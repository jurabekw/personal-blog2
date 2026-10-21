'use client'

import { useRef, useState } from 'react'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import {
  cleanupUncategorized,
  wpDiscover,
  wpFinish,
  wpImportOne,
  wxrFinish,
  wxrImportOne,
  wxrImportTerms,
  type DiscoveredItem,
  type ImportFlags,
} from '@/app/admin/_actions/import'
import { parseWxr } from '@/lib/import/wxr'
import { Field, Tabs } from './ui'

interface LogLine {
  kind: 'info' | 'ok' | 'warn' | 'error'
  text: string
}

export function ImportScreen({ defaultUrl, storageReady }: { defaultUrl: string; storageReady: boolean }) {
  const [tab, setTab] = useState<'rest' | 'wxr'>('rest')
  const [url, setUrl] = useState(defaultUrl)
  const [username, setUsername] = useState('')
  const [appPassword, setAppPassword] = useState('')
  const [flags, setFlags] = useState<ImportFlags>({ downloadImages: true, overwrite: true, importSeo: true })
  const [siteInfo, setSiteInfo] = useState(true)
  const [homeContent, setHomeContent] = useState(false)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [log, setLog] = useState<LogLine[]>([])
  const [finished, setFinished] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const add = (kind: LogLine['kind'], text: string) => setLog((l) => [...l, { kind, text }])

  const runRest = async () => {
    setRunning(true)
    setFinished(false)
    setLog([])
    const conn = { url, username: username || undefined, appPassword: appPassword || undefined }
    add('info', `Connecting to ${url} …`)
    const d = await wpDiscover(conn)
    if (!d.ok || !d.items) {
      add('error', d.error || 'Could not read the WordPress REST API. Check the URL (and that /wp-json/ is reachable).')
      setRunning(false)
      return
    }
    add('ok', `Found “${d.site?.name}”: ${d.items.filter((i) => i.type === 'post').length} posts, ${d.items.filter((i) => i.type === 'page').length} pages, ${d.terms?.categories} categories, ${d.terms?.tags} tags.`)
    const front = d.items.find((i) => i.role === 'front')
    const blog = d.items.find((i) => i.role === 'blog')
    const work: DiscoveredItem[] = d.items.filter((i) => !i.role)
    setProgress({ done: 0, total: work.length })
    for (let i = 0; i < work.length; i++) {
      const item = work[i]
      const r = await wpImportOne(conn, { type: item.type, id: item.id }, flags)
      add(r.ok ? (r.warnings.length && r.action !== 'skipped' ? 'warn' : 'ok') : 'error', `${item.type === 'page' ? 'Page' : 'Post'} “${r.title}” — ${r.action}${r.images ? `, ${r.images} image${r.images === 1 ? '' : 's'}` : ''}${r.warnings.length ? ` (${r.warnings.slice(0, 2).join('; ')})` : ''}`)
      setProgress({ done: i + 1, total: work.length })
    }
    add('info', 'Finishing: homepage SEO, site info, SEO scores…')
    const f = await wpFinish(conn, {
      frontId: front?.id,
      blogId: blog?.id,
      site: d.site ? { name: d.site.name, description: d.site.description } : undefined,
      importSiteInfo: siteInfo,
      importHomeContent: homeContent,
      downloadImages: flags.downloadImages,
    })
    f.log.forEach((t) => add('ok', t))
    await cleanupUncategorized()
    add('ok', 'Import complete. All pages were refreshed.')
    setFinished(true)
    setRunning(false)
  }

  const runWxr = async (file: File) => {
    setRunning(true)
    setFinished(false)
    setLog([])
    add('info', `Reading ${file.name} (${Math.round(file.size / 1024)} KB)…`)
    let parsed
    try {
      parsed = parseWxr(await file.text())
    } catch (e) {
      add('error', e instanceof Error ? e.message : 'Could not read the file.')
      setRunning(false)
      return
    }
    const host = (() => {
      try {
        return new URL(parsed.site.link).hostname
      } catch {
        return ''
      }
    })()
    add('ok', `“${parsed.site.name}”: ${parsed.items.filter((i) => i.type === 'post').length} posts, ${parsed.items.filter((i) => i.type === 'page').length} pages, ${parsed.terms.length} categories/tags.`)
    const t = await wxrImportTerms(parsed.terms)
    add(t.ok ? 'ok' : 'error', t.ok ? `Categories & tags imported (${t.created} new).` : t.error || 'Terms failed')
    setProgress({ done: 0, total: parsed.items.length })
    for (let i = 0; i < parsed.items.length; i++) {
      const r = await wxrImportOne(parsed.items[i], flags, host)
      add(r.ok ? (r.warnings.length && r.action !== 'skipped' ? 'warn' : 'ok') : 'error', `${parsed.items[i].type === 'page' ? 'Page' : 'Post'} “${r.title}” — ${r.action}${r.images ? `, ${r.images} images` : ''}${r.warnings.length ? ` (${r.warnings.slice(0, 2).join('; ')})` : ''}`)
      setProgress({ done: i + 1, total: parsed.items.length })
    }
    const f = await wxrFinish({ name: parsed.site.name, description: parsed.site.description, importSiteInfo: siteInfo })
    f.log.forEach((x) => add('ok', x))
    await cleanupUncategorized()
    add('ok', 'Import complete.')
    setFinished(true)
    setRunning(false)
  }

  const options = (
    <div className="wpa-field">
      <span className="wpa-label">Options</span>
      <label className="wpa-check">
        <input type="checkbox" checked={flags.downloadImages} onChange={(e) => setFlags({ ...flags, downloadImages: e.target.checked })} /> Download images to the new media library (recommended — the old host will go away)
      </label>
      <label className="wpa-check">
        <input type="checkbox" checked={flags.importSeo} onChange={(e) => setFlags({ ...flags, importSeo: e.target.checked })} /> Import Yoast SEO data (titles, descriptions, robots, social, schema)
      </label>
      <label className="wpa-check">
        <input type="checkbox" checked={flags.overwrite} onChange={(e) => setFlags({ ...flags, overwrite: e.target.checked })} /> Update items that already exist (matched by URL slug)
      </label>
      <label className="wpa-check">
        <input type="checkbox" checked={siteInfo} onChange={(e) => setSiteInfo(e.target.checked)} /> Import site title and tagline
      </label>
      {tab === 'rest' ? (
        <label className="wpa-check">
          <input type="checkbox" checked={homeContent} onChange={(e) => setHomeContent(e.target.checked)} /> Import the static homepage&apos;s own content (only if you added content to it in Elementor)
        </label>
      ) : null}
    </div>
  )

  return (
    <>
      <div className="wpa-head">
        <h1>Import from WordPress</h1>
      </div>
      <p className="wpa-desc">
        Bring over posts, pages, categories, tags, images and Yoast SEO data. URLs stay identical, so search rankings carry over. You can run the import again any time — existing items are updated, nothing is deleted.
      </p>
      {!storageReady && flags.downloadImages ? (
        <div className="wpa-notice wpa-notice--warning">
          <p>Image storage is not connected yet (Vercel Blob). Connect it first, or images can&apos;t be downloaded.</p>
        </div>
      ) : null}

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'rest', label: 'From the live site (one click)' },
          { id: 'wxr', label: 'From an export file (.xml)' },
        ]}
      />

      <div className="wpa-cols">
        <div className="wpa-box">
          <div className="wpa-box__body">
            {tab === 'rest' ? (
              <>
                <Field label="WordPress site URL" htmlFor="wp-url" help="Uses the public REST API (/wp-json/) of your WordPress site.">
                  <input id="wp-url" className="wpa-input" value={url} onChange={(e) => setUrl(e.target.value)} disabled={running} />
                </Field>
                <details className="wpa-mb">
                  <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Also import drafts and private posts (optional)</summary>
                  <p className="wpa-help">
                    In WordPress go to Users → Profile → Application Passwords, create one called “Next.js import” and paste it here. It is only used for this import and never stored.
                  </p>
                  <div className="wpa-grid wpa-grid--2">
                    <Field label="WordPress username" htmlFor="wp-user">
                      <input id="wp-user" className="wpa-input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
                    </Field>
                    <Field label="Application password" htmlFor="wp-pass">
                      <input id="wp-pass" className="wpa-input" type="password" value={appPassword} onChange={(e) => setAppPassword(e.target.value)} autoComplete="new-password" />
                    </Field>
                  </div>
                </details>
                {options}
                <button type="button" className="wpa-btn wpa-btn--primary wpa-btn--lg" disabled={running || !url} onClick={runRest}>
                  {running ? 'Importing…' : 'Start import'}
                </button>
              </>
            ) : (
              <>
                <p>
                  In WordPress: <b>Tools → Export → All content → Download Export File</b>. The export also contains Yoast focus keyphrases and cornerstone flags, which the REST API does not expose.
                </p>
                {options}
                <input ref={fileRef} type="file" accept=".xml,text/xml,application/xml" hidden onChange={(e) => e.target.files?.[0] && runWxr(e.target.files[0])} />
                <button type="button" className="wpa-btn wpa-btn--primary wpa-btn--lg" disabled={running} onClick={() => fileRef.current?.click()}>
                  {running ? 'Importing…' : 'Choose export file and import'}
                </button>
              </>
            )}
          </div>
        </div>
        <div className="wpa-box">
          <div className="wpa-box__head">
            <h2>What gets imported</h2>
          </div>
          <div className="wpa-box__body">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Posts & pages with the same URLs, dates and status</li>
              <li>Categories (with parents) and tags</li>
              <li>Featured images and images inside posts (re-hosted)</li>
              <li>Yoast: SEO title, meta description, noindex/nofollow, canonical, social titles/images, schema types</li>
              <li>Copy boxes and the theme&apos;s formatting</li>
              <li>Old image URLs keep working (redirected)</li>
            </ul>
          </div>
        </div>
      </div>

      {log.length ? (
        <div className="wpa-box">
          <div className="wpa-box__head">
            <h2>Progress</h2>
            {progress.total ? (
              <span className="wpa-muted">
                {progress.done} / {progress.total}
              </span>
            ) : null}
          </div>
          {progress.total ? (
            <div className="wpa-progress" style={{ borderRadius: 0 }}>
              <span style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
            </div>
          ) : null}
          <div className="wpa-box__body">
            <ul className="wpa-list">
              {log.map((l, i) => (
                <li key={i} style={{ justifyContent: 'flex-start', alignItems: 'flex-start' }}>
                  {l.kind === 'error' ? (
                    <XCircle size={16} color="#dc3232" style={{ flexShrink: 0, marginTop: 2 }} />
                  ) : l.kind === 'info' ? (
                    <Loader2 size={16} className={running && i === log.length - 1 ? 'wpa-spin' : undefined} style={{ flexShrink: 0, marginTop: 2 }} />
                  ) : (
                    <CheckCircle2 size={16} color={l.kind === 'warn' ? '#ee7c1b' : '#1cca59'} style={{ flexShrink: 0, marginTop: 2 }} />
                  )}
                  <span>{l.text}</span>
                </li>
              ))}
            </ul>
            {finished ? (
              <div className="wpa-flex wpa-mt">
                <a className="wpa-btn wpa-btn--primary" href="/admin/posts/">
                  Go to Posts
                </a>
                <a className="wpa-btn" href="/" target="_blank">
                  View site
                </a>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )
}
