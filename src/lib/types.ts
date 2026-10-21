/** Tri-state robots choice, like Yoast's "Allow search engines to show this in search results?" */
export type RobotsChoice = 'default' | 'index' | 'noindex'

export type SchemaPageType =
  | 'WebPage'
  | 'ItemPage'
  | 'AboutPage'
  | 'FAQPage'
  | 'QAPage'
  | 'ProfilePage'
  | 'ContactPage'
  | 'MedicalWebPage'
  | 'CollectionPage'
  | 'CheckoutPage'
  | 'RealEstateListing'
  | 'SearchResultsPage'

export type SchemaArticleType =
  | 'Article'
  | 'BlogPosting'
  | 'SocialMediaPosting'
  | 'NewsArticle'
  | 'AdvertiserContentArticle'
  | 'SatiricalArticle'
  | 'ScholarlyArticle'
  | 'TechArticle'
  | 'Report'
  | 'None'

/** Per-post SEO data (mirrors Yoast SEO's post meta box). */
export interface PostSeo {
  focusKeyphrase?: string
  relatedKeyphrases?: string[]
  /** SEO title; may contain %%variables%%. Empty = use the content-type template. */
  title?: string
  /** Meta description; may contain %%variables%%. Empty = template or excerpt. */
  metaDescription?: string
  canonical?: string
  robotsIndex?: RobotsChoice
  nofollow?: boolean
  noimageindex?: boolean
  noarchive?: boolean
  nosnippet?: boolean
  breadcrumbTitle?: string
  cornerstone?: boolean
  schemaPageType?: SchemaPageType | ''
  schemaArticleType?: SchemaArticleType | ''
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
  twitterTitle?: string
  twitterDescription?: string
  twitterImage?: string
}

/** Per-category / per-tag SEO data. */
export interface TermSeo {
  focusKeyphrase?: string
  title?: string
  metaDescription?: string
  canonical?: string
  robotsIndex?: RobotsChoice
  breadcrumbTitle?: string
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
  twitterTitle?: string
  twitterDescription?: string
  twitterImage?: string
}

export interface FaqItem {
  question: string
  answer: string
}

export type PostType = 'post' | 'page'
export type PostStatus = 'draft' | 'pending' | 'publish' | 'trash'
export type PageTemplate = 'default' | 'about' | 'full-width'

export interface Heading {
  id: string
  text: string
  level: 2 | 3
}

export interface MenuItem {
  id: string
  label: string
  /** Internal path ("/blog/") or absolute URL. */
  url: string
  newTab?: boolean
  children?: MenuItem[]
}

export interface SocialLink {
  label: string
  url: string
}
