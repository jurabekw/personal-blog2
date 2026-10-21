import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth'
import { getSettings } from '@/lib/data/settings'
import { publishedPagesList } from '@/lib/data/pages-list'
import { getTaxonomies } from '@/lib/data/posts'
import { MenusScreen } from '@/components/admin/MenusScreen'

export const metadata: Metadata = { title: 'Menus' }

export default async function MenusPage() {
  await requireUser('manage_options')
  const [settings, pages, tax] = await Promise.all([getSettings(), publishedPagesList(), getTaxonomies()])
  return <MenusScreen initial={settings.menus} pages={pages} categories={tax.categories.map((c) => ({ name: c.name, path: c.path }))} />
}
