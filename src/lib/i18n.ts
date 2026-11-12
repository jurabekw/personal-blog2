import { transliterateText } from '@/lib/translit'
import type { Script, TranslitConfig } from '@/lib/translit'

/**
 * Public-site strings, taken verbatim from the WordPress theme (jurabek-blog text domain).
 */
export const t = {
  skipToContent: "Asosiy kontentga o'tish",
  mainMenu: 'Asosiy menyu',
  openMenu: 'Menyuni ochish',
  darkModeOn: 'Tungi rejimni yoqish',
  lightModeOn: 'Kunduzgi rejimni yoqish',
  viewPosts: "Postlarni ko'rish",
  aboutMe: 'Men haqimda',
  featuredPost: 'Tanlangan post',
  recentPosts: "So'nggi postlar",
  all: 'Barchasi',
  allArrow: 'Barchasi →',
  readMore: "Batafsil o'qish →",
  categories: 'Kategoriyalar',
  sidebar: 'Yon panel',
  breadcrumb: "Yo'l",
  home: 'Bosh sahifa',
  search: 'Qidiruv',
  searchFor: (q: string) => `Qidiruv: ${q}`,
  searchPlaceholder: 'Qidirish …',
  searchButton: 'Qidirish',
  postsCount: (n: number) => `${n} ta post`,
  readingTime: (m: number) => `${m} daqiqa o'qish`,
  readingProgress: 'O‘qish jarayoni',
  tags: 'Teglar',
  prevPost: '← Oldingi post',
  nextPost: 'Keyingi post →',
  postsNav: 'Postlar navigatsiyasi',
  related: "O'xshash postlar",
  share: 'Postni ulashing',
  shareTelegram: 'Telegram’da ulashish',
  copyLink: 'Havolani nusxalash',
  linkCopied: 'Havola nusxalandi',
  copy: 'Nusxalash',
  copied: 'Nusxalandi',
  copyFailed: 'Nusxalash amalga oshmadi.',
  pages: 'Sahifalar',
  prev: '← Oldingi',
  next: 'Keyingi →',
  nothingFound: 'Hozircha hech narsa topilmadi',
  nothingFoundText: "Boshqa so'z bilan qidirib ko'ring yoki blog kategoriyalaridan birini tanlang.",
  fullAbout: "To'liq tanishish →",
  readPosts: "Postlarni o'qish",
  error404: 'Xatolik 404',
  notFoundTitle: 'Sahifa topilmadi',
  notFoundText:
    'Siz izlagan sahifa mavjud emas yoki boshqa manzilga ko‘chirilgan. Quyidagi tugmalar orqali saytda davom eting.',
  backHome: 'Bosh sahifaga qaytish',
  allPosts: 'Barcha postlar',
  rights: (year: number, name: string) => `© ${year} ${name}. Barcha huquqlar himoyalangan.`,
  faq: 'Ko‘p beriladigan savollar',
  pageOf: (page: number, total: number) => `Sahifa ${page} / ${total}`,
  updated: 'Yangilangan',
}

export type UiStrings = typeof t

const tCache = new Map<string, UiStrings>()

/** The UI string table in the requested script (strings and function results transliterated). */
export function getT(script: Script, cfg: TranslitConfig): UiStrings {
  if (script === 'latn') return t
  const key = `${script}|${cfg.version}`
  const hit = tCache.get(key)
  if (hit) return hit
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(t)) {
    if (typeof v === 'string') out[k] = transliterateText(v, script, cfg)
    else if (typeof v === 'function') {
      const fn = v as (...args: unknown[]) => string
      out[k] = (...args: unknown[]) => transliterateText(fn(...args), script, cfg)
    } else out[k] = v
  }
  const res = out as UiStrings
  tCache.set(key, res)
  return res
}
