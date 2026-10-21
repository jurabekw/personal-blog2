import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth'
import { adminTerms } from '@/lib/data/admin'
import { getSettings, resolveSiteUrl } from '@/lib/data/settings'
import { TermsScreen } from '@/components/admin/TermsScreen'

export const metadata: Metadata = { title: 'Categories' }

export default async function CategoriesPage() {
  await requireUser('edit_others')
  const [terms, settings] = await Promise.all([adminTerms('category'), getSettings()])
  return <TermsScreen taxonomy="category" terms={terms} siteUrl={resolveSiteUrl(settings)} />
}
