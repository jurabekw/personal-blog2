import 'server-only'
import { and, asc, eq, ne } from 'drizzle-orm'
import { getDb, schema } from '@/lib/db'

/** Published pages (title + slug) for pickers in Appearance and Menus. */
export async function publishedPagesList() {
  return getDb()
    .select({ title: schema.posts.title, slug: schema.posts.slug })
    .from(schema.posts)
    .where(and(eq(schema.posts.type, 'page'), ne(schema.posts.status, 'trash')))
    .orderBy(asc(schema.posts.menuOrder), asc(schema.posts.title))
}
