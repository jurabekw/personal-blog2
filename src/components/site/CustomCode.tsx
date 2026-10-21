import Script from 'next/script'

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const m of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
    out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? ''
  }
  return out
}

/**
 * Renders admin-provided "custom code" (Settings → SEO → Integrations), like the
 * "Insert Headers and Footers" plugin: <script> tags become next/script (so they
 * actually execute, after the page is interactive), <meta>/<link> tags are hoisted
 * into <head>, anything else is inserted as HTML.
 */
export function CustomCode({ code, id }: { code: string; id: string }) {
  if (!code?.trim()) return null
  const parts: React.ReactNode[] = []
  let rest = code
  let i = 0

  rest = rest.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (_m, a: string, body: string) => {
    const at = attrs(a)
    const key = `${id}-s${i++}`
    if (at.type && !/javascript|module/i.test(at.type)) {
      parts.push(<script key={key} type={at.type} dangerouslySetInnerHTML={{ __html: body }} />)
    } else if (at.src) {
      parts.push(<Script key={key} id={key} src={at.src} strategy="afterInteractive" />)
    } else if (body.trim()) {
      parts.push(
        <Script key={key} id={key} strategy="afterInteractive">
          {body}
        </Script>,
      )
    }
    return ''
  })
  rest = rest.replace(/<meta\b([^>]*)\/?>/gi, (_m, a: string) => {
    const at = attrs(a)
    parts.push(<meta key={`${id}-m${i++}`} {...(at as React.MetaHTMLAttributes<HTMLMetaElement>)} />)
    return ''
  })
  rest = rest.replace(/<link\b([^>]*)\/?>/gi, (_m, a: string) => {
    const at = attrs(a)
    if (at.rel && at.href) {
      parts.push(<link key={`${id}-l${i++}`} rel={at.rel} href={at.href} />)
    }
    return ''
  })
  if (rest.trim()) parts.push(<div key={`${id}-h`} dangerouslySetInnerHTML={{ __html: rest }} />)
  return <>{parts}</>
}
