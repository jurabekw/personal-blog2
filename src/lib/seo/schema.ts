import { HTML_LANG, SITE_ORIGIN, buildScriptPath, canonicalUrl } from '../script';
import type { PageMeta } from './head';

/** JSON-LD for a page: BlogPosting (+FAQPage) for posts, WebSite otherwise. */
export function buildJsonLd(meta: PageMeta): object {
  const url = canonicalUrl(meta.script, meta.path);
  const lang = HTML_LANG[meta.script];
  const post = meta.post;

  if (meta.type === 'article' && post) {
    const blogPosting: Record<string, unknown> = {
      '@type': 'BlogPosting',
      headline: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt || meta.description,
      image: post.coverImage ? [post.coverImage] : [],
      datePublished: post.publishedAt || post.createdAt,
      dateModified: post.updatedAt || post.publishedAt || post.createdAt,
      inLanguage: lang,
      url,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      author: { '@type': 'Person', name: meta.authorName, url: SITE_ORIGIN + '/' },
      publisher: { '@type': 'Person', name: meta.authorName, url: SITE_ORIGIN + '/' },
      wordCount: post.wordCount,
      articleSection: post.category,
      keywords: (post.tags || []).join(', '),
    };
    const faqs = (post.faqs || []).filter((f) => f?.question?.trim() && f?.answer?.trim());
    const graph: object[] = [blogPosting];
    if (faqs.length > 0) {
      graph.push({
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        inLanguage: lang,
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.question.trim(),
          acceptedAnswer: { '@type': 'Answer', text: f.answer.trim() },
        })),
      });
    }
    return { '@context': 'https://schema.org', '@graph': graph };
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: meta.siteTitle,
    description: meta.description,
    url: SITE_ORIGIN + buildScriptPath(meta.script, '/'),
    inLanguage: lang,
    author: { '@type': 'Person', name: meta.authorName },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_ORIGIN}${buildScriptPath(meta.script, '/blog')}?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}
