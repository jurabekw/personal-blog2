import type { Metadata } from 'next'
import { TermArchive, termMetadata } from '@/components/site/TermArchive'

export const revalidate = 3600

export function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: PageProps<'/category/[...path]'>): Promise<Metadata> {
  return termMetadata('category', (await params).path)
}

export default async function CategoryPage({ params }: PageProps<'/category/[...path]'>) {
  return <TermArchive taxonomy="category" segments={(await params).path} />
}
