import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EditorScreen } from '@/components/admin/EditorScreen'

export const metadata: Metadata = { title: 'Edit Page' }

export default async function EditPagePage({ params }: PageProps<'/admin/pages/[id]'>) {
  const id = Number((await params).id)
  if (!Number.isInteger(id) || id <= 0) notFound()
  return <EditorScreen type="page" id={id} />
}
