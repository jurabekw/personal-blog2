import type { Metadata } from 'next'
import { metadataSearch, renderSearch } from '@/views/Search'

export function generateMetadata(props: PageProps<'/yangi/search'>): Promise<Metadata> {
  return metadataSearch('yangi', props)
}

export default function SearchPage(props: PageProps<'/yangi/search'>) {
  return renderSearch('yangi', props)
}
