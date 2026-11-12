import type { Metadata } from 'next'
import { metadataHome, renderHome } from '@/views/Home'

export const revalidate = 3600

export function generateMetadata(): Promise<Metadata> {
  return metadataHome('yangi')
}

export default function HomePage() {
  return renderHome('yangi')
}
