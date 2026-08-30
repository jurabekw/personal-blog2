import { Post, Category, Tag, MediaItem, SiteSettings, ActivityLog } from '../types';

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

Mutolaa va yozuv muhitini yaratishda vazminlik cheklov emas. Bu foydalanuvchining zexn va diqqat energiyasini hurmat qilish uchun qilingan ongli texnik tanlovdir.

---

## Vazmin dizaynning uchta ustuni

Mavsumiy vizual urflardan uzoqroq yashaydigan dasturlarni yaratish uchun har bir maket qarorini uchta asosiy tamoyilga asoslaymiz:

### 1. Tipografik ustuvorlik
Tipografiya qat'iy va maromli aniqlik bilan bajarilganda, rang va bezak ikkinchi darajali bo mezon bo'lib qoladi. Har bir element — satr uzunligidan (72ch bilan chegaralangan) xatboshi oralig'igacha (1.75) — vizual zichlikdan ko'ra inson ko'zining o'qish qulayligini birinchi o'ringa qo mezon qiladi.

\`\`\`css
/* Optik o'qish cheklovlari */
.reading-container {
  max-width: 72ch;
  line-height: 1.75;
  font-family: 'Newsreader', Georgia, serif;
  font-size: 18px;
  color: #111111;
}
\`\`\`

### 2. Tuzilma sifatida bo'sh joy
Elementlarni og'ir chegaralar yoki soya effektlari bilan ajratish o'rniga, intizomli 8-nuqtali vertikal oralik maromidan foydalaning. Bo'sh joy bu bo'shliq emas; u arxitektura poydevoridir.

### 3. Maqsadli harakat
Animatsiyalar faqat holat o'zgarishini bildirish uchun xizmat qilishi kerak — hech qachon shunchaki ko'ngilochar bo'lmasligi lozim. 200ms dan ortiq davom etadigan yoki elastik sakrashlarni o'z ichiga olgan har qanday harakat kundalik foydalanuvchini sekinlashtiradi.

---

## Kod bloklari va sintaksis aniqligi

Fikrlovchi mualliflar uchun mo'ljallangan nashriyot tizimida texnik kod bloklari begona dasturchilar portalidan nusxalangandek emas, balki tahririyat maromiga mos kelishi kerak:

\`\`\`typescript
interface PublishingEngineConfig {
  readingWidth: '72ch';
  bodyFont: 'Newsreader' | 'Literata';
  maxAnimationDurationMs: 200;
  strictGridStep: 8;
  accentColor: '#1E3E62';
}

export function initializeReader(config: PublishingEngineConfig) {
  console.log('Sokin mutolaa tajribasi ishga tushirilmoqda...');
  return { status: 'ready', mode: 'writing-first' };
}
\`\`\`

---

## Xulosa

Eng sokin dasturiy ta'minot ko'pincha eng chuqur taassurot qoldiradi. Vizual bezaklardan ko'ra tipografik iyerarxiyani tanlash orqali biz g'oyalar chalg'imay nafas oladigan raqamli makon yaratamiz.`
  },
  {
    id: 'post-2',
    title: 'Zamonaviy veb maketlarida tipografik marom haqida qaydlar',
    slug: 'tipografik-marom-haqida-qaydlar',
    excerpt: 'Vertikal asosiy to\'r, modulli shrift shkalalari va optik hoshiyalar bo\'yicha izlanishlar. Kichik masofa tuzatishlari o\'qishni qanday o\'zgartiradi.',
    category: 'Dizayn',
    tags: ['Tipografiya', 'Minimalizm'],
    status: 'published',
    isFeatured: true,
    publishedAt: '2026-07-22T09:15:00.000Z',
    createdAt: '2026-07-18T11:00:00.000Z',
    updatedAt: '2026-07-22T09:15:00.000Z',
    wordCount: 890,
    readingTimeMinutes: 4,
    viewsCount: 940,
    coverImage: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80',
    coverImageAlt: 'Tiniq serif harflari bilan ochiq kitob',
    seoTitle: 'Vebda tipografik marom va vertikal oraliq',
    seoDescription: 'Tahririyat veb-saytlari uchun satr balandligi va asosiy marom bo\'yicha texnik tahlil.',
    footnotes: [
      { id: 'fn-1', number: 1, text: 'Robert Bringxerst, Tipografik uslub elementlari (1992).' }
    ],
    content: `## Moslashuvchan veb-maketlarda asosiy to'r (Baseline Grid)

Vebda tipografiya moslashuvchan, lekin moslashuvchanlik tartibsizlikni anglatmaydi. Taxmin qilinadigan asosiy to'rni o'rnatish xatboshilar, sarlavhalar va iqtiboslarga uyg'unlik olib keladi.

### Tipografik shkala

Biz vazmin shkaladan foydalanamiz:
- **Display**: 56px (Satr balandligi: 1.1)
- **H1**: 40px (Satr balandligi: 1.2)
- **H2**: 32px (Satr balandligi: 1.25)
- **H3**: 24px (Satr balandligi: 1.3)
- **Matn (Body)**: 18px (Satr balandligi: 1.75)
- **Kichik**: 15px (Satr balandligi: 1.5)

### Satr uzunligi va o'lchov

Matn satri hech qachon 70–72 belgidan oshmasligi kerak. Satrlar juda keng bo'lganda, o mezonning ko'zi chap hoshiyaga qaytishda o'z yo'nalishini yo'qotadi.

> "To'g'ri satr uzunligi inson zehni uchun fikrni toliqmasdan va ko'z charchog'isiz qabul qilish imkonini beradi."

\`\`\`css
p {
  max-width: 72ch;
  margin-bottom: 1.5rem;
}
\`\`\`

Sarlavhalaringizni matn balandligi bilan uyg'unlashtirish kitobxonlar zudlik bilan his qiladigan yashirin tuzilmani yaratadi.`
  },
  {
    id: 'post-3',
    title: 'Uzoq yashaydigan dasturiy ta\'minot: Mumtoz nashriyot saboqlari',
    slug: 'uzoq-yashaydigan-dasturiy-taminot',
    excerpt: 'Vaqtinchalik veb-freymvorklarni besh asrlik matbaa chidamliligi bilan solishtirish. Oddiy ma\'lumot formatlari yozganlarimizni qanday saqlaydi.',
    category: 'Texnologiya',
    tags: ['Arxitektura', 'Mahorat'],
    status: 'published',
    isFeatured: false,
    publishedAt: '2026-07-15T16:00:00.000Z',
    createdAt: '2026-07-10T08:20:00.000Z',
    updatedAt: '2026-07-15T16:00:00.000Z',
    wordCount: 1560,
    readingTimeMinutes: 7,
    viewsCount: 1820,
    coverImage: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=1200&q=80',
    coverImageAlt: 'Qadimiy matbaa harflari',
    seoTitle: 'Uzoq yashaydigan dasturiy ta\'minot: Mumtoz nashriyot saboqlari',
    seoDescription: 'Nima uchun oddiy matn, Markdown va mahalliy saqlash formatlari yozuvlarimizning uzoq yashashini ta\'minlaydi.',
    content: `## Zamonaviy SaaS nashriyotining mo'rtligi

So'nggi o mezon besh yil ichida xosting xizmatlari yopilishi, xususiy ma'lumotlar bazalarining buzilishi yoki to'lov tariflarining o'zgarishi sababli minglab shaxsiy bloglar yo'qolib ketdi.

So'zlaringiz faqat murakkab bulutli ma'lumotlar bazasida saqlanganda, yozuvlaringiz vaqtincha mehmon bo'lib qoladi.

### Oddiy matnning afzalligi

Markdown formatidagi oddiy matn bugun ham, ellik yildan keyin ham har qanday qurilmada o'qilishi mumkin bo mezon bo'lib qoladi.

1. **Provayderga qaram bo'lmaslik**: Statik sayt generatorlari va maxsus Express dasturlari o'rtasida erkin harakatlaning.
2. **Versiyalar nazorati**: O'zgartirishlarni Git yordamida kod kabi kuzatib boring.
3. **Zudlik bilan qidirish**: Grep kabi mahalliy vositalar gigabaytlab matnni millisekundlarda qidirib beradi.

\`\`\`bash
# Markdown fayllardan 'Minimalizm' so'zini qidirish
grep -rn "Minimalizm" ./posts/*.md
\`\`\`

Mustahkam dasturchilik standarti bu — tashqi bog'liqlikni kamaytirish va ochiq standartlardan foydalanishdir.`
  },
  {
    id: 'post-4',
    title: '72 belgi uchun dizayn: Raqamli mutolaada optik muvozanat',
    slug: '72-belgi-uchun-dizayn-optik-muvozanat',
    excerpt: 'Satr o\'lchovi, ko\'z harakati mexanikasi va nima uchun 72 belgi diqqatli o\'qish uchun oltin standart bo\'lib qolayotgani haqida tahlil.',
    category: 'Dizayn',
    tags: ['Tipografiya', 'Foydalanuvchi tajribasi'],
    status: 'published',
    isFeatured: false,
    publishedAt: '2026-07-02T12:00:00.000Z',
    createdAt: '2026-06-25T15:00:00.000Z',
    updatedAt: '2026-07-02T12:00:00.000Z',
    wordCount: 1100,
    readingTimeMinutes: 5,
    viewsCount: 650,
    coverImage: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80',
    coverImageAlt: 'Kitob sahnasi va ko\'zoynak',
    content: `## Sakkada mexanikasi

Biz o'qiganimizda ko'zlarimiz matn bo'ylab silliq sirpanmaydi. Buning o'rniga ular *sakkada* deb ataladigan tezkor sakrashlarni amalga oshiradi va bir vaqtning o'zida 7-9 harfni qabul qiladi.

Satr 75-80 belgidan oshib ketganda, ko'z mushaklari chap tomonga qaytish burchagini sezilarli darajada o'zgartirishi kerak bo'ladi. Bu uzoq mutolaa davomida charchoq keltirib chiqaradi.

### Amaliy tavsiyalar

- Konteynyer kengligini piksellar o'rniga \`ch\` birliklarida belgilang.
- Mobil qurilmalarda ichki masofalarni to'g'ri moslashtiring.
- Rasm va matn o'rtasida bir xil masofani saqlang.`
  },
  {
    id: 'post-5',
    title: 'Oddiy fayl formatlari va mahalliy xotira chidamliligi haqida',
    slug: 'oddiy-fayl-formatlari-chidamliligi',
    excerpt: 'JSON sxemalari, SQLite va mahalliy fayl keshlarining nima uchun bulutli mikroxizmatlardan ko\'ra uzoqroq yashashi bo\'yicha kuzatuvlar.',
    category: 'Texnologiya',
    tags: ['Arxitektura'],
    status: 'scheduled',
    isFeatured: false,
    scheduledAt: '2026-08-10T09:00:00.000Z',
    createdAt: '2026-08-01T14:00:00.000Z',
    updatedAt: '2026-08-01T14:00:00.000Z',
    wordCount: 750,
    readingTimeMinutes: 3,
    viewsCount: 0,
    coverImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
    coverImageAlt: 'Dasturchi ekrani va kodlar',
    content: `## Rejalashtirilgan insho obzori

Ushbu maqola 2026-yil 10-avgustda avtomatik chop etilishi rejalashtirilgan.

Unda lokal-first arxitektura, ma'lumotlarni saqlash va mustaqil mualliflar uchun yengil ma'lumot modellashtirish yoritiladi.`
  },
  {
    id: 'post-6',
    title: 'Qoralama: Yozuv ilovalaridagi mikro-animatsiyalar xatosi',
    slug: 'qoralama-mikro-animatsiyalar-xatosi',
    excerpt: 'Nima uchun haddan tashqari mikro-harakatlar muallif mahsuldorligini sekinlashtirishi bo\'yicha ishchi tahlil.',
    category: 'Qaydlar',
    tags: ['Minimalizm', 'Foydalanuvchi tajribasi'],
    status: 'draft',
    isFeatured: false,
    createdAt: '2026-08-03T16:45:00.000Z',
    updatedAt: '2026-08-03T17:10:00.000Z',
    wordCount: 420,
    readingTimeMinutes: 2,
    viewsCount: 0,
    content: `## Ishchi qaydlar

- Mikro-animatsiyalar ijtimoiy tarmoq namoyishlarida chiroyli ko'rinadi, lekin tez yozishda kechikish tug'diradi.
- Yozuv vositalari klaviatura bosilishidan ekranga chiqquncha 0ms kechikishni talab qiladi.`
  }
];

export const initialMedia: MediaItem[] = [
  {
    id: 'media-1',
    name: 'minimalist-desk.jpg',
    url: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80',
    altText: 'Daftar va favvora qalami qo\'yilgan minimalistik yog\'och stoli',
    mimeType: 'image/jpeg',
    sizeBytes: 420000,
    width: 1200,
    height: 800,
    createdAt: '2026-07-20T14:30:00.000Z'
  },
  {
    id: 'media-2',
    name: 'open-book-serif.jpg',
    url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80',
    altText: 'Tiniq serif harflari bilan ochiq kitob',
    mimeType: 'image/jpeg',
    sizeBytes: 380000,
    width: 1200,
    height: 800,
    createdAt: '2026-07-18T11:00:00.000Z'
  },
  {
    id: 'media-3',
    name: 'printing-press-types.jpg',
    url: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=1200&q=80',
    altText: 'Qadimiy matbaa harflari',
    mimeType: 'image/jpeg',
    sizeBytes: 510000,
    width: 1200,
    height: 800,
    createdAt: '2026-07-10T08:20:00.000Z'
  },
  {
    id: 'media-4',
    name: 'architectural-lines.jpg',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    altText: 'Tiniq arxitektura chiziqlari kompozitsiyasi',
    mimeType: 'image/jpeg',
    sizeBytes: 290000,
    width: 1200,
    height: 800,
    createdAt: '2026-07-01T09:00:00.000Z'
  }
];

export const initialSettings: SiteSettings = {
  title: 'Jurabek',
  description: 'Dizayn, dasturiy ta\'minot san\'ati va sokin raqamli interfeyslar haqida shaxsiy jurnal.',
  authorName: 'Jurabek',
  authorSubtitle: 'Marketing mutaxassisi',
  authorBio: 'Ora-orada marketing, Sun\'iy Intellekt va vebsaytlar haqida post yozib turaman',
  authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  email: 'shokirovj35@gmail.com',
  twitter: 'https://x.com/julianvance',
  github: 'https://github.com/julianvance',
  linkedin: 'https://linkedin.com/in/julianvance',
  postsPerPage: 10,
  showReadingTime: true,
  showProgress: true,
  analyticsEnabled: true
};

export const initialActivityLogs: ActivityLog[] = [
  {
    id: 'act-1',
    action: 'Post Published',
    details: 'Published "Sokin interfeys: Nima uchun vazminlik mahoratning oliy shaklidir"',
    timestamp: '2026-07-28T10:00:00.000Z',
    type: 'post'
  },
  {
    id: 'act-2',
    action: 'Post Created',
    details: 'Created draft "Qoralama: Yozuv ilovalaridagi mikro-animatsiyalar xatosi"',
    timestamp: '2026-08-03T16:45:00.000Z',
    type: 'post'
  },
  {
    id: 'act-3',
    action: 'Media Uploaded',
    details: 'Uploaded media item "minimalist-desk.jpg"',
    timestamp: '2026-07-20T14:30:00.000Z',
    type: 'media'
  },
  {
    id: 'act-4',
    action: 'Settings Updated',
    details: 'Updated site description and author bio details',
    timestamp: '2026-07-15T11:20:00.000Z',
    type: 'settings'
  }
];

