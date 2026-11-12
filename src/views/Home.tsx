import Link from 'next/link'
import type { Metadata } from 'next'
import { isDatabaseConfigured } from '@/lib/db'
import { getFeaturedPost, getMediaInfoForHtml, getRecentPosts, getTaxonomies } from '@/lib/data/posts'
import { renderContent } from '@/lib/content/render'
import { metadataFor, seoFor } from '@/lib/seo/page'
import { buildGraph } from '@/lib/seo/schema'
import { getTranslitConfig } from '@/lib/translit'
import { scriptContentLinks } from '@/lib/content/links'
import { AuthorPhoto, CategoryChips, FeatureCard, JsonLd, NoResults, PostCard } from '@/components/site/parts'
import { Sidebar } from '@/components/site/Sidebar'
import { Enhancer } from '@/components/site/Enhancer'
import { SetupNotice } from '@/components/site/SetupNotice'
import { localizer, uiFor, type Script } from '@/lib/alphabet'

export function metadataHome(script: Script): Promise<Metadata> {
  return metadataFor({ kind: 'home', path: '/', script })
}

/** front-page.php */
export async function renderHome(script: Script) {
  if (!isDatabaseConfigured()) return <SetupNotice />

  const { settings: raw, siteUrl, resolved, url } = await seoFor({ kind: 'home', path: '/', script })
  const cfg = getTranslitConfig(raw.alphabets)
  const L = localizer(script, cfg, siteUrl)
  const ui = uiFor(script, cfg, siteUrl)
  const { t, href } = ui
  const settings = L.settings(raw)
  const { appearance, general, reading } = settings
  const { hero, author } = appearance
  const [featuredRaw, tax] = await Promise.all([getFeaturedPost(), getTaxonomies()])
  const recent = L.posts(await getRecentPosts(Math.max(1, reading.homeRecentCount), featuredRaw?.id ?? 0))
  const featured = featuredRaw ? L.post(featuredRaw) : null
  const homeHtml = appearance.homeContent?.trim()
    ? scriptContentLinks(
        renderContent(appearance.homeContent, {
          media: await getMediaInfoForHtml(raw.appearance.homeContent),
          ...(script === 'latn' ? {} : { copyLabel: t.copy, copiedLabel: t.copied }),
        }).html,
        script,
        siteUrl,
      )
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
                <Link className="jb-btn jb-btn--primary jb-btn--lg" href={href('/blog/')}>
                  {t.viewPosts}
                </Link>
                {author.aboutUrl ? (
                  <Link className="jb-btn jb-btn--ghost jb-btn--lg" href={href(author.aboutUrl)}>
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
          <CategoryChips categories={L.terms(tax.categories)} ui={ui} />

          <div className="jb-layout jb-layout--sidebar">
            <div>
              {featured ? (
                <section className="jb-section jb-section--first" aria-labelledby="jb-featured-title">
                  <h2 id="jb-featured-title" className="jb-section__title">
                    {t.featuredPost}
                  </h2>
                  <div className="jb-section__body">
                    <FeatureCard post={featured} language={lang} timezone={tz} ui={ui} />
                  </div>
                </section>
              ) : null}

              {recent.length ? (
                <section className="jb-section" aria-labelledby="jb-recent-title">
                  <div className="jb-section-head">
                    <h2 id="jb-recent-title" className="jb-section__title">
                      {t.recentPosts}
                    </h2>
                    <Link className="jb-body-medium" href={href('/blog/')}>
                      {t.allArrow}
                    </Link>
                  </div>
                  <div className="jb-grid jb-grid--2">
                    {recent.map((p) => (
                      <PostCard key={p.id} post={p} language={lang} timezone={tz} ui={ui} />
                    ))}
                  </div>
                </section>
              ) : null}

              {!featured && !recent.length ? <NoResults ui={ui} /> : null}
            </div>

            <Sidebar script={script} />
          </div>
        </div>
      </main>
      {homeHtml.includes('jb-copy-box') ? (
        <Enhancer {...(script === 'latn' ? {} : { labels: { copy: t.copy, copied: t.copied, copyFailed: t.copyFailed } })} />
      ) : null}
    </>
  )
}
