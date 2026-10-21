import type { Metadata } from 'next'
import { PostListScreen } from '@/components/admin/PostListScreen'

export const metadata: Metadata = { title: 'Posts' }

export default async function PostsPage({ searchParams }: PageProps<'/admin/posts'>) {
  return <PostListScreen type="post" searchParams={await searchParams} />
}
