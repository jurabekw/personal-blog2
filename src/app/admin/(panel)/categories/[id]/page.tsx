import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { adminTerms } from '@/lib/data/admin'
import { getSettings } from '@/lib/data/settings'
import { storageKind } from '@/lib/storage'
import { TermEditor } from '@/components/admin/TermEditor'
import { seoSiteSettings } from '@/components/admin/EditorScreen'

export const metadata: Metadata = { title: 'Edit term' }

export default async function EditTermPage({ params }: PageProps<'/admin/categories/[id]'>) {
  await requireUser('edit_others')
  const id = Number((await params).id)
  const [all, settings] = await Promise.all([adminTerms('category'), getSettings()])
  const term = all.find((t) => t.id === id)
  if (!term) notFound()
  const chain: string[] = []
  let cur = term.parentId ? all.find((t) => t.id === term.parentId) : undefined
  while (cur && chain.length < 10) {
    chain.unshift(cur.slug)
    cur = cur.parentId ? all.find((t) => t.id === cur!.parentId) : undefined
  }
  const prefix = '/category/' + chain.map((s) => s + '/').join('')
  return <TermEditor term={term} taxonomy="category" all={all} site={seoSiteSettings(settings, 'category')} storage={storageKind()} parentPath={prefix} />
}
