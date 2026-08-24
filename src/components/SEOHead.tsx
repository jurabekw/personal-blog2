import React, { useEffect } from 'react';
import { Post, SiteSettings } from '../types';

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  type?: 'website' | 'article';
  slug?: string;
  post?: Post | null;
  settings?: SiteSettings;
  canonicalUrl?: string;
  noindex?: boolean;
}

export const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  image,
  type = 'website',
  slug,
  post,
  settings,
  canonicalUrl,
  noindex = false,
}) => {
  useEffect(() => {
    const siteTitle = settings?.title || 'Jurabek';
    const siteDescription =
      settings?.description ||
      "Sokin raqamli vositalar, marketing, Sun'iy Intellekt va vebsaytlar haqida shaxsiy platforma.";
    const authorName = settings?.authorName || 'Jurabek';
    const authorAvatar = settings?.authorAvatar || '';

    const pageTitle = title ? `${title} — ${siteTitle}` : `${siteTitle} — Shaxsiy blog va nashr platformasi`;
    const pageDescription = description || post?.excerpt || siteDescription;
    const pageImage = image || post?.coverImage || authorAvatar || '';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const currentUrl = canonicalUrl || (typeof window !== 'undefined' ? window.location.href : '');

    // Update document title
    document.title = pageTitle;

    // Helper to update or create meta tag
    const updateMetaTag = (selector: string, attrName: string, attrValue: string, content: string) => {
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Helper to update canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', currentUrl);

    // Basic Meta Tags
    updateMetaTag('meta[name="description"]', 'name', 'description', pageDescription);
    updateMetaTag('meta[name="author"]', 'name', 'author', authorName);
    updateMetaTag('meta[name="robots"]', 'name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

    // OpenGraph Tags
    updateMetaTag('meta[property="og:site_name"]', 'property', 'og:site_name', siteTitle);
    updateMetaTag('meta[property="og:title"]', 'property', 'og:title', pageTitle);
    updateMetaTag('meta[property="og:description"]', 'property', 'og:description', pageDescription);
    updateMetaTag('meta[property="og:type"]', 'property', 'og:type', type);
    updateMetaTag('meta[property="og:url"]', 'property', 'og:url', currentUrl);
    if (pageImage) {
      updateMetaTag('meta[property="og:image"]', 'property', 'og:image', pageImage);
    }

    // Twitter Card Tags
    updateMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', pageImage ? 'summary_large_image' : 'summary');
    updateMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', pageTitle);
    updateMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', pageDescription);
    if (pageImage) {
      updateMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', pageImage);
    }

    // JSON-LD Structured Data
    let jsonLdScript = document.querySelector('script[id="json-ld-schema"]') as HTMLScriptElement;
    if (!jsonLdScript) {
      jsonLdScript = document.createElement('script');
      jsonLdScript.id = 'json-ld-schema';
      jsonLdScript.type = 'application/ld+json';
      document.head.appendChild(jsonLdScript);
    }

    let schema: any = {};

    if (type === 'article' && post) {
      const blogPostingSchema: any = {
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.excerpt || pageDescription,
        image: post.coverImage ? [post.coverImage] : [],
        datePublished: post.publishedAt || post.createdAt,
        dateModified: post.updatedAt || post.publishedAt || post.createdAt,
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': currentUrl,
        },
        author: {
          '@type': 'Person',
          name: authorName,
          image: authorAvatar || undefined,
        },
        publisher: {
          '@type': 'Organization',
          name: siteTitle,
          logo: authorAvatar ? { '@type': 'ImageObject', url: authorAvatar } : undefined,
        },
        wordCount: post.wordCount,
        articleSection: post.category,
        keywords: post.tags?.join(', '),
      };

      const validFaqs = (post.faqs || []).filter(
        (f) => f && f.question && f.question.trim() && f.answer && f.answer.trim()
      );

      if (validFaqs.length > 0) {
        const faqPageSchema = {
          '@type': 'FAQPage',
          '@id': `${currentUrl}#faq`,
          mainEntity: validFaqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question.trim(),
            acceptedAnswer: {
              '@type': 'Answer',
              text: faq.answer.trim(),
            },
          })),
        };

        schema = {
          '@context': 'https://schema.org',
          '@graph': [blogPostingSchema, faqPageSchema],
        };
      } else {
        schema = {
          '@context': 'https://schema.org',
          ...blogPostingSchema,
        };
      }
    } else {
      schema = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: siteTitle,
        description: siteDescription,
        url: origin || 'https://jurabek.dev',
        author: {
          '@type': 'Person',
          name: authorName,
          jobTitle: 'Marketing mutaxassisi',
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${origin}/writing?search={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      };
    }

    jsonLdScript.textContent = JSON.stringify(schema);
  }, [title, description, image, type, slug, post, settings, canonicalUrl]);

  return null;
};
