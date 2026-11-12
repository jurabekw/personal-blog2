import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth'
import { getSettings } from '@/lib/data/settings'
import { storageKind } from '@/lib/storage'
import { GeneralSettingsScreen, type SettingsTab } from '@/components/admin/GeneralSettings'
import { DEFAULT_EXCEPTIONS, DEFAULT_PROTECTED_WORDS } from '@/lib/translit/defaults'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage({ searchParams }: PageProps<'/admin/settings'>) {
  await requireUser('manage_options')
  const settings = await getSettings()
  const requested = (await searchParams).tab
  const tab: SettingsTab = requested === 'reading' || requested === 'alphabets' ? requested : 'general'
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
  const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || (vercel ? `https://${vercel}` : 'http://localhost:3000')
  return (
    <GeneralSettingsScreen
      key={tab}
      general={settings.general}
      reading={settings.reading}
      alphabets={settings.alphabets}
      alphabetDefaults={{ exceptions: DEFAULT_EXCEPTIONS, protectedWords: DEFAULT_PROTECTED_WORDS }}
      storage={storageKind()}
      envSiteUrl={envSiteUrl}
      initialTab={tab}
    />
  )
}
