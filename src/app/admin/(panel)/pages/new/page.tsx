import type { Metadata } from 'next'
import { EditorScreen } from '@/components/admin/EditorScreen'

export const metadata: Metadata = { title: 'Add New Page' }

export default function NewPagePage() {
  return <EditorScreen type="page" />
}
