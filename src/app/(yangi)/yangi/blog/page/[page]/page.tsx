import type { Metadata } from 'next'
import { blogPagedStaticParams, metadataBlogPaged, renderBlogPaged } from '@/views/BlogPaged'

export const revalidate = 3600

export const generateStaticParams = blogPagedStaticParams

export function generateMetadata(props: PageProps<'/yangi/blog/page/[page]'>): Promise<Metadata> {
  return metadataBlogPaged('yangi', props)
}

export default function BlogPagedPage(props: PageProps<'/yangi/blog/page/[page]'>) {
  return renderBlogPaged('yangi', props)
}
