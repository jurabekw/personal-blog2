import Image from 'next/image'
import Link from 'next/link'
import { getSettings } from '@/lib/data/settings'
import { getRecentPosts, getTaxonomies } from '@/lib/data/posts'
import { t } from '@/lib/i18n'
import type { Heading } from '@/lib/types'
import { AuthorPhoto, canOptimize } from './parts'

function SocialLinks({ socials }: { socials: { label: string; url: string }[] }) {
  if (!socials.length) return null
  return (
    <ul className="jb-social">
      {socials.map((s) => (
        <li key={s.url}>
          <a href={s.url} target="_blank" rel="noopener noreferrer">
            {s.label}
          </a>
        </li>
      ))}
    </ul>
  )
}

export { SocialLinks }

function Subheading({ children }: { children: string }) {
  return (
    <h3 className="jb-widget__subtitle">
      <span className="jb-widget__bar" aria-hidden="true" />
      {children}
    </h3>
  )
}

/** "Mundarija" — numbered H2/H3 list; sticks to the top while reading (desktop). */
export function TocNav({ headings, title }: { headings: Heading[]; title: string }) {
  if (headings.length < 2) return null
  let n2 = 0
  let n3 = 0
  return (
    <nav className="jb-toc" aria-labelledby="jb-toc-title" data-jb-toc>
      <div className="jb-toc__head">
        <svg className="jb-toc__icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
        </svg>
        <h2 id="jb-toc-title" className="jb-toc__title">
          {title}
        </h2>
      </div>
      <ol className="jb-toc__list">
        {headings.map((h) => {
          let num: string
          if (h.level === 2) {
            n2++
            n3 = 0
            num = `${n2}.`
          } else {
            n3++
            num = `${Math.max(n2, 1)}.${n3}`
          }
          return (
            <li key={h.id} className={`jb-toc__item jb-toc__item--h${h.level}`}>
              <a className="jb-toc__link" href={`#${h.id}`}>
                <span className="jb-toc__num">{num}</span>
                <span className="jb-toc__text">{h.text}</span>
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/** sidebar.php: Men haqimda → Blog navigatsiyasi → Mundarija (post pages only). */
export async function Sidebar({ headings }: { headings?: Heading[] }) {
  const settings = await getSettings()
  const { sidebar, author } = settings.appearance
  const tax = sidebar.blogNav.enabled && sidebar.blogNav.showCategories ? await getTaxonomies() : null
  const categories = tax ? tax.categories.filter((c) => c.count > 0) : []
  const recent =
    sidebar.blogNav.enabled && sidebar.blogNav.showRecent
      ? await getRecentPosts(Math.min(10, Math.max(1, sidebar.blogNav.recentCount)))
      : []

  return (
    <aside className="jb-sidebar" aria-label={t.sidebar}>
      {sidebar.about.enabled ? (
        <section className="jb-widget widget_jb_about">
          <h2 className="jb-widget__title">{sidebar.about.title || t.aboutMe}</h2>
          <div className="jb-about">
            <div className="jb-about__head">
              <AuthorPhoto url={author.photoUrl} name={author.name} size={56} className="jb-about__photo" />
              <div>
                {author.name ? <p className="jb-about__name">{author.name}</p> : null}
                {author.role ? <p className="jb-about__role">{author.role}</p> : null}
              </div>
            </div>
            {author.bio ? <p className="jb-about__bio">{author.bio}</p> : null}
            <SocialLinks socials={author.socials} />
            {author.aboutUrl ? (
              <Link className="jb-about__more" href={author.aboutUrl}>
                {t.fullAbout}
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      {sidebar.blogNav.enabled && (categories.length || recent.length) ? (
        <section className="jb-widget widget_jb_blog_nav">
          <h2 className="jb-widget__title">{sidebar.blogNav.title || 'Blog navigatsiyasi'}</h2>
          {categories.length ? (
            <div className="jb-nav-block jb-nav-block--categories">
              <Subheading>{t.categories}</Subheading>
              <ul className="jb-cat-list">
                {categories.map((c) => (
                  <li key={c.id}>
                    <Link href={c.path}>
                      <span>{c.name}</span>
                      <span className="jb-count">{c.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {recent.length ? (
            <div className="jb-nav-block jb-nav-block--recent">
              <Subheading>{t.recentPosts}</Subheading>
              <ul className="jb-recent-list">
                {recent.map((p) => (
                  <li key={p.id}>
                    <Link href={p.path}>
                      {p.image ? (
                        <Image
                          className="jb-recent-list__thumb"
                          src={p.image.url}
                          alt=""
                          width={44}
                          height={44}
                          unoptimized={!canOptimize(p.image.url)}
                        />
                      ) : (
                        <span className="jb-recent-list__thumb jb-recent-list__thumb--empty" aria-hidden="true" />
                      )}
                      <span className="jb-recent-list__title">{p.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {sidebar.toc.enabled && headings && headings.length >= 2 ? (
        <section className="jb-widget widget_jb_article_sections">
          <TocNav headings={headings} title={sidebar.toc.title || 'Mundarija'} />
        </section>
      ) : null}
    </aside>
  )
}
