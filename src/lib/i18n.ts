export const UZBEK_MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'
];

export function formatUzbekDate(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const day = date.getDate();
  const month = UZBEK_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}, ${year}`;
}

export function formatUzbekReadingTime(minutes: number): string {
  return `${minutes} min o'qish`;
}

export const uzbekTranslations = {
  nav: {
    home: "Bosh sahifa",
    writing: "Blog",
    contact: "Aloqa",
    search: "Qidiruv",
    adminLogin: "Admin Login",
    adminStudio: "Admin Studio",
  },
  home: {
    authorSubtitle: "Marketing mutaxassisi",
    authorBioDefault: "Ora-orada marketing, Sun'iy Intellekt va vebsaytlar haqida post yozib turaman",
    exploreByTopic: "Mavzular bo'yicha:",
    featuredBadge: "Tanlangan post",
    readEssay: "Postni o'qish",
    recentWritings: "So'nggi Postlar",
    viewAllArchive: "Barcha arxivni ko'rish",
    readShort: "O'qish",
  },
  blog: {
    title: "Blog",
    subtitle: "Marketing, Sun'iy intellekt, vebsayt va boshqa mavzular haqida postlar",
    allArticles: "Barcha postlar",
    filterPlaceholder: "Kalit so'z bo'yicha saralash...",
    noArticlesFound: "Mos keladigan postlar topilmadi.",
    clearFilters: "Filtrlarni tozalash",
    readArticle: "Postni o'qish",
    newest: "Eng so'ngisi",
    oldest: "Oldinroqlar",
    readingTime: "O'qish vaqti",
    featuredArticle: "Tavsiya etilgan post",
    popularTags: "Ommabop teglar:",
    viewGrid: "Katak",
    viewList: "Ro'yxat",
    sortBy: "Saralash",
    viewsCount: "ko'rishlar",
  },
  article: {
    backToArchive: "Barcha postlarga qaytish",
    saved: "Saqlangan",
    save: "Saqlash",
    share: "Ulashish",
    tableOfContents: "Mundarija",
    words: "so'z",
    footnotes: "Izohlar va manbalar",
    writtenBy: "Muallif:",
    previousEssay: "Oldingi post",
    nextEssay: "Keyingi post",
    moreInCategory: "ushbu mavzudagi boshqa postlar:",
    linkCopied: "Havola nusxalandi",
    linkCopiedDesc: "Post havolasi buferga nusxalandi",
    articleSaved: "Post saqlandi",
    articleSavedDesc: "Oflayn mutolaa ro'yxatiga saqlandi",
    articleRemoved: "Post o'chirildi",
    articleRemovedDesc: "Saqlangan ro'yxatdan olib tashlandi",
    copied: "Nusxalandi",
    copy: "Nusxalash",
  },
  about: {
    title: "Men haqimda",
    authorLocation: "Toshkent, O'zbekiston",
    bio1: "Men diqqatni chalg'itmaydigan va inson bilan kompyuter o'rtasidagi o'zaro ta'sirni yengillashtiradigan dasturiy arxitektura va dizayn bilan shug'ullanamanam. So'nggi o'n yil davomida tarqalgan backend infratuzilmalari, nashriyot vositalari va dizayn tizimlarini ishlab chiqdim.",
    bio2: "Jurabek raqamli shovqin, reklama vositalari va ortiqcha bezaklardan xoli bo'lgan, birinchi navbatda yozuvga yo'naltirilgan nashriyot platformasidir.",
    corePhilosophy: "Asosiy falsafa",
    principles: [
      {
        title: "1. Tipografik marom",
        desc: "Maketni dekorativ chegaralar emas, balki optik iyerarxiya va 72ch o'lchov chegaralari orqali shakllantirish."
      },
      {
        title: "2. Mahalliy va doimiy saqlash",
        desc: "Sizning yozganlaringiz o'zingizga tegishli. Oddiy matn va standart Markdown formati xususiy ma'lumotlar bazalaridan ko'ra uzoqroq yashaydi."
      },
      {
        title: "3. Harakatlarda vazminlik",
        desc: "Animatsiya faqat holat o'zgarishini bildirish uchun xizmat qilishi kerak. 200ms dan ortiq davom etadigan harakatlar kundalik ishni sekinlashtiradi."
      },
      {
        title: "4. Kuzatuvsiz maxfiylik",
        desc: "Hech qanday kuzatuv kodlari, uchinchi tomon piksellari yoki foydalanuvchi xulq-atvorini tahlil qiluvchi vositalar ishlatilmaydi."
      }
    ],
    architecture: "Texnik arxitektura",
    builtWith: "Zamonaviy veb texnologiyalar asosida qurilgan:",
    connectLinks: "Bog'lanish va havolalar",
  },
  contact: {
    title: "Bog'lanish va muloqot",
    subtitle: "Savollar, takliflar bo'lsa elektron pochta orqali bog'lanishingiz mumkin.",
    emailTitle: "E-pochta",
    emailDesc: "Savollar, takliflar bo'lsa elektron pochta orqali bog'laning",
  },
  searchModal: {
    placeholder: "Barcha postlarni qidirish...",
    foundArticles: "ta maqola topildi",
    recentEssays: "So'nggi maqolalar",
    pressEscToClose: "Yopish uchun ESC bosing",
    noMatching: "bo'yicha hech narsa topilmadi",
  },
  footer: {
    craftedBy: "Marketing, Sun'iy intellekt and IT haqida blog",
    archive: "Arxiv",
    colophon: "Tizim haqida",
  }
};
