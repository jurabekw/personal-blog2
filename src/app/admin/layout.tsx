import type { Metadata, Viewport } from 'next'
import '@/styles/fonts.css'
import '@/styles/admin.css'
import { RootHtml, rootMetadata, rootViewport } from '@/components/site/RootHtml'
import { getSettings } from '@/lib/data/settings'

export async function generateMetadata(): Promise<Metadata> {
  return {
    ...(await rootMetadata()),
    title: { default: 'Admin', template: '%s ‹ Admin' },
    robots: { index: false, follow: false },
  }
}

export const viewport: Viewport = rootViewport

/** Admin root layout: the same <html> document the whole app used before the alphabet trees. */
export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings()
  return (
    <RootHtml lang={settings.general.language || 'uz'}>
      <div className="wpa-root">{children}</div>
    </RootHtml>
  )
}
