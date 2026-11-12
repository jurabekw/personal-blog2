import type { Metadata } from 'next'
import { metadataBlogIndex, renderBlogIndex } from '@/views/BlogIndex'

export const revalidate = 3600

export function generateMetadata(): Promise<Metadata> {
  return metadataBlogIndex('latn')
}

export default function BlogPage() {
  return renderBlogIndex('latn')
}
