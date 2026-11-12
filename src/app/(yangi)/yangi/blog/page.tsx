import type { Metadata } from 'next'
import { metadataBlogIndex, renderBlogIndex } from '@/views/BlogIndex'

export const revalidate = 3600

export function generateMetadata(): Promise<Metadata> {
  return metadataBlogIndex('yangi')
}

export default function BlogPage() {
  return renderBlogIndex('yangi')
}
