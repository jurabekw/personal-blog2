import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { getSettings } from '@/lib/data/settings'
import { listPublishedPosts } from '@/lib/data/posts'
import { metadataFor } from '@/lib/seo/page'
import { BlogListing } from '@/components/site/BlogListing'
import { scriptHref, type Script } from '@/lib/alphabet'

type Props = { params: Promise<{ page: string }> }

export function blogPagedStaticParams() {
  return []
}

function parsePage(raw: string): number {
  return /^\d+$/.test(raw) ? Number(raw) : NaN
}

export async function metadataBlogPaged(script: Script, { params }: Props): Promise<Metadata> {
  const page = parsePage((await params).page)
  if (!(page > 1)) return {}
  const settings = await getSettings()
  const { total } = await listPublishedPosts({ perPage: 1 })
  const pages = Math.max(1, Math.ceil(total / Math.max(1, settings.reading.postsPerPage)))
  return metadataFor({ kind: 'blog', path: '/blog/', page, pageTotal: pages, script })
}

export async function renderBlogPaged(script: Script, { params }: Props) {
  const page = parsePage((await params).page)
  if (page === 1) permanentRedirect(scriptHref(script, '/blog/'))
  if (!(page > 1)) notFound()
  return <BlogListing page={page} script={script} />
}
