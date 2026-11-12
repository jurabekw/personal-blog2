import type { Metadata } from 'next'
import { metadataSearch, renderSearch } from '@/views/Search'

export function generateMetadata(props: PageProps<'/search'>): Promise<Metadata> {
  return metadataSearch('latn', props)
}

export default function SearchPage(props: PageProps<'/search'>) {
  return renderSearch('latn', props)
}
