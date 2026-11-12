import type { Metadata } from 'next'
import { isDatabaseConfigured } from '@/lib/db'
import { metadataFor } from '@/lib/seo/page'
import { BlogListing } from '@/components/site/BlogListing'
import { SetupNotice } from '@/components/site/SetupNotice'
import type { Script } from '@/lib/alphabet'

export function metadataBlogIndex(script: Script): Promise<Metadata> {
  return metadataFor({ kind: 'blog', path: '/blog/', script })
}

export function renderBlogIndex(script: Script) {
  if (!isDatabaseConfigured()) return <SetupNotice />
  return <BlogListing page={1} script={script} />
}
