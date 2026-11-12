import type { Metadata } from 'next'
import { metadataSlug, renderSlug, slugStaticParams } from '@/views/Slug'

export const revalidate = 3600

export const generateStaticParams = slugStaticParams

export function generateMetadata(props: PageProps<'/kirill/[slug]'>): Promise<Metadata> {
  return metadataSlug('cyrl', props)
}

export default function SlugPage(props: PageProps<'/kirill/[slug]'>) {
  return renderSlug('cyrl', props)
}
