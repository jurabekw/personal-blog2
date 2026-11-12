import type { Metadata } from 'next'
import { metadataSlug, renderSlug, slugStaticParams } from '@/views/Slug'

export const revalidate = 3600

export const generateStaticParams = slugStaticParams

export function generateMetadata(props: PageProps<'/yangi/[slug]'>): Promise<Metadata> {
  return metadataSlug('yangi', props)
}

export default function SlugPage(props: PageProps<'/yangi/[slug]'>) {
  return renderSlug('yangi', props)
}
