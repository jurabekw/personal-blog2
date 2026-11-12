import type { Metadata } from 'next'
import { metadataTag, renderTag, tagStaticParams } from '@/views/Tag'

export const revalidate = 3600

export const generateStaticParams = tagStaticParams

export function generateMetadata(props: PageProps<'/kirill/tag/[...path]'>): Promise<Metadata> {
  return metadataTag('cyrl', props)
}

export default function TagPage(props: PageProps<'/kirill/tag/[...path]'>) {
  return renderTag('cyrl', props)
}
