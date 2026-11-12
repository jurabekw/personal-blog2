import React from 'react';
import { renderToString } from 'react-dom/server';
import { fetchCategories, fetchPublishedPosts, fetchSettings } from './loadData.js';
import { HTML_LANG, parseScriptPath, type Script } from '../../src/lib/script.js';
import { buildHeadTags, renderHeadTags, type PageMeta } from '../../src/lib/seo/head.js';
import { PAGE_COPY, pageKindFor, type PageKind } from '../../src/lib/pageCopy.js';
import { getTranslitConfig, indexNewLatin } from '../../src/lib/translit/config.js';
import { transliterateText } from '../../src/lib/translit/core.js';
import { transliterateCategory, transliteratePost } from '../../src/lib/translit/post.js';
import { getUiStrings } from '../../src/lib/uiStrings.js';
import { SsrBody } from '../../src/ssr/SsrBody.js';
import type { Bootstrap } from '../../src/ssr/bootstrap.js';
import type { Post } from '../../src/types.js';

export interface RenderResult {
  status: number;
  html: string;
  headers: Record<string, string>;
}

const CACHE_OK = 'public, s-maxage=300, stale-while-revalidate=86400';
const CACHE_404 = 'public, s-maxage=60';

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

/** Renders a public page (any alphabet) into the built index.html template. */
export async function renderPage(
  url: string,
  template: string,
  opts: { alphabetsEnabled: boolean },
): Promise<RenderResult> {
  const parsed = parseScriptPath(url);
  let script: Script = parsed.script;
  let { kind, slug } = pageKindFor(parsed.path);
  if (!parsed.isPage || (script !== 'latn' && !opts.alphabetsEnabled)) {
    script = 'latn';
    kind = 'notfound';
  }

  const [settings, rawPosts, rawCategories] = await Promise.all([
    fetchSettings(),
    fetchPublishedPosts(),
    fetchCategories(),
  ]);
  const cfg = getTranslitConfig(settings);
  const t = (s: string) => transliterateText(s, script, cfg);

  let post: Post | null = null;
  if (kind === 'post') {
    const raw = rawPosts.find((p) => p.slug.toLowerCase() === slug);
    if (raw) post = transliteratePost(raw, script, cfg);
    else kind = 'notfound';
  }
  const posts = rawPosts.map((p) => transliteratePost(p, script, cfg));
  const categories = rawCategories.map((c) => transliterateCategory(c, script, cfg));
  const status = kind === 'notfound' ? 404 : 200;

  const canonicalPathFor: Record<PageKind, string> = {
    home: '/',
    blog: '/blog',
    contact: '/contact',
    post: post ? `/blog/${post.slug}` : parsed.path,
    notfound: parsed.path,
  };
  const path = canonicalPathFor[kind];
  const copy = kind === 'post' ? null : PAGE_COPY[kind];

  const meta: PageMeta = {
    script,
    path,
    title: copy ? t(copy.title) : '',
    description: copy?.description ? t(copy.description) : t(settings.description || ''),
    type: kind === 'post' ? 'article' : 'website',
    post,
    noindex: kind === 'notfound',
    indexNewLatin: indexNewLatin(settings),
    siteTitle: settings.title || 'Jurabek',
    authorName: settings.authorName || 'Jurabek',
    image: post?.coverImage || settings.authorAvatar || undefined,
  };
  const head = renderHeadTags(buildHeadTags(meta, opts.alphabetsEnabled));

  const body = renderToString(
    React.createElement(SsrBody, {
      script,
      kind,
      path,
      posts,
      post,
      settings,
      categories,
      ui: getUiStrings(script, cfg),
      cfg,
      alphabetsEnabled: opts.alphabetsEnabled,
      notFoundTitle: t(PAGE_COPY.notfound.title),
      notFoundText: t(PAGE_COPY.notfound.description),
    }),
  );

  const bootstrap: Bootstrap = {
    script,
    kind,
    alphabetsEnabled: opts.alphabetsEnabled,
    post,
    posts: posts.map((p) => ({ ...p, content: '' })),
    categories,
    settings,
  };

  const html = template
    .replace(/<html[^>]*>/i, `<html lang="${HTML_LANG[script]}">`)
    .replace(/<!--ssr-head-start-->[\s\S]*?<!--ssr-head-end-->/, () => head)
    .replace('<!--ssr-body-->', () => body)
    .replace('<!--ssr-bootstrap-->', () => `<script>window.__BOOTSTRAP__=${safeJson(bootstrap)}</script>`);

  return {
    status,
    html,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': status === 200 ? CACHE_OK : CACHE_404,
    },
  };
}
