import { transliterateText } from './core';
import { transliterateMarkdown } from './markdown';
import type { Script, TranslitConfig } from './types';
import type { Category, Post, Tag } from '../../types';

const MAX_CACHE = 500;
const cache = new Map<string, Post>();

function cacheKey(post: Post, script: Script, cfg: TranslitConfig): string {
  return [post.id, post.updatedAt, post.title.length, post.content.length, script, cfg.version].join('|');
}

/** Returns the post with every readable text field in `script`. Slugs, ids, URLs and dates never change. */
export function transliteratePost(post: Post, script: Script, cfg: TranslitConfig): Post {
  if (script === 'latn') return post;
  const key = cacheKey(post, script, cfg);
  const hit = cache.get(key);
  if (hit) return hit;

  const t = (s: string | undefined) => (s ? transliterateText(s, script, cfg) : s);
  const out: Post = {
    ...post,
    title: t(post.title)!,
    excerpt: t(post.excerpt)!,
    content: transliterateMarkdown(post.content, script, cfg),
    seoTitle: t(post.seoTitle),
    seoDescription: t(post.seoDescription),
    coverImageAlt: t(post.coverImageAlt),
    category: t(post.category)!,
    tags: (post.tags || []).map((tag) => t(tag)!),
    footnotes: post.footnotes?.map((f) => ({ ...f, text: transliterateMarkdown(f.text, script, cfg) })),
    faqs: post.faqs?.map((f) => ({
      ...f,
      question: t(f.question)!,
      answer: transliterateMarkdown(f.answer, script, cfg),
    })),
  };

  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value as string);
  cache.set(key, out);
  return out;
}

export function transliterateCategory(c: Category, script: Script, cfg: TranslitConfig): Category {
  if (script === 'latn') return c;
  return {
    ...c,
    name: transliterateText(c.name, script, cfg),
    description: c.description ? transliterateText(c.description, script, cfg) : c.description,
  };
}

export function transliterateTag(tag: Tag, script: Script, cfg: TranslitConfig): Tag {
  if (script === 'latn') return tag;
  return { ...tag, name: transliterateText(tag.name, script, cfg) };
}
