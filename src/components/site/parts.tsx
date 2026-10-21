import { Fragment } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { ImageRef, PostSummary, TermRef } from '@/lib/data/posts'
import { formatDate } from '@/lib/format'
import { t } from '@/lib/i18n'

/* ------------------------------------------------------------------ */
/* Images                                                              */
/* ------------------------------------------------------------------ */

export function canOptimize(url: string): boolean {
  if (!url) return false
  if (url.startsWith('/')) return true
  const extra = (process.env.IMAGE_HOSTS || '').split(',').map((h) => h.trim()).filter(Boolean)
  try {
    const host = new URL(url).hostname
    return host.endsWith('.public.blob.vercel-storage.com') || extra.includes(host)
  } catch {
    return false
  }
}

/** next/image that fills its (aspect-ratio) wrapper; falls back to an unoptimized <img> for unknown hosts. */
export function FillImage({
  image,
  sizes,
  priority = false,
  alt,
}: {
  image: ImageRef
  sizes: string
  priority?: boolean
  alt?: string
}) {
  return (
    <Image
      src={image.url}
      alt={alt ?? image.alt ?? ''}
      fill
      sizes={sizes}
      priority={priority}
      fetchPriority={priority ? 'high' : undefined}
      quality={75}
      unoptimized={!canOptimize(image.url)}
      style={{ objectFit: 'cover' }}
    />
  )
}

export function AuthorPhoto({
  url,
  name,
  size,
  className,
  priority = false,
}: {
  url: string
  name: string
  size: number
  className: string
  priority?: boolean
}) {
  const src = url || '/images/profile.png'
  return (
    <Image
      className={className}
      src={src}
      alt={name}
      width={size}
      height={size}
      priority={priority}
      unoptimized={!canOptimize(src)}
    />
  )
}

/* ------------------------------------------------------------------ */
/* Meta, cards                                                         */
/* ------------------------------------------------------------------ */

export function PostMeta({
  post,
  green = false,
  language,
  timezone,
}: {
  post: PostSummary
  green?: boolean
  language: string
  timezone: string
}) {
  return (
    <div className="jb-meta">
      {post.category ? (
        <Link className={`jb-badge${green ? ' jb-badge--green' : ''}`} href={post.category.path}>
          {post.category.name}
        </Link>
      ) : null}
      <time className="jb-caption" dateTime={post.publishedAt.toISOString()}>
        {formatDate(post.publishedAt, language, timezone)}
      </time>
      <span className="jb-caption jb-caption--soft">{t.readingTime(post.readingMinutes)}</span>
    </div>
  )
}

interface CardProps {
  post: PostSummary
  language: string
  timezone: string
}

/** template-parts/content-card.php */
export function PostCard({ post, language, timezone, headingLevel = 3 }: CardProps & { headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <article className="jb-card">
      {post.image ? (
        <Link className="jb-card__media" href={post.path} aria-hidden="true" tabIndex={-1}>
          <FillImage image={post.image} alt="" sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw" />
        </Link>
      ) : null}
      <div className="jb-card__body">
        <PostMeta post={post} language={language} timezone={timezone} />
        <H className="jb-card__title">
          <Link href={post.path}>{post.title}</Link>
        </H>
        <p className="jb-card__excerpt">{post.excerpt}</p>
        <Link className="jb-card__more" href={post.path}>
          {t.readMore}
        </Link>
      </div>
    </article>
  )
}

/** template-parts/content-feature.php */
export function FeatureCard({ post, language, timezone }: CardProps) {
  return (
    <article className="jb-card jb-card--feature">
      {post.image ? (
        <Link className="jb-card__media" href={post.path} aria-hidden="true" tabIndex={-1}>
          <FillImage image={post.image} alt="" priority sizes="(min-width: 1180px) 800px, (min-width: 1024px) 70vw, 100vw" />
        </Link>
      ) : null}
      <div className="jb-card__body">
        <PostMeta post={post} green language={language} timezone={timezone} />
        <h3 className="jb-card__title">
          <Link href={post.path}>{post.title}</Link>
        </h3>
        <p className="jb-lead" style={{ marginTop: 'var(--jb-space-msm)' }}>
          {post.excerpt}
        </p>
        <Link className="jb-card__more" href={post.path}>
          {t.readMore}
        </Link>
      </div>
    </article>
  )
}

/** template-parts/content-row.php */
export function PostRow({ post, language, timezone, priority = false }: CardProps & { priority?: boolean }) {
  return (
    <article className="jb-card jb-card--wide">
      {post.image ? (
        <Link className="jb-card__media" href={post.path} aria-hidden="true" tabIndex={-1}>
          <FillImage image={post.image} alt="" priority={priority} sizes="(min-width: 640px) 260px, 100vw" />
        </Link>
      ) : null}
      <div className="jb-card__body">
        <PostMeta post={post} language={language} timezone={timezone} />
        <h2 className="jb-card__title">
          <Link href={post.path}>{post.title}</Link>
        </h2>
        <p className="jb-card__excerpt">{post.excerpt}</p>
      </div>
    </article>
  )
}

/* ------------------------------------------------------------------ */
/* Navigation pieces                                                   */
/* ------------------------------------------------------------------ */

export function CategoryChips({ categories, activeAll = false, allHref }: { categories: TermRef[]; activeAll?: boolean; allHref?: string }) {
  const visible = categories.filter((c) => c.count > 0)
  if (!visible.length) return null
  return (
    <nav aria-label={t.categories}>
      <ul className="jb-chips">
        {allHref ? (
          <li>
            <Link className={`jb-chip${activeAll ? ' is-active' : ''}`} aria-current={activeAll ? 'page' : undefined} href={allHref}>
              {t.all}
            </Link>
          </li>
        ) : null}
        {visible.map((c) => (
          <li key={c.id}>
            <Link className="jb-chip" href={c.path}>
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export interface Crumb {
  label: string
  href?: string
}

export function Breadcrumb({ items, separator = '/' }: { items: Crumb[]; separator?: string }) {
  return (
    <nav className="jb-breadcrumb" aria-label={t.breadcrumb}>
      {items.map((c, i) => (
        <Fragment key={i}>
          {i > 0 ? <span aria-hidden="true">{separator}</span> : null}
          {c.href ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
        </Fragment>
      ))}
    </nav>
  )
}

/** paginate_links( type=list, mid_size=1, end_size=1 ) */
export function Pagination({ current, total, base }: { current: number; total: number; base: string }) {
  if (total <= 1) return null
  const href = (n: number) => (n === 1 ? base : `${base}page/${n}/`)
  const pages: (number | 'dots')[] = []
  for (let n = 1; n <= total; n++) {
    if (n === 1 || n === total || Math.abs(n - current) <= 1) pages.push(n)
    else if (pages[pages.length - 1] !== 'dots') pages.push('dots')
  }
  return (
    <nav className="jb-pagination" aria-label={t.pages}>
      <ul className="page-numbers">
        {current > 1 ? (
          <li>
            <Link className="prev page-numbers" href={href(current - 1)} rel="prev">
              {t.prev}
            </Link>
          </li>
        ) : null}
        {pages.map((p, i) =>
          p === 'dots' ? (
            <li key={`d${i}`}>
              <span className="page-numbers dots">…</span>
            </li>
          ) : p === current ? (
            <li key={p}>
              <span aria-current="page" className="page-numbers current">
                {p}
              </span>
            </li>
          ) : (
            <li key={p}>
              <Link className="page-numbers" href={href(p)}>
                {p}
              </Link>
            </li>
          ),
        )}
        {current < total ? (
          <li>
            <Link className="next page-numbers" href={href(current + 1)} rel="next">
              {t.next}
            </Link>
          </li>
        ) : null}
      </ul>
    </nav>
  )
}

export function SearchForm({ defaultValue = '' }: { defaultValue?: string }) {
  return (
    <form className="jb-search-form" role="search" method="get" action="/search/">
      <label className="screen-reader-text" htmlFor="jb-search-input">
        {t.search}
      </label>
      <input id="jb-search-input" type="search" name="q" defaultValue={defaultValue} placeholder={t.searchPlaceholder} />
      <button type="submit" className="jb-btn jb-btn--primary">
        {t.searchButton}
      </button>
    </form>
  )
}

/** template-parts/no-results.php */
export function NoResults() {
  return (
    <div className="jb-empty">
      <h2>{t.nothingFound}</h2>
      <p className="jb-body" style={{ marginTop: 'var(--jb-space-m)' }}>
        {t.nothingFoundText}
      </p>
      <SearchForm />
    </div>
  )
}

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
