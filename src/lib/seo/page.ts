import 'server-only'
import type { Metadata } from 'next'
import { getSettings, resolveSiteUrl } from '@/lib/data/settings'
import { resolveSeo, toMetadata, type SeoInput } from './resolve'

/** Resolves SEO for a page. Pass raw (Latin) post/term data; `input.script` picks the alphabet. */
export async function seoFor(input: SeoInput) {
  const settings = await getSettings()
  const siteUrl = resolveSiteUrl(settings)
  const resolved = resolveSeo(input, settings, siteUrl)
  // This page's own URL in its alphabet (JSON-LD ids, share links); same as before for latn.
  const url = resolved.url
  return { settings, siteUrl, resolved, url }
}

export async function metadataFor(input: SeoInput): Promise<Metadata> {
  const { settings, siteUrl, resolved } = await seoFor(input)
  return toMetadata(resolved, settings, { post: input.post, siteUrl })
}
