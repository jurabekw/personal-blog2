import type { Metadata } from 'next'
import { metadataTag, renderTag, tagStaticParams } from '@/views/Tag'

export const revalidate = 3600

export const generateStaticParams = tagStaticParams

export function generateMetadata(props: PageProps<'/yangi/tag/[...path]'>): Promise<Metadata> {
  return metadataTag('yangi', props)
}

export default function TagPage(props: PageProps<'/yangi/tag/[...path]'>) {
  return renderTag('yangi', props)
}
