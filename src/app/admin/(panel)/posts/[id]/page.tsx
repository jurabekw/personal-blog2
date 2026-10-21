import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EditorScreen } from '@/components/admin/EditorScreen'

export const metadata: Metadata = { title: 'Edit Post' }

export default async function EditPostPage({ params }: PageProps<'/admin/posts/[id]'>) {
  const id = Number((await params).id)
  if (!Number.isInteger(id) || id <= 0) notFound()
  return <EditorScreen type="post" id={id} />
}
