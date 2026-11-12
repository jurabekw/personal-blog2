import Script from 'next/script'
import { preload } from 'react-dom'
import '@/styles/fonts.css'
import '@/styles/theme.css'
import '@/styles/extras.css'
import { Header } from './Header'
import { Footer } from './Footer'
import { CustomCode } from './CustomCode'
import { DEFAULT_SETTINGS } from '@/lib/settings-defaults'
import { alphabetContext, type Script as Alphabet } from '@/lib/alphabet'

/**
 * Public site chrome (header, footer, analytics) shared by every alphabet's root layout.
 * Settings, UI text and internal links follow the alphabet; Latin output is unchanged.
 */
export async function SiteChrome({ script, children }: { script: Alphabet; children: React.ReactNode }) {
  preload('/fonts/montserrat-latin-wght-normal.woff2', { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' })
  preload('/fonts/golos-text-latin-wght-normal.woff2', { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' })

  const { settings, ui } = await alphabetContext(script)
  const t = ui.t
  const { appearance, general, menus, seo } = settings
  const color = /^#[0-9a-f]{3,8}$/i.test(appearance.primaryColor) ? appearance.primaryColor : DEFAULT_SETTINGS.appearance.primaryColor
  const width = Math.min(1440, Math.max(960, Number(appearance.contentWidth) || 1180))
  const custom =
    color !== DEFAULT_SETTINGS.appearance.primaryColor || width !== DEFAULT_SETTINGS.appearance.contentWidth
      ? `:root{--jb-green:${color};--jb-content-width:${width}px;}`
      : ''
  const a = seo.analytics
  /** Alphabet dimension for GA4 (config parameter) and Yandex Metrika (visit params): latn | cyrl | yangi. */
  const analyticsParams = JSON.stringify({ alphabet: script })

  return (
    <>
      {custom ? <style dangerouslySetInnerHTML={{ __html: custom }} /> : null}
      {a.gtm ? (
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(a.gtm)}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
            title="gtm"
          />
        </noscript>
      ) : null}
      <a className="skip-link screen-reader-text" href="#jb-main">
        {t.skipToContent}
      </a>
      <Header
        siteName={general.siteName}
        tagline={general.tagline}
        logoUrl={general.logoUrl}
        menu={menus.primary}
        ctaText={appearance.headerCtaText}
        ctaUrl={ui.href(appearance.headerCtaUrl)}
        script={script}
        {...(script === 'latn'
          ? {}
          : {
              homeHref: ui.href('/'),
              strings: {
                mainMenu: t.mainMenu,
                openMenu: t.openMenu,
                darkModeOn: t.darkModeOn,
                lightModeOn: t.lightModeOn,
                alphabets: t.alphabets,
              },
            })}
      />
      <div id="jb-content">{children}</div>
      <Footer script={script} />

      {/* Analytics load after the page is interactive so they never slow down rendering. */}
      {a.ga4 ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(a.ga4)}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(a.ga4)},${analyticsParams});`}
          </Script>
        </>
      ) : null}
      {a.gtm ? (
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${JSON.stringify(a.gtm)});`}
        </Script>
      ) : null}
      {a.yandexMetrica ? (
        <Script id="ym" strategy="lazyOnload">
          {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js','ym');ym(${Number(a.yandexMetrica) || 0},'init',{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});ym(${Number(a.yandexMetrica) || 0},'params',${analyticsParams});`}
        </Script>
      ) : null}
      <CustomCode code={a.headCode} id="head-code" />
      <CustomCode code={a.bodyCode} id="body-code" />
    </>
  )
}
