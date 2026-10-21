import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getSettings, resolveSiteUrl } from '@/lib/data/settings'

const fontsPromise = Promise.all(
  [
    'montserrat-latin-700-normal.woff',
    'montserrat-latin-ext-700-normal.woff',
    'golos-text-latin-500-normal.woff',
    'golos-text-latin-ext-500-normal.woff',
  ].map((f) => readFile(join(process.cwd(), 'assets/og', f))),
)

/** Branded 1200×630 share image for pages without their own image: /og/?title=...&label=... */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const settings = await getSettings()
  const title = (searchParams.get('title') || settings.general.siteName).slice(0, 140)
  const label = (searchParams.get('label') || '').slice(0, 40)
  const color = /^#[0-9a-f]{6}$/i.test(settings.appearance.primaryColor) ? settings.appearance.primaryColor : '#1cca59'
  const host = resolveSiteUrl(settings).replace(/^https?:\/\//, '')
  const [m1, m2, g1, g2] = await fontsPromise
  const initial = Array.from(settings.general.siteName)[0] ?? 'J'
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
          fontFamily: 'Golos',
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
              fontFamily: 'Montserrat',
              fontSize: 34,
            }}
          >
            {initial}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: 'Montserrat', fontSize: 30 }}>{settings.general.siteName}</div>
            <div style={{ fontSize: 22, color: '#7c858d' }}>{settings.general.tagline}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {label ? (
            <div style={{ display: 'flex' }}>
              <div style={{ background: '#fff', color, borderRadius: 40, padding: '10px 24px', fontSize: 24 }}>{label}</div>
            </div>
          ) : null}
          <div style={{ fontFamily: 'Montserrat', fontSize: size, lineHeight: 1.15, letterSpacing: -1, maxWidth: 1040 }}>{title}</div>
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
        { name: 'Montserrat', data: m2, weight: 700, style: 'normal' },
        { name: 'Golos', data: g1, weight: 500, style: 'normal' },
        { name: 'Golos', data: g2, weight: 500, style: 'normal' },
      ],
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400' },
    },
  )
}
