import type { Metadata } from 'next'
import { categoryStaticParams, metadataCategory, renderCategory } from '@/views/Category'

export const revalidate = 3600

export const generateStaticParams = categoryStaticParams

export function generateMetadata(props: PageProps<'/category/[...path]'>): Promise<Metadata> {
  return metadataCategory('latn', props)
}

export default function CategoryPage(props: PageProps<'/category/[...path]'>) {
  return renderCategory('latn', props)
}
