import type { Metadata } from 'next'
import { TermArchive, termMetadata } from '@/components/site/TermArchive'

export const revalidate = 3600

export function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: PageProps<'/tag/[...path]'>): Promise<Metadata> {
  return termMetadata('tag', (await params).path)
}

export default async function TagPage({ params }: PageProps<'/tag/[...path]'>) {
  return <TermArchive taxonomy="tag" segments={(await params).path} />
}
