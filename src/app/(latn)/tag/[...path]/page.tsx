import type { Metadata } from 'next'
import { metadataTag, renderTag, tagStaticParams } from '@/views/Tag'

export const revalidate = 3600

export const generateStaticParams = tagStaticParams

export function generateMetadata(props: PageProps<'/tag/[...path]'>): Promise<Metadata> {
  return metadataTag('latn', props)
}

export default function TagPage(props: PageProps<'/tag/[...path]'>) {
  return renderTag('latn', props)
}
