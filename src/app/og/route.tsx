import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getSettings, resolveSiteUrl } from '@/lib/data/settings'
import { isScript } from '@/lib/script'
import { getTranslitConfig, transliterateText } from '@/lib/translit'

const readFonts = (files: string[]) => Promise.all(files.map((f) => readFile(join(process.cwd(), 'assets/og', f))))

const fontsPromise = readFonts([
  'montserrat-latin-700-normal.woff',
  'montserrat-latin-ext-700-normal.woff',
  'golos-text-latin-500-normal.woff',
  'golos-text-latin-ext-500-normal.woff',
])

/** Cyrillic subsets (cyrillic-ext carries Uzbek қ ғ ҳ), loaded only for script=cyrl. */
let cyrillicFonts: Promise<Buffer[]> | null = null
const cyrillicFontsPromise = () =>
  (cyrillicFonts ??= readFonts([
    'montserrat-cyrillic-700-normal.woff',
    'montserrat-cyrillic-ext-700-normal.woff',
    'golos-text-cyrillic-500-normal.woff',
    'golos-text-cyrillic-ext-500-normal.woff',
  ]))

// Each unicode subset is its own family: Satori does not fall back between fonts that share a
// name, so the subsets are chained in font-family instead (missing families are skipped).
const MONTSERRAT = 'Montserrat, "Montserrat LatinExt", "Montserrat Cyrillic", "Montserrat CyrillicExt"'
const GOLOS = 'Golos, "Golos LatinExt", "Golos Cyrillic", "Golos CyrillicExt"'

/**
 * Branded 1200×630 share image for pages without their own image: /og/?title=...&label=...
 * `script=cyrl|yangi` (alphabet versions) transliterates the Latin title, label and site texts.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const settings = await getSettings()
  const sp = searchParams.get('script')
  const script = isScript(sp) ? sp : 'latn'
  const cfg = script === 'latn' ? null : getTranslitConfig(settings.alphabets)
  const tx = (v: string) => (cfg && v ? transliterateText(v, script, cfg) : v)
  const siteName = tx(settings.general.siteName)
  const tagline = tx(settings.general.tagline)
  const title = tx((searchParams.get('title') || settings.general.siteName).slice(0, 140))
  const label = tx((searchParams.get('label') || '').slice(0, 40))
  const color = /^#[0-9a-f]{6}$/i.test(settings.appearance.primaryColor) ? settings.appearance.primaryColor : '#1cca59'
  const host = resolveSiteUrl(settings).replace(/^https?:\/\//, '')
  const [m1, m2, g1, g2] = await fontsPromise
  const cyr = script === 'cyrl' ? await cyrillicFontsPromise() : []
  const initial = Array.from(siteName)[0] ?? 'J'
  const size = title.length > 90 ? 52 : title.length > 60 ? 60 : 68

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          background: '#f0f2f5',
          backgroundImage: `radial-gradient(circle at 0% 0%, ${color}33 0%, transparent 55%), radial-gradient(circle at 100% 100%, #dfe7f1 0%, transparent 60%)`,
          fontFamily: GOLOS,
          color: '#202020',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 64,
              background: color,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: MONTSERRAT,
              fontSize: 34,
            }}
          >
            {initial}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: MONTSERRAT, fontSize: 30 }}>{siteName}</div>
            <div style={{ fontSize: 22, color: '#7c858d' }}>{tagline}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {label ? (
            <div style={{ display: 'flex' }}>
              <div style={{ background: '#fff', color, borderRadius: 40, padding: '10px 24px', fontSize: 24 }}>{label}</div>
            </div>
          ) : null}
          <div style={{ fontFamily: MONTSERRAT, fontSize: size, lineHeight: 1.15, letterSpacing: -1, maxWidth: 1040 }}>{title}</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 24, color: '#5e666e' }}>
          <div>{host}</div>
          <div style={{ width: 120, height: 8, borderRadius: 8, background: color }} />
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Montserrat', data: m1, weight: 700, style: 'normal' },
        { name: 'Montserrat LatinExt', data: m2, weight: 700, style: 'normal' },
        { name: 'Golos', data: g1, weight: 500, style: 'normal' },
        { name: 'Golos LatinExt', data: g2, weight: 500, style: 'normal' },
        ...(cyr.length
          ? ([
              { name: 'Montserrat Cyrillic', data: cyr[0], weight: 700, style: 'normal' },
              { name: 'Montserrat CyrillicExt', data: cyr[1], weight: 700, style: 'normal' },
              { name: 'Golos Cyrillic', data: cyr[2], weight: 500, style: 'normal' },
              { name: 'Golos CyrillicExt', data: cyr[3], weight: 500, style: 'normal' },
            ] as const)
          : []),
      ],
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400' },
    },
  )
}
