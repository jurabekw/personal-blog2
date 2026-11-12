import type { Metadata } from 'next'
import { metadataSlug, renderSlug, slugStaticParams } from '@/views/Slug'

export const revalidate = 3600

export const generateStaticParams = slugStaticParams

export function generateMetadata(props: PageProps<'/[slug]'>): Promise<Metadata> {
  return metadataSlug('latn', props)
}

export default function SlugPage(props: PageProps<'/[slug]'>) {
  return renderSlug('latn', props)
}
