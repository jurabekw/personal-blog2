import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth'
import { getSettings } from '@/lib/data/settings'
import { storageKind } from '@/lib/storage'
import { SeoSettings } from '@/components/admin/SeoSettings'

export const metadata: Metadata = { title: 'SEO Settings' }

export default async function SeoPage({ searchParams }: PageProps<'/admin/seo'>) {
  const user = await requireUser('edit_others')
  const settings = await getSettings()
  const tab = (await searchParams).tab
  return <SeoSettings initial={settings.seo} general={settings.general} storage={storageKind()} isAdmin={user.role === 'administrator'} initialTab={typeof tab === 'string' ? tab : undefined} />
}
