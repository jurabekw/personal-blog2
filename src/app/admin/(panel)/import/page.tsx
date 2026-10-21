import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth'
import { storageKind } from '@/lib/storage'
import { ImportScreen } from '@/components/admin/ImportScreen'

export const metadata: Metadata = { title: 'Import' }

// Each import step downloads images; give the server actions room on Vercel.
export const maxDuration = 300

export default async function ImportPage() {
  await requireUser('manage_options')
  return <ImportScreen defaultUrl={process.env.WP_IMPORT_URL || 'https://www.jurabek.blog'} storageReady={storageKind() !== 'none'} />
}
