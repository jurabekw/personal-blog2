import type { Metadata } from 'next'
import { blogPagedStaticParams, metadataBlogPaged, renderBlogPaged } from '@/views/BlogPaged'

export const revalidate = 3600

export const generateStaticParams = blogPagedStaticParams

export function generateMetadata(props: PageProps<'/kirill/blog/page/[page]'>): Promise<Metadata> {
  return metadataBlogPaged('cyrl', props)
}

export default function BlogPagedPage(props: PageProps<'/kirill/blog/page/[page]'>) {
  return renderBlogPaged('cyrl', props)
}
