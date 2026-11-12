import type { Metadata } from 'next'
import { metadataNotFound, NotFoundView } from '@/views/NotFound'

export function generateMetadata(): Promise<Metadata> {
  return metadataNotFound('yangi')
}

export default function NotFound() {
  return <NotFoundView script="yangi" />
}
