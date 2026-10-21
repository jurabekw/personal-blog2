import 'server-only'
import type { Metadata } from 'next'
import { getSettings, resolveSiteUrl } from '@/lib/data/settings'
import { pagedPath, resolveSeo, toMetadata, type SeoInput } from './resolve'

export async function seoFor(input: SeoInput) {
  const settings = await getSettings()
  const siteUrl = resolveSiteUrl(settings)
  const resolved = resolveSeo(input, settings, siteUrl)
  const url = `${siteUrl}${pagedPath(input.path, input.page)}`
  return { settings, siteUrl, resolved, url }
}

export async function metadataFor(input: SeoInput): Promise<Metadata> {
  const { settings, siteUrl, resolved } = await seoFor(input)
  return toMetadata(resolved, settings, { post: input.post, siteUrl })
}
