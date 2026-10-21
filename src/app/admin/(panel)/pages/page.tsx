import type { Metadata } from 'next'
import { PostListScreen } from '@/components/admin/PostListScreen'
import { requireUser } from '@/lib/auth'

export const metadata: Metadata = { title: 'Pages' }

export default async function PagesPage({ searchParams }: PageProps<'/admin/pages'>) {
  await requireUser('edit_others')
  return <PostListScreen type="page" searchParams={await searchParams} />
}
