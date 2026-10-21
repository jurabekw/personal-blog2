import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth'
import { getSettings } from '@/lib/data/settings'
import { publishedPagesList } from '@/lib/data/pages-list'
import { storageKind } from '@/lib/storage'
import { AppearanceScreen } from '@/components/admin/AppearanceScreen'

export const metadata: Metadata = { title: 'Customize' }

export default async function AppearancePage() {
  await requireUser('manage_options')
  const [settings, pages] = await Promise.all([getSettings(), publishedPagesList()])
  return <AppearanceScreen initial={settings.appearance} pages={pages} storage={storageKind()} />
}
