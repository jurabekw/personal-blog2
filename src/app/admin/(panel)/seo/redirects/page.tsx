import type { Metadata } from 'next'
import { listRedirects } from '@/app/admin/_actions/seo'
import { getSettings, resolveSiteUrl } from '@/lib/data/settings'
import { RedirectsScreen } from '@/components/admin/RedirectsScreen'

export const metadata: Metadata = { title: 'Redirects' }

export default async function RedirectsPage() {
  const [rows, settings] = await Promise.all([listRedirects(), getSettings()])
  return <RedirectsScreen initial={rows} siteUrl={resolveSiteUrl(settings)} />
}
