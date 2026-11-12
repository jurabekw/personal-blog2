import type { Metadata } from 'next'
import { metadataHome, renderHome } from '@/views/Home'

export const revalidate = 3600

export function generateMetadata(): Promise<Metadata> {
  return metadataHome('cyrl')
}

export default function HomePage() {
  return renderHome('cyrl')
}
