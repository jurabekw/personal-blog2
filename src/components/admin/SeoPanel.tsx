'use client'

import { useDeferredValue, useMemo, useRef, useState } from 'react'
import { Monitor, Smartphone } from 'lucide-react'
import type { PostSeo, RobotsChoice, SchemaArticleType, SchemaPageType } from '@/lib/types'
import { replaceVars, TEMPLATE_VARIABLES, type TemplateContext } from '@/lib/seo/templates'
import {
  analyzeReadability,
  analyzeSeo,
  META_MAX,
  META_MIN,
  TITLE_MAX_PX,
  titleWidth,
  type AnalysisResult,
  type Rating,
} from '@/lib/seo/analysis'
import { excerptFromHtml, truncate } from '@/lib/content/text'
import { MediaPicker, type StorageMode } from './MediaLibrary'
import { RichText, ScoreDot, Switch, Tabs } from './ui'

export interface SeoContext {
  type: 'post' | 'page' | 'category' | 'tag'
  title: string
  slug: string
  html: string
  excerpt: string
  categories?: string[]
  primaryCategory?: string
  date?: string
  featuredImage?: string
  /** Path prefix for the URL preview, e.g. "/" or "/category/". */
  pathPrefix: string
}

export interface SeoSiteSettings {
  siteName: string
  tagline: string
  separator: string
  siteUrl: string
  titleTemplate: string
  descTemplate: string
  language: 'uz' | 'ru' | 'en'
  pageTypeDefault: SchemaPageType
  articleTypeDefault: SchemaArticleType
  noindexDefault: boolean
  defaultOgImage: string
  faviconUrl: string
}

type Tab = 'seo' | 'readability' | 'schema' | 'social' | 'advanced'

const PAGE_TYPES: SchemaPageType[] = ['WebPage', 'ItemPage', 'AboutPage', 'FAQPage', 'QAPage', 'ProfilePage', 'ContactPage', 'MedicalWebPage', 'CollectionPage', 'CheckoutPage', 'RealEstateListing', 'SearchResultsPage']
const ARTICLE_TYPES: SchemaArticleType[] = ['Article', 'BlogPosting', 'SocialMediaPosting', 'NewsArticle', 'AdvertiserContentArticle', 'SatiricalArticle', 'ScholarlyArticle', 'TechArticle', 'Report', 'None']

function Meter({ value, max, min, label }: { value: number; max: number; min: number; label: string }) {
  const pct = Math.min(100, (value / max) * 100)
  const color = value === 0 ? '#dc3232' : value > max ? '#ee7c1b' : value < min ? '#ee7c1b' : '#1cca59'
  return (
    <div className="wpa-meter" title={label} role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemax={max}>
      <span style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

function VariableInput({
  value,
  onChange,
  placeholder,
  multiline = false,
  id,
  vars,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  multiline?: boolean
  id: string
  vars: string[]
}) {
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  const insert = (v: string) => {
    const el = ref.current
    const start = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? value.length
    const base = value || placeholder
    const next = value ? `${value.slice(0, start)}${v}${value.slice(end)}` : `${base} ${v}`
    onChange(next.replace(/\s{2,}/g, ' '))
  }
  return (
    <>
      {multiline ? (
        <textarea id={id} ref={ref} className="wpa-textarea" rows={3} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} ref={ref} className="wpa-input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
      <div className="wpa-vars" aria-label="Insert variable">
        {vars.map((v) => (
          <button key={v} type="button" onClick={() => insert(v)} title={TEMPLATE_VARIABLES.find((t) => t.name === v)?.description}>
            + {v.replace(/%%/g, '')}
          </button>
        ))}
      </div>
    </>
  )
}

function AnalysisList({ result }: { result: AnalysisResult }) {
  const groups: { label: string; ratings: Rating[] }[] = [
    { label: 'Problems', ratings: ['bad'] },
    { label: 'Improvements', ratings: ['ok'] },
    { label: 'Good results', ratings: ['good'] },
  ]
  return (
    <div>
      {groups.map((g) => {
        const items = result.checks.filter((c) => g.ratings.includes(c.rating))
        if (!items.length) return null
        return (
          <div key={g.label}>
            <div className="wpa-analysis-group">
              {g.label} ({items.length})
            </div>
            <ul className="wpa-analysis">
              {items.map((c) => (
                <li key={c.id}>
                  <span className={`wpa-dot wpa-dot--${c.rating}`} aria-hidden="true" />
                  <RichText text={c.text} />
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

function SocialPreview({ variant, image, title, description, host }: { variant: 'facebook' | 'x'; image: string; title: string; description: string; host: string }) {
  return (
    <div className={`wpa-social-card${variant === 'x' ? ' wpa-social-card--x' : ''}`}>
      <div className="wpa-social-card__img" style={image ? { backgroundImage: `url("${image}")` } : undefined}>
        {image ? null : 'Auto-generated share image'}
      </div>
      <div className="wpa-social-card__body">
        <div className="wpa-social-card__host">{host}</div>
        <div className="wpa-social-card__title">{truncate(title, 90)}</div>
        <div className="wpa-social-card__desc">{truncate(description, 160)}</div>
      </div>
    </div>
  )
}

export function useSeoAnalysis(ctx: SeoContext, seo: PostSeo, site: SeoSiteSettings, usedKeyphrases: string[]) {
  const html = useDeferredValue(ctx.html)
  const tctx: TemplateContext = {
    title: ctx.title,
    sitename: site.siteName,
    sitedesc: site.tagline,
    sep: site.separator,
    excerpt: ctx.excerpt || excerptFromHtml(html),
    category: ctx.categories?.join(', '),
    primaryCategory: ctx.primaryCategory,
    termTitle: ctx.title,
    termDescription: ctx.excerpt,
    date: ctx.date,
    focuskw: seo.focusKeyphrase,
  }
  const seoTitle = replaceVars(seo.title || site.titleTemplate, tctx)
  const customDesc = replaceVars(seo.metaDescription || '', tctx)
  const metaDescription = customDesc || replaceVars(site.descTemplate, tctx) || tctx.excerpt || ''
  const kp = (seo.focusKeyphrase || '').trim().toLowerCase()
  const usedElsewhere = kp ? usedKeyphrases.filter((k) => k.trim().toLowerCase() === kp).length : 0
  const host = (() => {
    try {
      return new URL(site.siteUrl).hostname
    } catch {
      return 'localhost'
    }
  })()

  const seoResult = useMemo(
    () =>
      analyzeSeo({
        html,
        title: ctx.title,
        seoTitle,
        metaDescription,
        metaDescriptionIsCustom: Boolean(customDesc),
        slug: ctx.slug,
        keyphrase: seo.focusKeyphrase || '',
        siteHost: host,
        keyphraseUsedElsewhere: usedElsewhere,
        cornerstone: seo.cornerstone,
        language: site.language,
      }),
    [html, ctx.title, seoTitle, metaDescription, customDesc, ctx.slug, seo.focusKeyphrase, host, usedElsewhere, seo.cornerstone, site.language],
  )
  const readResult = useMemo(() => analyzeReadability({ html, language: site.language }), [html, site.language])
  return { seoTitle, metaDescription, customDesc, seoResult, readResult, tctx, host }
}

export function SeoPanel({
  ctx,
  seo,
  onChange,
  onSlugChange,
  site,
  usedKeyphrases,
  storage,
  showAnalysis = true,
}: {
  ctx: SeoContext
  seo: PostSeo
  onChange: (seo: PostSeo) => void
  onSlugChange?: (slug: string) => void
  site: SeoSiteSettings
  usedKeyphrases: string[]
  storage: StorageMode
  showAnalysis?: boolean
}) {
  const [tab, setTab] = useState<Tab>('seo')
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile')
  const [picker, setPicker] = useState<null | 'ogImage' | 'twitterImage'>(null)
  const set = <K extends keyof PostSeo>(k: K, v: PostSeo[K]) => onChange({ ...seo, [k]: v })
  const { seoTitle, metaDescription, customDesc, seoResult, readResult, host } = useSeoAnalysis(ctx, seo, site, usedKeyphrases)
  const isPost = ctx.type === 'post'
  const isTerm = ctx.type === 'category' || ctx.type === 'tag'
  const width = titleWidth(seoTitle)
  const url = `${site.siteUrl}${ctx.pathPrefix}${ctx.slug}/`
  const breadcrumbUrl = `${host} › ${[...ctx.pathPrefix.split('/').filter(Boolean), ctx.slug].join(' › ')}`
  const ogImage = seo.ogImage || ctx.featuredImage || site.defaultOgImage
  const vars = isTerm
    ? ['%%term_title%%', '%%sitename%%', '%%sep%%', '%%page%%', '%%term_description%%']
    : ['%%title%%', '%%sitename%%', '%%sep%%', '%%page%%', '%%primary_category%%', '%%excerpt%%', '%%currentyear%%']

  const tabs: { id: Tab; label: React.ReactNode }[] = [
    { id: 'seo', label: <><ScoreDot rating={seoResult.rating} label="SEO" /> SEO</> },
    ...(showAnalysis ? [{ id: 'readability' as Tab, label: <><ScoreDot rating={readResult.rating} label="Readability" /> Readability</> }] : []),
    ...(!isTerm ? [{ id: 'schema' as Tab, label: 'Schema' }] : []),
    { id: 'social', label: 'Social' },
    { id: 'advanced', label: 'Advanced' },
  ]

  return (
    <div className="wpa-box" id="seo-box">
      <div className="wpa-box__head">
        <h2>SEO</h2>
        <span className="wpa-flex wpa-muted">
          <ScoreDot rating={seoResult.rating} label="SEO" /> SEO
          {showAnalysis ? (
            <>
              <ScoreDot rating={readResult.rating} label="Readability" /> Readability
            </>
          ) : null}
        </span>
      </div>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      <div className="wpa-box__body">
        {tab === 'seo' ? (
          <>
            <div className="wpa-field">
              <label className="wpa-label" htmlFor="seo-kp">
                Focus keyphrase <small>— the search phrase you want this page to rank for</small>
              </label>
              <input id="seo-kp" className="wpa-input" value={seo.focusKeyphrase || ''} onChange={(e) => set('focusKeyphrase', e.target.value)} placeholder="e.g. marketing nima" />
            </div>

            <div className="wpa-field">
              <div className="wpa-between" style={{ marginBottom: 8 }}>
                <span className="wpa-label" style={{ margin: 0 }}>
                  Google preview
                </span>
                <span className="wpa-flex">
                  <button type="button" className={`wpa-btn wpa-btn--sm${device === 'mobile' ? ' wpa-btn--primary' : ''}`} onClick={() => setDevice('mobile')}>
                    <Smartphone size={14} /> Mobile
                  </button>
                  <button type="button" className={`wpa-btn wpa-btn--sm${device === 'desktop' ? ' wpa-btn--primary' : ''}`} onClick={() => setDevice('desktop')}>
                    <Monitor size={14} /> Desktop
                  </button>
                </span>
              </div>
              <div className={`wpa-snippet${device === 'mobile' ? ' wpa-snippet--mobile' : ''}`}>
                <div className="wpa-snippet__site">
                  <span className="wpa-snippet__fav">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={site.faviconUrl || '/favicon.svg'} alt="" />
                  </span>
                  <span>
                    <div className="wpa-snippet__name">{site.siteName}</div>
                    <div className="wpa-snippet__url">{breadcrumbUrl}</div>
                  </span>
                </div>
                <div className="wpa-snippet__title">{width > TITLE_MAX_PX ? truncate(seoTitle, Math.floor(seoTitle.length * (TITLE_MAX_PX / width))) : seoTitle}</div>
                <div className="wpa-snippet__desc">
                  {isPost && ctx.date ? <span className="wpa-snippet__date">{ctx.date} — </span> : null}
                  {truncate(metaDescription || 'Please provide a meta description by editing the snippet below.', device === 'mobile' ? 120 : 156)}
                </div>
              </div>
            </div>

            <div className="wpa-field">
              <label className="wpa-label" htmlFor="seo-title">
                SEO title
              </label>
              <VariableInput id="seo-title" value={seo.title || ''} onChange={(v) => set('title', v)} placeholder={site.titleTemplate} vars={vars} />
              <Meter value={width} max={TITLE_MAX_PX} min={300} label={`Title width ${width}px of ${TITLE_MAX_PX}px`} />
              <div className="wpa-help">
                {width}px / {TITLE_MAX_PX}px · leave empty to use the default template from SEO → Settings.
              </div>
            </div>

            {onSlugChange ? (
              <div className="wpa-field">
                <label className="wpa-label" htmlFor="seo-slug">
                  Slug
                </label>
                <input id="seo-slug" className="wpa-input" value={ctx.slug} onChange={(e) => onSlugChange(e.target.value)} />
                <div className="wpa-help">{url}</div>
              </div>
            ) : null}

            <div className="wpa-field">
              <label className="wpa-label" htmlFor="seo-desc">
                Meta description
              </label>
              <VariableInput id="seo-desc" multiline value={seo.metaDescription || ''} onChange={(v) => set('metaDescription', v)} placeholder={metaDescription || 'Write a summary that makes people want to click…'} vars={vars} />
              <Meter value={customDesc.length} max={META_MAX} min={META_MIN} label={`${customDesc.length} characters`} />
              <div className="wpa-help">
                {customDesc.length} characters (aim for {META_MIN}–{META_MAX}){!customDesc ? ' · empty uses the excerpt automatically' : ''}
              </div>
            </div>

            {!isTerm ? (
              <div className="wpa-field">
                <Switch checked={!!seo.cornerstone} onChange={(v) => set('cornerstone', v)} label={<b>Cornerstone content</b>} />
                <div className="wpa-help">Mark your most important, comprehensive articles. They get stricter analysis and are highlighted in llms.txt.</div>
              </div>
            ) : null}

            {showAnalysis ? (
              <>
                <hr className="wpa-hr" />
                <h3 style={{ marginBottom: 4 }}>SEO analysis{seo.focusKeyphrase ? `: “${seo.focusKeyphrase}”` : ''}</h3>
                <AnalysisList result={seoResult} />
              </>
            ) : null}
          </>
        ) : null}

        {tab === 'readability' ? <AnalysisList result={readResult} /> : null}

        {tab === 'schema' ? (
          <>
            <p className="wpa-muted">
              Structured data tells Google and AI assistants what this page is. Your site is set up as a <b>Person</b> ({site.siteName}); this page is
              part of the WebSite graph.
            </p>
            <div className="wpa-field">
              <label className="wpa-label" htmlFor="schema-page">
                Page type
              </label>
              <select id="schema-page" className="wpa-select" value={seo.schemaPageType || ''} onChange={(e) => set('schemaPageType', e.target.value as SchemaPageType)}>
                <option value="">Default for {ctx.type === 'post' ? 'Posts' : 'Pages'} ({site.pageTypeDefault})</option>
                {PAGE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/([a-z])([A-Z])/g, '$1 $2')}
                  </option>
                ))}
              </select>
            </div>
            {isPost ? (
              <div className="wpa-field">
                <label className="wpa-label" htmlFor="schema-article">
                  Article type
                </label>
                <select id="schema-article" className="wpa-select" value={seo.schemaArticleType || ''} onChange={(e) => set('schemaArticleType', e.target.value as SchemaArticleType)}>
                  <option value="">Default for Posts ({site.articleTypeDefault})</option>
                  {ARTICLE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace(/([a-z])([A-Z])/g, '$1 $2')}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <p className="wpa-help">Adding FAQ items below automatically adds FAQPage structured data (rich results).</p>
          </>
        ) : null}

        {tab === 'social' ? (
          <div className="wpa-grid wpa-grid--2">
            {(['facebook', 'x'] as const).map((net) => {
              const isFb = net === 'facebook'
              const tKey = isFb ? 'ogTitle' : 'twitterTitle'
              const dKey = isFb ? 'ogDescription' : 'twitterDescription'
              const iKey = isFb ? 'ogImage' : 'twitterImage'
              const img = isFb ? ogImage : seo.twitterImage || ogImage
              return (
                <div key={net}>
                  <h3 style={{ marginBottom: 10 }}>{isFb ? 'Facebook, Telegram & LinkedIn' : 'X (Twitter)'}</h3>
                  <SocialPreview
                    variant={net}
                    image={img || ''}
                    host={host}
                    title={replaceVars(seo[tKey] || (isFb ? '' : seo.ogTitle) || '', { title: ctx.title, sitename: site.siteName, sep: site.separator }) || seoTitle}
                    description={replaceVars(seo[dKey] || (isFb ? '' : seo.ogDescription) || '', {}) || metaDescription}
                  />
                  <div className="wpa-field wpa-mt">
                    <label className="wpa-label">Image</label>
                    <div className="wpa-flex">
                      <button type="button" className="wpa-btn wpa-btn--sm" onClick={() => setPicker(iKey)}>
                        {seo[iKey] ? 'Replace image' : 'Select image'}
                      </button>
                      {seo[iKey] ? (
                        <button type="button" className="wpa-link-btn wpa-link-btn--danger" onClick={() => set(iKey, '')}>
                          Remove
                        </button>
                      ) : (
                        <span className="wpa-help" style={{ margin: 0 }}>
                          {isFb ? 'Default: featured image' : 'Default: Facebook image'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="wpa-field">
                    <label className="wpa-label" htmlFor={`${net}-title`}>
                      Title
                    </label>
                    <input id={`${net}-title`} className="wpa-input" value={seo[tKey] || ''} placeholder={seoTitle} onChange={(e) => set(tKey, e.target.value)} />
                  </div>
                  <div className="wpa-field">
                    <label className="wpa-label" htmlFor={`${net}-desc`}>
                      Description
                    </label>
                    <textarea id={`${net}-desc`} className="wpa-textarea" rows={2} value={seo[dKey] || ''} placeholder={metaDescription} onChange={(e) => set(dKey, e.target.value)} />
                  </div>
                </div>
              )
            })}
            {picker ? (
              <MediaPicker
                storage={storage}
                title="Select social image (1200×630 recommended)"
                onClose={() => setPicker(null)}
                onPick={(m) => {
                  set(picker, m.url)
                  setPicker(null)
                }}
              />
            ) : null}
          </div>
        ) : null}

        {tab === 'advanced' ? (
          <>
            <div className="wpa-field">
              <label className="wpa-label" htmlFor="adv-index">
                Allow search engines to show this {ctx.type} in search results?
              </label>
              <select id="adv-index" className="wpa-select" value={seo.robotsIndex || 'default'} onChange={(e) => set('robotsIndex', e.target.value as RobotsChoice)}>
                <option value="default">Default for {ctx.type === 'post' ? 'Posts' : ctx.type === 'page' ? 'Pages' : ctx.type === 'category' ? 'Categories' : 'Tags'}, currently: {site.noindexDefault ? 'No' : 'Yes'}</option>
                <option value="index">Yes</option>
                <option value="noindex">No</option>
              </select>
            </div>
            {!isTerm ? (
              <>
                <div className="wpa-field">
                  <span className="wpa-label">Should search engines follow links on this {ctx.type}?</span>
                  <div className="wpa-radio-row">
                    <label className="wpa-check">
                      <input type="radio" checked={!seo.nofollow} onChange={() => set('nofollow', false)} /> Yes
                    </label>
                    <label className="wpa-check">
                      <input type="radio" checked={!!seo.nofollow} onChange={() => set('nofollow', true)} /> No
                    </label>
                  </div>
                </div>
                <div className="wpa-field">
                  <span className="wpa-label">Meta robots advanced</span>
                  <label className="wpa-check">
                    <input type="checkbox" checked={!!seo.noimageindex} onChange={(e) => set('noimageindex', e.target.checked)} /> No Image Index
                  </label>
                  <label className="wpa-check">
                    <input type="checkbox" checked={!!seo.noarchive} onChange={(e) => set('noarchive', e.target.checked)} /> No Archive
                  </label>
                  <label className="wpa-check">
                    <input type="checkbox" checked={!!seo.nosnippet} onChange={(e) => set('nosnippet', e.target.checked)} /> No Snippet
                  </label>
                </div>
              </>
            ) : null}
            <div className="wpa-field">
              <label className="wpa-label" htmlFor="adv-bc">
                Breadcrumbs title
              </label>
              <input id="adv-bc" className="wpa-input" value={seo.breadcrumbTitle || ''} placeholder={ctx.title} onChange={(e) => set('breadcrumbTitle', e.target.value)} />
            </div>
            <div className="wpa-field">
              <label className="wpa-label" htmlFor="adv-canonical">
                Canonical URL
              </label>
              <input id="adv-canonical" className="wpa-input" value={seo.canonical || ''} placeholder={url} onChange={(e) => set('canonical', e.target.value)} />
              <div className="wpa-help">Only set this when the same content lives at another URL. Leave empty in almost all cases.</div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
