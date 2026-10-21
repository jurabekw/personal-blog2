import type { Metadata } from 'next'
import { isDatabaseConfigured } from '@/lib/db'
import { metadataFor } from '@/lib/seo/page'
import { BlogListing } from '@/components/site/BlogListing'
import { SetupNotice } from '@/components/site/SetupNotice'

export const revalidate = 3600

export function generateMetadata(): Promise<Metadata> {
  return metadataFor({ kind: 'blog', path: '/blog/' })
}

export default function BlogPage() {
  if (!isDatabaseConfigured()) return <SetupNotice />
  return <BlogListing page={1} />
}
