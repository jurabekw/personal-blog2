import { Post, Category, Tag, MediaItem, SiteSettings, ActivityLog } from '../src/types';

export const initialCategories: Category[] = [
  { id: 'cat-1', name: 'Dizayn', slug: 'dizayn', description: 'Tipografiya, maket, bo\'sh joy va vizual sokinlik haqidagi fikrlar.', count: 3 },
  { id: 'cat-2', name: 'Texnologiya', slug: 'texnologiya', description: 'Dasturiy arxitektura, lokal tizimlar va raqamli chidamlilik.', count: 2 },
  { id: 'cat-3', name: 'Insholar', slug: 'insholar', description: 'Raqamli vositalar va mahorat haqida chuqur mushohadalar.', count: 2 },
  { id: 'cat-4', name: 'Qaydlar', slug: 'qaydlar', description: 'Qisqa kuzatuvlar, kitob izohlari va ishchi qaydlar.', count: 1 },
];

export const initialTags: Tag[] = [
  { id: 'tag-1', name: 'Tipografiya', slug: 'tipografiya' },
  { id: 'tag-2', name: 'Mahorat', slug: 'mahorat' },
  { id: 'tag-3', name: 'Minimalizm', slug: 'minimalizm' },
  { id: 'tag-4', name: 'Arxitektura', slug: 'arxitektura' },
  { id: 'tag-5', name: 'Foydalanuvchi tajribasi', slug: 'foydalanuvchi-tajribasi' },
];

export const initialPosts: Post[] = [
  {
    id: 'post-1',
    title: 'Sokin interfeys: Nima uchun vazminlik mahoratning oliy shaklidir',
    slug: 'sokin-interfeys-vazminlik-dizaynda',
    excerpt: 'Zamonaviy dasturiy ta\'minot vizual shovqin bilan to\'lib-tosshgan. Shaffoflik, neon yog\'dulari va haddan tashqari harakatlarni olib tashlaganimizda, faqat ma\'no va mazmun qoladi.',
    category: 'Dizayn',
    tags: ['Minimalizm', 'Mahorat', 'Foydalanuvchi tajribasi'],
    status: 'published',
    isFeatured: true,
    publishedAt: '2026-07-28T10:00:00.000Z',
    createdAt: '2026-07-20T14:30:00.000Z',
    updatedAt: '2026-07-28T10:00:00.000Z',
    wordCount: 1240,
    readingTimeMinutes: 5,
    viewsCount: 1420,
    coverImage: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80',
    coverImageAlt: 'Daftar va favvora qalami qo\'yilgan minimalistik yog\'och stoli',
    seoTitle: 'Sokin interfeys: Zamonaviy dizaynda vazminlik',
    seoDescription: 'Sokin dasturiy ta\'minot, tipografiya va raqamli vositalardagi shovqinni kamaytirish haqida insho.',
    footnotes: [
      { id: 'fn-1', number: 1, text: 'Diter Rams, Yaxshi dizaynning 10 ta tamoyili (1970). 10-tamoyil: "Yaxshi dizayn — bu imkon qadar kamroq dizayndir."' },
      { id: 'fn-2', number: 2, text: 'Eduard Tafti, Miqdoriy axborotning vizual tasviri (1983). Ma\'lumot va siyoh nisbati tamoyili.' }
    ],
    content: `## Shovqin jozibasi

So'nggi o'n yillikda foydalanuvchi interfeysi dizayni vizual teatrga aylanib ketdi. Skevomorfizmdan tekis dizaynga, undan keyin neomorfizm, shaffof qatlamlar va endi neon yog'dulari bilan boyitilgan qorong'u rejim estetikasini ko'rdik.

Ushbu tendensiyalar ko'rgazmalarda qiziqish uyg'otsa-da, ular dasturiy ta'minotning asosiy sinovidan o'ta olmaydi: **interfeys inson diqqat-e'tiborini qo'llab-quvvatlaydimi yoki o'ziga e'tibor talab qiladimi?**

> "Vosita inson aqlining mantiqiy davomi kabi his qilinishi kerak — sokin, vaznsiz va tezkor. U qarsaklar kutadigan sahifa ko'rinishi bo'lmasligi lozim."

Mutolaa va yozuv muhitini yaratishda vazminlik cheklov emas. Bu foydalanuvchining zexn va diqqat energiyasini hurmat qilish uchun qilingan ongli texnik tanlovdir.`
  },
  {
    id: 'post-2',
    title: 'Lokal tarmoqlar va ma\'lumotlar ustidan shaxsiy nazorat',
    slug: 'lokal-tarmoqlar-va-shaxsiy-nazorat',
    excerpt: 'Bulutli xizmatlarga qaramlik ma\'lumotlar xavfsizligini xavfga qo\'yadi. Lokal arxivlar va oflayn ishlash tamoyillari raqamli mustaqillikning garovidir.',
    category: 'Texnologiya',
    tags: ['Arxitektura', 'Mahorat'],
    status: 'published',
    isFeatured: false,
    publishedAt: '2026-07-22T15:00:00.000Z',
    createdAt: '2026-07-15T09:12:00.000Z',
    updatedAt: '2026-07-22T15:00:00.000Z',
    wordCount: 890,
    readingTimeMinutes: 4,
    viewsCount: 860,
    coverImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    coverImageAlt: 'Mikrosxema va apparat komponentlari',
    seoTitle: 'Lokal tarmoqlar va shaxsiy nazorat',
    seoDescription: 'Lokal-first dasturiy ta\'minot va raqamli ma\'lumotlar chidamliligi haqida texnik mulohazalar.',
    content: `## Bulut muammosi

Zamonaviy ilovalar ma'lumotlarimizni uzoqdagi serverlarda saqlaydi. Server o'chsa yoki obuna tugasa, shaxsiy qaydlarimiz va ma'lumotlarimiz yo'qoladi.

Lokal-first yondashuv ma'lumotlarni birinchi navbatda foydalanuvchi qurilmasida saqlashni va tarmoq mavjud bo'lganda sinxronlashni nazarda tutadi.`
  },
  {
    id: 'post-3',
    title: 'Kodsiz va sun\'iy intellekt davrida dasturlash mahorati',
    slug: 'kodsiz-va-ai-davrida-dasturlash-mahorati',
    excerpt: 'Generatorlar va kod yozuvchi botlar ko\'paygan sari, asosiy tamoyillarni va chuqur arxitekturani tushunadigan muhandislarning qadri oshadi.',
    category: 'Insholar',
    tags: ['Mahorat', 'Tipografiya'],
    status: 'published',
    isFeatured: false,
    publishedAt: '2026-07-10T12:00:00.000Z',
    createdAt: '2026-07-01T11:00:00.000Z',
    updatedAt: '2026-07-10T12:00:00.000Z',
    wordCount: 1560,
    readingTimeMinutes: 7,
    viewsCount: 2100,
    coverImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
    coverImageAlt: 'Ekrandagi dastur kodi va qorong\'u xona',
    seoTitle: 'AI davrida dasturlash mahorati',
    seoDescription: 'Sun\'iy intellekt davrida dasturiy ta\'minot muhandisligi va hunarmandchilik.',
    content: `## Asosiy tamoyillarga qaytish

Kod generatorlari bir necha soniyada yuzlab qatordan iborat loyihalarni yaratib berishi mumkin. Lekin muammo kod yozishda emas, balki murakkablikni boshqarishda.`
  }
];

export const initialMedia: MediaItem[] = [
  { id: 'media-1', name: 'Minimalist desk', url: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80', altText: 'Daftar va favvora qalami', mimeType: 'image/jpeg', sizeBytes: 340000, createdAt: '2026-07-28T10:00:00.000Z' },
  { id: 'media-2', name: 'Microchip board', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80', altText: 'Mikrosxema', mimeType: 'image/jpeg', sizeBytes: 420000, createdAt: '2026-07-22T15:00:00.000Z' },
  { id: 'media-3', name: 'Code screen', url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80', altText: 'Dastur kodi', mimeType: 'image/jpeg', sizeBytes: 510000, createdAt: '2026-07-10T12:00:00.000Z' }
];

export const initialSettings: SiteSettings = {
  title: 'Jurabek — Shaxsiy Blog & Qaydlar',
  description: 'Dizayn, dasturiy ta\'minot arxitekturasi va raqamli mahorat haqida uzbek tilidagi insholar.',
  authorName: 'Jurabek',
  authorSubtitle: 'Marketing mutaxassisi',
  authorBio: 'Ora-orada marketing, Sun\'iy Intellekt va vebsaytlar haqida post yozib turaman',
  authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  email: 'shokirovj35@gmail.com',
  postsPerPage: 10,
  showReadingTime: true,
  showProgress: true,
  analyticsEnabled: true
};

export const initialActivityLogs: ActivityLog[] = [
  { id: 'act-1', action: 'Tizim ishga tushirildi', details: 'Boshlang\'ich sozlamalar va ma\'lumotlar yuklandi', timestamp: '2026-07-28T10:00:00.000Z', type: 'settings' }
];
