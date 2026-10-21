import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth'
import { listBulk } from '@/app/admin/_actions/seo'
import { getSettings, resolveSiteUrl } from '@/lib/data/settings'
import { defaultRobotsTxt } from '@/lib/seo/robots'
import { SeoTools } from '@/components/admin/SeoTools'

export const metadata: Metadata = { title: 'SEO Tools' }

export default async function SeoToolsPage() {
  const user = await requireUser('edit_others')
  const [bulk, settings] = await Promise.all([listBulk('post'), getSettings()])
  return (
    <SeoTools
      bulk={bulk}
      robotsTxt={settings.seo.robotsTxt}
      defaultRobots={defaultRobotsTxt(resolveSiteUrl(settings))}
      titleTemplate={settings.seo.titles.post}
      isAdmin={user.role === 'administrator'}
    />
  )
}
