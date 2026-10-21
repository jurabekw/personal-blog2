import Link from 'next/link'
import type { AllSettings } from '@/lib/settings-defaults'
import type { PostFull, PostSummary } from '@/lib/data/posts'
import type { Heading } from '@/lib/types'
import { t } from '@/lib/i18n'
import { AuthorPhoto, Breadcrumb, FillImage, JsonLd, PostCard, PostMeta, type Crumb } from './parts'
import { Sidebar, SocialLinks } from './Sidebar'
import { Enhancer } from './Enhancer'

function Byline({ settings }: { settings: AllSettings }) {
  const a = settings.appearance.author
  return (
    <div className="jb-article__byline">
      <AuthorPhoto url={a.photoUrl} name={a.name} size={40} className="jb-byline__photo" />
      <div>
        <p className="jb-about__name">{a.name}</p>
        {a.role ? <p className="jb-about__role">{a.role}</p> : null}
      </div>
    </div>
  )
}

function Share({ url, title }: { url: string; title: string }) {
  const telegram = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
  return (
    <section className="jb-share" aria-label={t.share}>
      <span className="jb-share__label">{t.share}</span>
      <div className="jb-share__actions">
        <a className="jb-share__icon" href={telegram} target="_blank" rel="noopener noreferrer" aria-label={t.shareTelegram} title={t.shareTelegram}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M21.5 3.4 18.3 19c-.2 1.1-.9 1.4-1.8.9l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.1-8.2c.4-.4-.1-.6-.6-.2L5.8 12.8.9 11.3c-1.1-.3-1.1-1.1.2-1.6L20.2 2.3c.9-.3 1.7.2 1.3 1.1Z" />
          </svg>
        </a>
        <button type="button" className="jb-share__icon jb-copy-link" data-copy-url={url} data-label-success={t.linkCopied} aria-label={t.copyLink} title={t.copyLink}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M8 7V5a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-2v3a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3h3Zm3-2a1 1 0 0 0-1 1v1h4a3 3 0 0 1 3 3v4h2a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-8ZM5 9a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5Z" />
          </svg>
        </button>
      </div>
      <p className="jb-share__status screen-reader-text" role="status" aria-live="polite" />
    </section>
  )
}

function Faq({ post }: { post: PostFull }) {
  if (!post.faq?.length) return null
  return (
    <section className="jb-faq" aria-labelledby="jb-faq-title">
      <h2 id="jb-faq-title" className="jb-faq__title">
        {t.faq}
      </h2>
      {post.faq.map((q, i) => (
        <details key={i} className="jb-faq__item" id={`faq-question-${i + 1}`} open={i === 0}>
          <summary>{q.question}</summary>
          <div className="jb-faq__answer" dangerouslySetInnerHTML={{ __html: q.answer }} />
        </details>
      ))}
    </section>
  )
}

interface SingleProps {
  post: PostFull
  html: string
  headings: Heading[]
  settings: AllSettings
  url: string
  crumbs: Crumb[]
  graph: unknown
  related: PostSummary[]
  adjacent: { prev: PostSummary | null; next: PostSummary | null }
}

/** single.php */
export function SinglePost({ post, html, headings, settings, url, crumbs, graph, related, adjacent }: SingleProps) {
  const { language: lang, timezone: tz } = settings.general
  return (
    <>
      <JsonLd data={graph} />
      <div className="jb-reading-progress" role="progressbar" aria-label={t.readingProgress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}>
        <span data-jb-reading-progress="" />
      </div>
      <main id="jb-main" className="jb-main">
        <div className="jb-shell">
          {settings.seo.breadcrumbs.enabled ? <Breadcrumb items={crumbs} separator={settings.seo.breadcrumbs.separator} /> : null}

          <div className="jb-layout jb-layout--sidebar">
            <div>
              <article id={`post-${post.id}`} className="jb-article">
                {post.image ? (
                  <div className="jb-article__media">
                    <FillImage image={post.image} alt="" priority sizes="(min-width: 1180px) 820px, (min-width: 1024px) 70vw, 100vw" />
                  </div>
                ) : null}

                <div className="jb-article__body">
                  <PostMeta post={post} green language={lang} timezone={tz} />
                  <h1 className="jb-article__title">{post.title}</h1>
                  {post.hasManualExcerpt ? <p className="jb-lead jb-article__lead">{post.excerpt}</p> : null}
                  <Byline settings={settings} />
                  <div className="jb-content" dangerouslySetInnerHTML={{ __html: html }} />
                  <Faq post={post} />
                  {post.tags.length ? (
                    <div className="jb-tags" aria-label={t.tags}>
                      {post.tags.map((tag) => (
                        <span key={tag.id} className="jb-tag">
                          #{tag.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <Share url={url} title={post.title} />
                </div>
              </article>

              {adjacent.prev || adjacent.next ? (
                <nav className="navigation post-navigation jb-post-nav" aria-label={t.postsNav}>
                  <h2 className="screen-reader-text">{t.postsNav}</h2>
                  <div className="nav-links">
                    {adjacent.prev ? (
                      <div className="nav-previous">
                        <Link href={adjacent.prev.path} rel="prev">
                          <span className="jb-caption">{t.prevPost}</span>
                          <span className="jb-post-nav__title">{adjacent.prev.title}</span>
                        </Link>
                      </div>
                    ) : null}
                    {adjacent.next ? (
                      <div className="nav-next">
                        <Link href={adjacent.next.path} rel="next">
                          <span className="jb-caption">{t.nextPost}</span>
                          <span className="jb-post-nav__title">{adjacent.next.title}</span>
                        </Link>
                      </div>
                    ) : null}
                  </div>
                </nav>
              ) : null}

              {related.length ? (
                <section className="jb-section" aria-labelledby="jb-related-title" style={{ marginTop: 'var(--jb-space-4xl)' }}>
                  <h2 id="jb-related-title" className="jb-section__title">
                    {t.related}
                  </h2>
                  <div className="jb-grid jb-grid--3 jb-section__body">
                    {related.map((p) => (
                      <PostCard key={p.id} post={p} language={lang} timezone={tz} />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>

            <Sidebar headings={headings} />
          </div>
        </div>
      </main>
      <Enhancer />
    </>
  )
}

interface PageProps {
  post: PostFull
  html: string
  settings: AllSettings
  graph: unknown
}

/** page.php, page-templates/about.php and page-templates/full-width.php */
export function SinglePage({ post, html, settings, graph }: PageProps) {
  const a = settings.appearance.author
  if (post.template === 'full-width') {
    return (
      <main id="jb-main" className="jb-main">
        <JsonLd data={graph} />
        <h1 className="screen-reader-text">{post.title}</h1>
        <div className="jb-shell jb-content" style={{ marginTop: 0 }} dangerouslySetInnerHTML={{ __html: html }} />
        <Enhancer />
      </main>
    )
  }

  if (post.template === 'about') {
    return (
      <main id="jb-main" className="jb-main">
        <JsonLd data={graph} />
        <div className="jb-shell">
          <div className="jb-layout jb-layout--sidebar">
            <div>
              <article id={`post-${post.id}`} className="jb-article jb-about-page">
                <div className="jb-article__body">
                  <header className="jb-about-page__head">
                    <AuthorPhoto url={a.photoUrl} name={a.name} size={96} className="jb-about-page__photo" priority />
                    <div>
                      <h1 className="jb-article__title">{a.name || post.title}</h1>
                      {a.role ? <p className="jb-lead jb-muted jb-about-page__role">{a.role}</p> : null}
                    </div>
                  </header>
                  <div className="jb-content" dangerouslySetInnerHTML={{ __html: html }} />
                  <div className="jb-about-page__actions">
                    {a.socials.map((s) => (
                      <a key={s.url} className="jb-btn jb-btn--ghost" href={s.url} target="_blank" rel="noopener noreferrer">
                        {s.label}
                      </a>
                    ))}
                    <Link className="jb-btn jb-btn--primary" href="/blog/">
                      {t.readPosts}
                    </Link>
                  </div>
                </div>
              </article>
            </div>
            <Sidebar />
          </div>
        </div>
        <Enhancer />
      </main>
    )
  }

  return (
    <main id="jb-main" className="jb-main">
      <JsonLd data={graph} />
      <div className="jb-shell">
        <article id={`post-${post.id}`} className="jb-article">
          {post.image ? (
            <div className="jb-article__media">
              <FillImage image={post.image} alt="" priority sizes="(min-width: 1180px) 1140px, 100vw" />
            </div>
          ) : null}
          <div className="jb-article__body">
            <h1 className="jb-article__title">{post.title}</h1>
            <div className="jb-content" dangerouslySetInnerHTML={{ __html: html }} />
            <Faq post={post} />
          </div>
        </article>
      </div>
      <Enhancer />
    </main>
  )
}

export { SocialLinks }
