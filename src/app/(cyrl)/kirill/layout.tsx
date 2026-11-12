import type { Metadata, Viewport } from 'next'
import { RootHtml, rootMetadata, rootViewport } from '@/components/site/RootHtml'
import { SiteChrome } from '@/components/site/SiteChrome'
import { HTML_LANG } from '@/lib/script'

export function generateMetadata(): Promise<Metadata> {
  return rootMetadata()
}

export const viewport: Viewport = rootViewport

export default function CyrlRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <RootHtml lang={HTML_LANG.cyrl}>
      <SiteChrome script="cyrl">{children}</SiteChrome>
    </RootHtml>
  )
}
