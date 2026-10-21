import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth'
import { adminTerms } from '@/lib/data/admin'
import { getSettings, resolveSiteUrl } from '@/lib/data/settings'
import { TermsScreen } from '@/components/admin/TermsScreen'

export const metadata: Metadata = { title: 'Tags' }

export default async function TagsPage() {
  await requireUser('publish')
  const [terms, settings] = await Promise.all([adminTerms('tag'), getSettings()])
  return <TermsScreen taxonomy="tag" terms={terms} siteUrl={resolveSiteUrl(settings)} />
}
