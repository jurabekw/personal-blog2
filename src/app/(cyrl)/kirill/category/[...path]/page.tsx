import type { Metadata } from 'next'
import { categoryStaticParams, metadataCategory, renderCategory } from '@/views/Category'

export const revalidate = 3600

export const generateStaticParams = categoryStaticParams

export function generateMetadata(props: PageProps<'/kirill/category/[...path]'>): Promise<Metadata> {
  return metadataCategory('cyrl', props)
}

export default function CategoryPage(props: PageProps<'/kirill/category/[...path]'>) {
  return renderCategory('cyrl', props)
}
