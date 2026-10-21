import type { MenuItem, SchemaArticleType, SchemaPageType, SocialLink } from '@/lib/types'

/* ------------------------------------------------------------------ */
/* Settings groups (stored as one JSON row per group in `settings`).   */
/* Every group is deep-merged with these defaults when read, so new    */
/* fields can be added without migrations.                             */
/* ------------------------------------------------------------------ */

export interface GeneralSettings {
  siteName: string
  tagline: string
  /** Public URL without trailing slash. Empty = NEXT_PUBLIC_SITE_URL / Vercel URL. */
  siteUrl: string
  /** BCP-47 language of the content, e.g. "uz" */
  language: string
  /** OpenGraph locale, e.g. "uz_UZ" */
  locale: string
  timezone: string
  logoUrl: string
  faviconUrl: string
}

export interface ReadingSettings {
  /** Posts per page on /blog/ and archives (WordPress "Blog pages show at most"). */
  postsPerPage: number
  /** Number of "So'nggi postlar" cards on the homepage. */
  homeRecentCount: number
  /** WordPress "Discourage search engines from indexing this site". */
  discourageSearchEngines: boolean
  /** Items in the RSS feed. */
  feedItems: number
  /** Feed shows the excerpt instead of the full text. */
  feedSummaryOnly: boolean
}

export interface AppearanceSettings {
  primaryColor: string
  contentWidth: number
  headerCtaText: string
  headerCtaUrl: string
  author: {
    name: string
    role: string
    bio: string
    /** Empty = bundled profile photo. */
    photoUrl: string
    socials: SocialLink[]
    /** Path of the "Men haqimda" page, e.g. "/men-haqimda/". Empty hides the links. */
    aboutUrl: string
  }
  hero: {
    enabled: boolean
    card: boolean
    badge: string
    title: string
    text: string
  }
  blogTitle: string
  blogIntro: string
  footerText: string
  footerLinksTitle: string
  sidebar: {
    about: { enabled: boolean; title: string }
    blogNav: {
      enabled: boolean
      title: string
      showCategories: boolean
      showRecent: boolean
      recentCount: number
    }
    toc: { enabled: boolean; title: string }
  }
  /** Homepage rich content (shown under the hero), like the Elementor-edited front page. */
  homeContent: string
}

export interface MenuSettings {
  primary: MenuItem[]
  footer: MenuItem[]
}

export interface SeoSettings {
  separator: string
  siteRepresentation: {
    type: 'person' | 'organization'
    personName: string
    personImage: string
    personDescription: string
    personJobTitle: string
    orgName: string
    orgAlternateName: string
    orgLogo: string
  }
  titles: {
    home: string
    blog: string
    post: string
    page: string
    category: string
    tag: string
    search: string
    notFound: string
  }
  descriptions: {
    home: string
    blog: string
    post: string
    page: string
    category: string
    tag: string
  }
  /** Default "show in search results" per content type. */
  noindex: {
    post: boolean
    page: boolean
    category: boolean
    tag: boolean
  }
  schema: {
    pageType: SchemaPageType
    articleType: SchemaArticleType
  }
  social: {
    facebook: string
    instagram: string
    linkedin: string
    youtube: string
    telegram: string
    twitterUsername: string
    other: string[]
    defaultOgImage: string
  }
  verification: {
    google: string
    bing: string
    yandex: string
    baidu: string
    pinterest: string
  }
  breadcrumbs: {
    enabled: boolean
    separator: string
    homeLabel: string
    showBlog: boolean
  }
  rss: {
    before: string
    after: string
  }
  sitemaps: {
    enabled: boolean
    includeImages: boolean
    includeTags: boolean
  }
  /** Full robots.txt contents. Empty = generated default. */
  robotsTxt: string
  llms: {
    enabled: boolean
    intro: string
  }
  analytics: {
    ga4: string
    gtm: string
    yandexMetrica: string
    headCode: string
    bodyCode: string
  }
  /** Content language for readability checks: uz | ru | en */
  analysisLanguage: 'uz' | 'ru' | 'en'
}

export interface AllSettings {
  general: GeneralSettings
  reading: ReadingSettings
  appearance: AppearanceSettings
  menus: MenuSettings
  seo: SeoSettings
}

export type SettingsKey = keyof AllSettings

export const DEFAULT_SETTINGS: AllSettings = {
  general: {
    siteName: 'Jurabek',
    tagline: 'Marketing mutaxassisi',
    siteUrl: '',
    language: 'uz',
    locale: 'uz_UZ',
    timezone: 'Asia/Tashkent',
    logoUrl: '',
    faviconUrl: '',
  },
  reading: {
    postsPerPage: 4,
    homeRecentCount: 4,
    discourageSearchEngines: false,
    feedItems: 10,
    feedSummaryOnly: false,
  },
  appearance: {
    primaryColor: '#1cca59',
    contentWidth: 1180,
    headerCtaText: '',
    headerCtaUrl: '',
    author: {
      name: 'Jurabek',
      role: 'Marketing mutaxassisi',
      bio: "Ko'p yillik tajribaga ega bo'lgan marketologman. Ushbu blogda tajribam, bilimlarim va foydali maslahatlarim bilan bo'lishib boraman.",
      photoUrl: '',
      socials: [{ label: 'Telegram', url: 'https://t.me/jurabeekkd' }],
      aboutUrl: '/men-haqimda/',
    },
    hero: {
      enabled: true,
      card: true,
      badge: 'Shaxsiy blog',
      title: "Jurabek — Ko'p yillik tajribaga ega marketing mutaxassisi",
      text: "Ushbu blogda tajribam, bilimlarim va foydali maslahatlarim bilan bo'lishib boraman.",
    },
    blogTitle: 'Blog',
    blogIntro: 'Marketing, texnologiyalar va biznes rivojiga oid amaliy bilimlar hamda kuzatuvlar.',
    footerText: "Ushbu blogda tajribam, bilimlarim va foydali maslahatlarim bilan bo'lishib boraman.",
    footerLinksTitle: 'Havolalar',
    sidebar: {
      about: { enabled: true, title: 'Men haqimda' },
      blogNav: {
        enabled: true,
        title: 'Blog navigatsiyasi',
        showCategories: true,
        showRecent: true,
        recentCount: 4,
      },
      toc: { enabled: true, title: 'Mundarija' },
    },
    homeContent: '',
  },
  menus: {
    primary: [
      { id: 'home', label: 'Asosiy sahifa', url: '/' },
      { id: 'blog', label: 'Blog', url: '/blog/' },
      { id: 'about', label: 'Men haqimda', url: '/men-haqimda/' },
    ],
    footer: [],
  },
  seo: {
    separator: '-',
    siteRepresentation: {
      type: 'person',
      personName: 'Jurabek',
      personImage: '',
      personDescription: '',
      personJobTitle: 'Marketing mutaxassisi',
      orgName: '',
      orgAlternateName: '',
      orgLogo: '',
    },
    titles: {
      home: '%%sitename%% %%sep%% %%sitedesc%%',
      blog: '%%blogtitle%% %%page%% %%sep%% %%sitename%%',
      post: '%%title%% %%page%% %%sep%% %%sitename%%',
      page: '%%title%% %%page%% %%sep%% %%sitename%%',
      category: '%%term_title%% %%page%% %%sep%% %%sitename%%',
      tag: '%%term_title%% %%page%% %%sep%% %%sitename%%',
      search: 'Qidiruv: %%searchphrase%% %%page%% %%sep%% %%sitename%%',
      notFound: 'Sahifa topilmadi %%sep%% %%sitename%%',
    },
    descriptions: {
      home: '',
      blog: '',
      post: '',
      page: '',
      category: '%%term_description%%',
      tag: '%%term_description%%',
    },
    noindex: { post: false, page: false, category: false, tag: false },
    schema: { pageType: 'WebPage', articleType: 'Article' },
    social: {
      facebook: '',
      instagram: '',
      linkedin: '',
      youtube: '',
      telegram: 'https://t.me/jurabeekkd',
      twitterUsername: '',
      other: [],
      defaultOgImage: '',
    },
    verification: { google: '', bing: '', yandex: '', baidu: '', pinterest: '' },
    breadcrumbs: { enabled: true, separator: '/', homeLabel: 'Bosh sahifa', showBlog: true },
    rss: {
      before: '',
      after: '%%POSTLINK%% posti dastlab %%BLOGLINK%% saytida chop etilgan.',
    },
    sitemaps: { enabled: true, includeImages: true, includeTags: true },
    robotsTxt: '',
    llms: {
      enabled: true,
      intro: '',
    },
    analytics: { ga4: '', gtm: '', yandexMetrica: '', headCode: '', bodyCode: '' },
    analysisLanguage: 'uz',
  },
}

/** Deep merge stored values over defaults (arrays replace, objects merge). */
export function mergeDeep<T>(base: T, override: unknown): T {
  if (override === undefined || override === null) return base
  if (Array.isArray(base) || typeof base !== 'object' || base === null) {
    return (override as T) ?? base
  }
  if (typeof override !== 'object' || Array.isArray(override)) return base
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  for (const [k, v] of Object.entries(override as Record<string, unknown>)) {
    const b = (base as Record<string, unknown>)[k]
    if (b !== undefined && b !== null && typeof b === 'object' && !Array.isArray(b)) {
      out[k] = mergeDeep(b, v)
    } else if (v !== undefined) {
      out[k] = v
    }
  }
  return out as T
}

export const SEPARATOR_OPTIONS = ['-', '–', '—', ':', '·', '•', '*', '⋆', '|', '~', '«', '»', '<', '>']
