import type { Metadata } from 'next'
import { categoryStaticParams, metadataCategory, renderCategory } from '@/views/Category'

export const revalidate = 3600

export const generateStaticParams = categoryStaticParams

export function generateMetadata(props: PageProps<'/yangi/category/[...path]'>): Promise<Metadata> {
  return metadataCategory('yangi', props)
}

export default function CategoryPage(props: PageProps<'/yangi/category/[...path]'>) {
  return renderCategory('yangi', props)
}
