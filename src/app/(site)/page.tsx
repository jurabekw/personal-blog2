import Link from 'next/link'
import type { Metadata } from 'next'
import { isDatabaseConfigured } from '@/lib/db'
import { getFeaturedPost, getMediaInfoForHtml, getRecentPosts, getTaxonomies } from '@/lib/data/posts'
import { renderContent } from '@/lib/content/render'
import { metadataFor, seoFor } from '@/lib/seo/page'
import { buildGraph } from '@/lib/seo/schema'
import { t } from '@/lib/i18n'
import { AuthorPhoto, CategoryChips, FeatureCard, JsonLd, NoResults, PostCard } from '@/components/site/parts'
import { Sidebar } from '@/components/site/Sidebar'
import { Enhancer } from '@/components/site/Enhancer'
import { SetupNotice } from '@/components/site/SetupNotice'

export const revalidate = 3600

export function generateMetadata(): Promise<Metadata> {
  return metadataFor({ kind: 'home', path: '/' })
}

/** front-page.php */
export default async function HomePage() {
  if (!isDatabaseConfigured()) return <SetupNotice />

  const { settings, siteUrl, resolved, url } = await seoFor({ kind: 'home', path: '/' })
  const { appearance, general, reading } = settings
  const { hero, author } = appearance
  const [featured, tax] = await Promise.all([getFeaturedPost(), getTaxonomies()])
  const recent = await getRecentPosts(Math.max(1, reading.homeRecentCount), featured?.id ?? 0)
  const homeHtml = appearance.homeContent?.trim()
    ? renderContent(appearance.homeContent, { media: await getMediaInfoForHtml(appearance.homeContent) }).html
    : ''
  const lang = general.language
  const tz = general.timezone

  return (
    <>
      <JsonLd data={buildGraph({ settings, siteUrl, seo: resolved, url, pageType: 'WebPage' })} />
      {hero.enabled ? (
        <section className="jb-hero" aria-labelledby="jb-hero-title">
          <div className={`jb-hero__inner${hero.card ? '' : ' jb-hero__inner--single'}`}>
            <div>
              {hero.badge ? <span className="jb-hero__badge">{hero.badge}</span> : null}
              <h1 id="jb-hero-title" className="jb-hero__title">
                {hero.title || general.siteName}
              </h1>
              {hero.text ? <p className="jb-hero__text">{hero.text}</p> : null}
              <div className="jb-hero__actions">
                <Link className="jb-btn jb-btn--primary jb-btn--lg" href="/blog/">
                  {t.viewPosts}
                </Link>
                {author.aboutUrl ? (
                  <Link className="jb-btn jb-btn--ghost jb-btn--lg" href={author.aboutUrl}>
                    {t.aboutMe}
                  </Link>
                ) : null}
              </div>
            </div>
            {hero.card ? (
              <div className="jb-hero__card-wrap">
                <div className="jb-hero__glow" aria-hidden="true" />
                <div className="jb-hero__card">
                  <AuthorPhoto url={author.photoUrl} name={author.name} size={72} className="jb-hero__photo" />
                  <div>
                    <p className="jb-hero__name">{author.name}</p>
                    {author.role ? <p className="jb-hero__role">{author.role}</p> : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <main id="jb-main" className="jb-main">
        {homeHtml ? (
          <section className="jb-homepage-content jb-shell jb-content" dangerouslySetInnerHTML={{ __html: homeHtml }} />
        ) : null}
        <div className="jb-shell">
          {!hero.enabled ? <h1 className="screen-reader-text">{general.siteName}</h1> : null}
          <CategoryChips categories={tax.categories} />

          <div className="jb-layout jb-layout--sidebar">
            <div>
              {featured ? (
                <section className="jb-section jb-section--first" aria-labelledby="jb-featured-title">
                  <h2 id="jb-featured-title" className="jb-section__title">
                    {t.featuredPost}
                  </h2>
                  <div className="jb-section__body">
                    <FeatureCard post={featured} language={lang} timezone={tz} />
                  </div>
                </section>
              ) : null}

              {recent.length ? (
                <section className="jb-section" aria-labelledby="jb-recent-title">
                  <div className="jb-section-head">
                    <h2 id="jb-recent-title" className="jb-section__title">
                      {t.recentPosts}
                    </h2>
                    <Link className="jb-body-medium" href="/blog/">
                      {t.allArrow}
                    </Link>
                  </div>
                  <div className="jb-grid jb-grid--2">
                    {recent.map((p) => (
                      <PostCard key={p.id} post={p} language={lang} timezone={tz} />
                    ))}
                  </div>
                </section>
              ) : null}

              {!featured && !recent.length ? <NoResults /> : null}
            </div>

            <Sidebar />
          </div>
        </div>
      </main>
      {homeHtml.includes('jb-copy-box') ? <Enhancer /> : null}
    </>
  )
}
