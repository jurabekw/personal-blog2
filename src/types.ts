export type PostStatus = 'draft' | 'published' | 'scheduled' | 'archived';

export interface Footnote {
  id: string;
  number: number;
  text: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface TOCItem {
  id: string;
  text: string;
  level: 1 | 2 | 3;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string; // Markdown / HTML formatted
  coverImage?: string;
  coverImageAlt?: string;
  status: PostStatus;
  publishedAt?: string;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
  readingTimeMinutes: number;
  wordCount: number;
  category: string;
  tags: string[];
  isFeatured: boolean;
  seoTitle?: string;
  seoDescription?: string;
  footnotes?: Footnote[];
  faqs?: FAQItem[];
  viewsCount?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  count?: number;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface MediaItem {
  id: string;
  name: string;
  url: string;
  altText: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  createdAt: string;
}

export interface SiteSettings {
  title: string;
  description: string;
  authorName: string;
  authorSubtitle?: string;
  authorBio: string;
  authorAvatar: string;
  email: string;
  twitter?: string;
  github?: string;
  linkedin?: string;
  rssEnabled?: boolean;
  postsPerPage: number;
  showReadingTime: boolean;
  showProgress: boolean;
  analyticsEnabled: boolean;
  /** Alphabet versions (O'zbek · Ўзбек · Özbek). Missing → built-in defaults. */
  alphabets?: AlphabetSettings;
}

export interface AlphabetSettings {
  /** Current-Latin word or stem → Cyrillic spelling. Replaces the built-in list when present. */
  exceptions: Record<string, string>;
  /** Words that always stay in Latin. Replaces the built-in list when present. */
  protectedWords: string[];
  /** Whether /yangi/ pages are indexable. Default true. */
  indexNewLatin: boolean;
}

export interface ActivityLog {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  type: 'post' | 'media' | 'settings' | 'auth' | 'category' | 'system';
}

export interface UserSession {
  isAuthenticated: boolean;
  user: {
    username: string;
    role: string;
    lastLogin: string;
  } | null;
}
