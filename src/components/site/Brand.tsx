import Link from 'next/link'

/** Site brand: custom logo, or the green initial mark + name + tagline (theme jb_brand()). */
export function Brand({ siteName, tagline, logoUrl }: { siteName: string; tagline: string; logoUrl: string }) {
  if (logoUrl) {
    return (
      <Link className="jb-brand" href="/" rel="home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt={siteName} height={40} style={{ height: 40, width: 'auto' }} />
      </Link>
    )
  }
  return (
    <Link className="jb-brand" href="/" rel="home">
      <span className="jb-brand__mark" aria-hidden="true">
        {Array.from(siteName)[0] ?? ''}
      </span>
      <span className="jb-brand__name">
        {siteName}
        {tagline ? <span className="jb-brand__tagline">{tagline}</span> : null}
      </span>
    </Link>
  )
}
