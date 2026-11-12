import type { Metadata } from 'next'
import { draftPreviewMetadata, renderDraftPreview } from '@/views/DraftPreview'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = draftPreviewMetadata

export default function DraftPreviewPage(props: PageProps<'/draft-preview/[id]'>) {
  return renderDraftPreview(props)
}
