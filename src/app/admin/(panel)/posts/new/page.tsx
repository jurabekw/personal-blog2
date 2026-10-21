import type { Metadata } from 'next'
import { EditorScreen } from '@/components/admin/EditorScreen'

export const metadata: Metadata = { title: 'Add New Post' }

export default function NewPostPage() {
  return <EditorScreen type="post" />
}
