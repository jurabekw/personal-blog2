import { canonicalPath, canonicalUrl, SITE_ORIGIN, buildScriptPath, type Script } from '../script.js';
import { buildJsonLd } from './schema.js';
import type { Post } from '../../types.js';

export interface PageMeta {
  script: Script;
  /** Path without the alphabet prefix, e.g. "/blog/marketing-nima". */
  path: string;
  title: string;
  description: string;
  image?: string;
  type: 'website' | 'article';
  post?: Post | null;
  noindex?: boolean;
  indexNewLatin: boolean;
  siteTitle: string;
  authorName: string;
}

export interface HeadTag {
  tag: 'title' | 'meta' | 'link' | 'script';
  attrs: Record<string, string>;
  text?: string;
}

/** hreflang group: current Latin + Cyrillic + x-default. New Latin is never in it (no distinct tag exists). */
export function hreflangLinks(script: Script, path: string, alphabetsEnabled = true): { hreflang: string; href: string }[] {
  if (!alphabetsEnabled || script === 'yangi') return [];
  const p = canonicalPath(path);
  const latn = SITE_ORIGIN + buildScriptPath('latn', p);
  return [
    { hreflang: 'uz-Latn', href: latn },
    { hreflang: 'uz-Cyrl', href: SITE_ORIGIN + buildScriptPath('cyrl', p) },
    { hreflang: 'x-default', href: latn },
  ];
}

export function robotsFor(meta: PageMeta): string {
  if (meta.noindex) return 'noindex, follow';
  if (meta.script === 'yangi' && !meta.indexNewLatin) return 'noindex, follow';
  return 'index, follow';
}

export function pageTitle(meta: PageMeta): string {
  const own = meta.post ? meta.post.seoTitle || meta.post.title : meta.title;
  return own ? `${own} — ${meta.siteTitle}` : meta.siteTitle;
}

export function buildHeadTags(meta: PageMeta, alphabetsEnabled: boolean): HeadTag[] {
  const url = canonicalUrl(meta.script, meta.path);
  const title = pageTitle(meta);
  const description = (meta.post ? meta.post.seoDescription || meta.post.excerpt : '') || meta.description;
  const image = meta.image || meta.post?.coverImage || '';

  const tags: HeadTag[] = [
    { tag: 'title', attrs: {}, text: title },
    { tag: 'meta', attrs: { name: 'description', content: description } },
    { tag: 'meta', attrs: { name: 'robots', content: robotsFor(meta) } },
    { tag: 'meta', attrs: { name: 'author', content: meta.authorName } },
    { tag: 'link', attrs: { rel: 'canonical', href: url } },
    ...hreflangLinks(meta.script, meta.path, alphabetsEnabled).map(
      (l): HeadTag => ({ tag: 'link', attrs: { rel: 'alternate', hreflang: l.hreflang, href: l.href } }),
    ),
    { tag: 'meta', attrs: { property: 'og:site_name', content: meta.siteTitle } },
    { tag: 'meta', attrs: { property: 'og:locale', content: 'uz_UZ' } },
    { tag: 'meta', attrs: { property: 'og:type', content: meta.type } },
    { tag: 'meta', attrs: { property: 'og:title', content: title } },
    { tag: 'meta', attrs: { property: 'og:description', content: description } },
    { tag: 'meta', attrs: { property: 'og:url', content: url } },
    { tag: 'meta', attrs: { name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' } },
    { tag: 'meta', attrs: { name: 'twitter:title', content: title } },
    { tag: 'meta', attrs: { name: 'twitter:description', content: description } },
  ];
  if (image) {
    tags.push({ tag: 'meta', attrs: { property: 'og:image', content: image } });
    tags.push({ tag: 'meta', attrs: { name: 'twitter:image', content: image } });
  }
  tags.push({
    tag: 'script',
    attrs: { type: 'application/ld+json', id: 'json-ld-schema' },
    text: JSON.stringify(buildJsonLd(meta)),
  });
  return tags;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderHeadTags(tags: HeadTag[]): string {
  return tags
    .map((t) => {
      const attrs = Object.entries(t.attrs)
        .map(([k, v]) => ` ${k}="${escapeAttr(v)}"`)
        .join('');
      if (t.tag === 'title') return `<title>${escapeAttr(t.text || '')}</title>`;
      if (t.tag === 'script') return `<script${attrs}>${(t.text || '').replace(/</g, '\\u003c')}</script>`;
      return `<${t.tag}${attrs}>`;
    })
    .join('\n    ');
}
