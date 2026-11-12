import type { Metadata } from 'next'
import { metadataSearch, renderSearch } from '@/views/Search'

export function generateMetadata(props: PageProps<'/kirill/search'>): Promise<Metadata> {
  return metadataSearch('cyrl', props)
}

export default function SearchPage(props: PageProps<'/kirill/search'>) {
  return renderSearch('cyrl', props)
}
