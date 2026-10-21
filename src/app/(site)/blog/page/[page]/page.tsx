import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { getSettings } from '@/lib/data/settings'
import { listPublishedPosts } from '@/lib/data/posts'
import { metadataFor } from '@/lib/seo/page'
import { BlogListing } from '@/components/site/BlogListing'

export const revalidate = 3600

export function generateStaticParams() {
  return []
}

function parsePage(raw: string): number {
  return /^\d+$/.test(raw) ? Number(raw) : NaN
}

export async function generateMetadata({ params }: PageProps<'/blog/page/[page]'>): Promise<Metadata> {
  const page = parsePage((await params).page)
  if (!(page > 1)) return {}
  const settings = await getSettings()
  const { total } = await listPublishedPosts({ perPage: 1 })
  const pages = Math.max(1, Math.ceil(total / Math.max(1, settings.reading.postsPerPage)))
  return metadataFor({ kind: 'blog', path: '/blog/', page, pageTotal: pages })
}

export default async function BlogPagedPage({ params }: PageProps<'/blog/page/[page]'>) {
  const page = parsePage((await params).page)
  if (page === 1) permanentRedirect('/blog/')
  if (!(page > 1)) notFound()
  return <BlogListing page={page} />
}
