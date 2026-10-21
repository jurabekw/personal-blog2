'use client'

import { useState } from 'react'
import type { AllSettings } from '@/lib/settings-defaults'
import { SEPARATOR_OPTIONS } from '@/lib/settings-defaults'
import { replaceVars, TEMPLATE_VARIABLES } from '@/lib/seo/templates'
import { MediaPicker, type StorageMode } from './MediaLibrary'
import { CheckRow, SelectRow, TextRow, useSettingsForm } from './SettingsForm'
import { Tabs } from './ui'

type Tab = 'general' | 'site' | 'content' | 'taxonomies' | 'breadcrumbs' | 'webmaster' | 'sitemaps' | 'integrations' | 'llms'

const PAGE_TYPES = ['WebPage', 'ItemPage', 'AboutPage', 'FAQPage', 'QAPage', 'ProfilePage', 'ContactPage', 'CollectionPage']
const ARTICLE_TYPES = ['Article', 'BlogPosting', 'SocialMediaPosting', 'NewsArticle', 'TechArticle', 'Report', 'None']

export function SeoSettings({
  initial,
  general,
  storage,
  isAdmin,
  initialTab,
}: {
  initial: AllSettings['seo']
  general: AllSettings['general']
  storage: StorageMode
  isAdmin: boolean
  initialTab?: string
}) {
  const f = useSettingsForm('seo', initial)
  const s = f.value
  const [tab, setTab] = useState<Tab>((initialTab as Tab) || 'general')
  const [picker, setPicker] = useState<null | 'siteRepresentation.personImage' | 'siteRepresentation.orgLogo' | 'social.defaultOgImage'>(null)
  const preview = (tpl: string, extra: Record<string, string> = {}) =>
    replaceVars(tpl, { sitename: general.siteName, sitedesc: general.tagline, sep: s.separator, title: 'Marketing o‘zi nima?', termTitle: 'Digital marketing', searchphrase: 'marketing', blogtitle: 'Blog', ...extra })
  const varsHelp = (
    <>
      Variables: {TEMPLATE_VARIABLES.slice(0, 12).map((v) => (
        <code key={v.name} title={v.description} style={{ marginRight: 4 }}>
          {v.name}
        </code>
      ))}
    </>
  )

  const imageRow = (label: string, path: NonNullable<typeof picker>, value: string, help?: string) => (
    <tr>
      <th>{label}</th>
      <td>
        <div className="wpa-flex">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--a-border-soft)' }} />
          ) : null}
          <button type="button" className="wpa-btn wpa-btn--sm" onClick={() => setPicker(path)}>
            {value ? 'Replace' : 'Select image'}
          </button>
          {value ? (
            <button type="button" className="wpa-link-btn wpa-link-btn--danger" onClick={() => f.set(path, '')}>
              Remove
            </button>
          ) : null}
        </div>
        {help ? <div className="wpa-help">{help}</div> : null}
      </td>
    </tr>
  )

  return (
    <>
      {f.toastNode}
      <div className="wpa-head">
        <h1>SEO Settings</h1>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'general', label: 'General' },
          { id: 'site', label: 'Site representation' },
          { id: 'content', label: 'Content types' },
          { id: 'taxonomies', label: 'Categories & tags' },
          { id: 'breadcrumbs', label: 'Breadcrumbs' },
          { id: 'webmaster', label: 'Webmaster tools' },
          { id: 'sitemaps', label: 'Sitemaps & RSS' },
          { id: 'integrations', label: 'Integrations' },
          { id: 'llms', label: 'llms.txt' },
        ]}
      />

      <div className="wpa-box">
        <div className="wpa-box__body">
          {tab === 'general' ? (
            <table className="wpa-form-table">
              <tbody>
                <tr>
                  <th>Title separator</th>
                  <td>
                    <div className="wpa-flex" style={{ flexWrap: 'wrap' }}>
                      {SEPARATOR_OPTIONS.map((sep) => (
                        <button
                          key={sep}
                          type="button"
                          className={`wpa-btn${s.separator === sep ? ' wpa-btn--primary' : ''}`}
                          style={{ minWidth: 40, fontSize: 18 }}
                          onClick={() => f.set('separator', sep)}
                        >
                          {sep}
                        </button>
                      ))}
                    </div>
                    <div className="wpa-help">Used by %%sep%% in titles. Preview: {preview(s.titles.post)}</div>
                  </td>
                </tr>
                <TextRow label="Homepage SEO title" value={s.titles.home} onChange={(v) => f.set('titles.home', v)} help={<>Preview: {preview(s.titles.home)}</>} />
                <TextRow label="Homepage meta description" value={s.descriptions.home} multiline onChange={(v) => f.set('descriptions.home', v)} placeholder={general.tagline} help="Shown in Google under your homepage title. Aim for 120–156 characters." />
                <SelectRow
                  label="Analysis language"
                  value={s.analysisLanguage}
                  onChange={(v) => f.set('analysisLanguage', v)}
                  options={[
                    { value: 'uz', label: "O'zbekcha (Uzbek)" },
                    { value: 'ru', label: 'Русский (Russian)' },
                    { value: 'en', label: 'English' },
                  ]}
                  help="Used by the readability analysis (transition words, keyphrase word forms)."
                />
              </tbody>
            </table>
          ) : null}

          {tab === 'site' ? (
            <table className="wpa-form-table">
              <tbody>
                <SelectRow
                  label="This site represents"
                  value={s.siteRepresentation.type}
                  onChange={(v) => f.set('siteRepresentation.type', v)}
                  options={[
                    { value: 'person', label: 'A person' },
                    { value: 'organization', label: 'An organization' },
                  ]}
                  help="Tells Google (Knowledge Graph) and AI assistants who is behind the site."
                />
                {s.siteRepresentation.type === 'person' ? (
                  <>
                    <TextRow label="Person name" value={s.siteRepresentation.personName} onChange={(v) => f.set('siteRepresentation.personName', v)} />
                    <TextRow label="Job title" value={s.siteRepresentation.personJobTitle} onChange={(v) => f.set('siteRepresentation.personJobTitle', v)} />
                    <TextRow label="Short description" value={s.siteRepresentation.personDescription} multiline onChange={(v) => f.set('siteRepresentation.personDescription', v)} help="Empty = the bio from Appearance → Author." />
                    {imageRow('Person image', 'siteRepresentation.personImage', s.siteRepresentation.personImage, 'Empty = the author photo.')}
                  </>
                ) : (
                  <>
                    <TextRow label="Organization name" value={s.siteRepresentation.orgName} onChange={(v) => f.set('siteRepresentation.orgName', v)} />
                    <TextRow label="Alternate name" value={s.siteRepresentation.orgAlternateName} onChange={(v) => f.set('siteRepresentation.orgAlternateName', v)} />
                    {imageRow('Organization logo', 'siteRepresentation.orgLogo', s.siteRepresentation.orgLogo, 'Square, at least 112×112.')}
                  </>
                )}
                <tr>
                  <th colSpan={2} style={{ paddingTop: 24 }}>
                    <h3>Social profiles</h3>
                    <span className="wpa-help" style={{ fontWeight: 400 }}>Added to structured data as “sameAs” — helps search engines connect your profiles.</span>
                  </th>
                </tr>
                <TextRow label="Telegram" value={s.social.telegram} onChange={(v) => f.set('social.telegram', v)} placeholder="https://t.me/…" />
                <TextRow label="Instagram" value={s.social.instagram} onChange={(v) => f.set('social.instagram', v)} placeholder="https://instagram.com/…" />
                <TextRow label="LinkedIn" value={s.social.linkedin} onChange={(v) => f.set('social.linkedin', v)} placeholder="https://linkedin.com/in/…" />
                <TextRow label="Facebook" value={s.social.facebook} onChange={(v) => f.set('social.facebook', v)} placeholder="https://facebook.com/…" />
                <TextRow label="YouTube" value={s.social.youtube} onChange={(v) => f.set('social.youtube', v)} placeholder="https://youtube.com/@…" />
                <TextRow label="X username" value={s.social.twitterUsername} onChange={(v) => f.set('social.twitterUsername', v)} placeholder="username (without @)" />
                <TextRow
                  label="Other profiles"
                  value={s.social.other.join('\n')}
                  multiline
                  onChange={(v) => f.set('social.other', v.split('\n').map((x) => x.trim()).filter(Boolean))}
                  help="One URL per line."
                />
                {imageRow('Default share image', 'social.defaultOgImage', s.social.defaultOgImage, 'Used when a page has no featured image. Empty = an image is generated automatically with the title.')}
              </tbody>
            </table>
          ) : null}

          {tab === 'content' ? (
            <>
              {(['post', 'page'] as const).map((type) => (
                <div key={type} style={{ marginBottom: 28 }}>
                  <h2 style={{ fontSize: 18, marginBottom: 6 }}>{type === 'post' ? 'Posts' : 'Pages'}</h2>
                  <table className="wpa-form-table">
                    <tbody>
                      <CheckRow label="Show in search results" checked={!s.noindex[type]} onChange={(v) => f.set(`noindex.${type}`, !v)} help="Disabling adds noindex and removes them from the sitemap." />
                      <TextRow label="SEO title" value={s.titles[type]} onChange={(v) => f.set(`titles.${type}`, v)} help={<>Preview: {preview(s.titles[type])}<br />{varsHelp}</>} />
                      <TextRow label="Meta description" value={s.descriptions[type]} multiline={2} onChange={(v) => f.set(`descriptions.${type}`, v)} help="Template used when a post has no custom meta description. Empty = the excerpt." />
                    </tbody>
                  </table>
                </div>
              ))}
              <h2 style={{ fontSize: 18, marginBottom: 6 }}>Schema defaults</h2>
              <table className="wpa-form-table">
                <tbody>
                  <SelectRow label="Default page type" value={s.schema.pageType} onChange={(v) => f.set('schema.pageType', v)} options={PAGE_TYPES.map((t) => ({ value: t, label: t }))} />
                  <SelectRow label="Default article type" value={s.schema.articleType} onChange={(v) => f.set('schema.articleType', v)} options={ARTICLE_TYPES.map((t) => ({ value: t, label: t }))} />
                </tbody>
              </table>
              <h2 style={{ fontSize: 18, margin: '24px 0 6px' }}>Blog page, search and 404</h2>
              <table className="wpa-form-table">
                <tbody>
                  <TextRow label="Blog page title" value={s.titles.blog} onChange={(v) => f.set('titles.blog', v)} help={<>Preview: {preview(s.titles.blog)}</>} />
                  <TextRow label="Blog page meta description" value={s.descriptions.blog} multiline={2} onChange={(v) => f.set('descriptions.blog', v)} help="Empty = the blog intro text." />
                  <TextRow label="Search results title" value={s.titles.search} onChange={(v) => f.set('titles.search', v)} help={<>Preview: {preview(s.titles.search)}</>} />
                  <TextRow label="404 page title" value={s.titles.notFound} onChange={(v) => f.set('titles.notFound', v)} help={<>Preview: {preview(s.titles.notFound)}</>} />
                </tbody>
              </table>
            </>
          ) : null}

          {tab === 'taxonomies' ? (
            <>
              {(['category', 'tag'] as const).map((tx) => (
                <div key={tx} style={{ marginBottom: 28 }}>
                  <h2 style={{ fontSize: 18, marginBottom: 6 }}>{tx === 'category' ? 'Categories' : 'Tags'}</h2>
                  <table className="wpa-form-table">
                    <tbody>
                      <CheckRow label="Show in search results" checked={!s.noindex[tx]} onChange={(v) => f.set(`noindex.${tx}`, !v)} help={tx === 'tag' ? 'Many small blogs noindex tag archives to avoid thin pages.' : undefined} />
                      <TextRow label="SEO title" value={s.titles[tx]} onChange={(v) => f.set(`titles.${tx}`, v)} help={<>Preview: {preview(s.titles[tx])}</>} />
                      <TextRow label="Meta description" value={s.descriptions[tx]} multiline={2} onChange={(v) => f.set(`descriptions.${tx}`, v)} />
                    </tbody>
                  </table>
                </div>
              ))}
            </>
          ) : null}

          {tab === 'breadcrumbs' ? (
            <table className="wpa-form-table">
              <tbody>
                <CheckRow label="Enable breadcrumbs" checked={s.breadcrumbs.enabled} onChange={(v) => f.set('breadcrumbs.enabled', v)} help="Shows the trail on posts and archives and adds BreadcrumbList structured data." />
                <TextRow label="Separator" value={s.breadcrumbs.separator} onChange={(v) => f.set('breadcrumbs.separator', v)} />
                <TextRow label="Anchor text for the homepage" value={s.breadcrumbs.homeLabel} onChange={(v) => f.set('breadcrumbs.homeLabel', v)} />
                <CheckRow label="Show Blog page" checked={s.breadcrumbs.showBlog} onChange={(v) => f.set('breadcrumbs.showBlog', v)} />
              </tbody>
            </table>
          ) : null}

          {tab === 'webmaster' ? (
            <table className="wpa-form-table">
              <tbody>
                <tr>
                  <td colSpan={2}>
                    <p className="wpa-muted">Paste the verification code (or the whole &lt;meta&gt; tag) from each service. Yandex is important for audiences in Uzbekistan and Russia.</p>
                  </td>
                </tr>
                <TextRow label="Google Search Console" value={s.verification.google} onChange={(v) => f.set('verification.google', v)} help={<a href="https://search.google.com/search-console" target="_blank" rel="noreferrer">Get your Google verification code</a>} />
                <TextRow label="Yandex Webmaster" value={s.verification.yandex} onChange={(v) => f.set('verification.yandex', v)} help={<a href="https://webmaster.yandex.com" target="_blank" rel="noreferrer">Get your Yandex verification code</a>} />
                <TextRow label="Bing Webmaster Tools" value={s.verification.bing} onChange={(v) => f.set('verification.bing', v)} />
                <TextRow label="Baidu" value={s.verification.baidu} onChange={(v) => f.set('verification.baidu', v)} />
                <TextRow label="Pinterest" value={s.verification.pinterest} onChange={(v) => f.set('verification.pinterest', v)} />
              </tbody>
            </table>
          ) : null}

          {tab === 'sitemaps' ? (
            <table className="wpa-form-table">
              <tbody>
                <CheckRow label="XML sitemaps" checked={s.sitemaps.enabled} onChange={(v) => f.set('sitemaps.enabled', v)} help={<a href="/sitemap_index.xml" target="_blank">View the XML sitemap (same URL as on WordPress)</a>} />
                <CheckRow label="Include images" checked={s.sitemaps.includeImages} onChange={(v) => f.set('sitemaps.includeImages', v)} />
                <CheckRow label="Include tag archives" checked={s.sitemaps.includeTags} onChange={(v) => f.set('sitemaps.includeTags', v)} />
                <TextRow label="Content to put before each post in the feed" value={s.rss.before} multiline={2} onChange={(v) => f.set('rss.before', v)} />
                <TextRow label="Content to put after each post in the feed" value={s.rss.after} multiline={2} onChange={(v) => f.set('rss.after', v)} help={<>Variables: <code>%%POSTLINK%%</code> <code>%%BLOGLINK%%</code> <code>%%BLOGDESCLINK%%</code> <code>%%AUTHORLINK%%</code> — protects you from content scrapers.</>} />
              </tbody>
            </table>
          ) : null}

          {tab === 'integrations' ? (
            <table className="wpa-form-table">
              <tbody>
                <TextRow label="Google Analytics 4 ID" value={s.analytics.ga4} onChange={(v) => f.set('analytics.ga4', v)} placeholder="G-XXXXXXXXXX" help="Loads after the page is interactive, so it doesn't slow the site down." />
                <TextRow label="Google Tag Manager ID" value={s.analytics.gtm} onChange={(v) => f.set('analytics.gtm', v)} placeholder="GTM-XXXXXXX" />
                <TextRow label="Yandex Metrica counter ID" value={s.analytics.yandexMetrica} onChange={(v) => f.set('analytics.yandexMetrica', v)} placeholder="12345678" />
                {isAdmin ? (
                  <>
                    <TextRow label="Custom code in <head>" value={s.analytics.headCode} multiline={5} mono onChange={(v) => f.set('analytics.headCode', v)} help="For pixels and other tags (e.g. Meta Pixel). Only add code from sources you trust." />
                    <TextRow label="Custom code before </body>" value={s.analytics.bodyCode} multiline={5} mono onChange={(v) => f.set('analytics.bodyCode', v)} />
                  </>
                ) : (
                  <tr>
                    <td colSpan={2} className="wpa-muted">Only administrators can add custom code.</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : null}

          {tab === 'llms' ? (
            <table className="wpa-form-table">
              <tbody>
                <CheckRow
                  label="Generate llms.txt"
                  checked={s.llms.enabled}
                  onChange={(v) => f.set('llms.enabled', v)}
                  help={<>A Markdown map of your best content for AI assistants (ChatGPT, Claude, Perplexity) — part of GEO/AEO. <a href="/llms.txt" target="_blank">View llms.txt</a></>}
                />
                <TextRow label="Intro text" value={s.llms.intro} multiline={4} onChange={(v) => f.set('llms.intro', v)} help="Who you are and what the site covers. Empty = your author name, role and bio. Cornerstone posts are listed first as “Key articles”." />
              </tbody>
            </table>
          ) : null}
        </div>
      </div>
      {f.saveBar}

      {picker ? (
        <MediaPicker
          storage={storage}
          onClose={() => setPicker(null)}
          onPick={(m) => {
            f.set(picker, m.url)
            setPicker(null)
          }}
        />
      ) : null}
    </>
  )
}
