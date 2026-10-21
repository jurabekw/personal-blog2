import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth'
import { getSettings } from '@/lib/data/settings'
import { storageKind } from '@/lib/storage'
import { GeneralSettingsScreen } from '@/components/admin/GeneralSettings'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage({ searchParams }: PageProps<'/admin/settings'>) {
  await requireUser('manage_options')
  const settings = await getSettings()
  const tab = (await searchParams).tab === 'reading' ? 'reading' : 'general'
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
  const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || (vercel ? `https://${vercel}` : 'http://localhost:3000')
  return <GeneralSettingsScreen key={tab} general={settings.general} reading={settings.reading} storage={storageKind()} envSiteUrl={envSiteUrl} initialTab={tab} />
}
