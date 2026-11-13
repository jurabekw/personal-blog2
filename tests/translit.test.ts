import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toCyrillic, toNewLatin, transliterateText } from '../src/lib/translit/core'
import { DEFAULT_TRANSLIT_CONFIG } from '../src/lib/translit/defaults'
import { normalizeForSearch } from '../src/lib/translit/search'
import { getTranslitConfig, indexNewLatin } from '../src/lib/translit/config'
import { transliterateHtml } from '../src/lib/translit/html'

const cfg = DEFAULT_TRANSLIT_CONFIG

// toCyrillic
test('cyrillic basic letters and digraphs', () => {
  assert.equal(toCyrillic("O'zbekiston", cfg), 'Ўзбекистон');
  assert.equal(toCyrillic('shahar choy', cfg), 'шаҳар чой');
  assert.equal(toCyrillic("g'alaba", cfg), 'ғалаба');
  assert.equal(toCyrillic('marketing', cfg), 'маркетинг');
});

test('cyrillic y-rules run after oʻ/gʻ', () => {
  assert.equal(toCyrillic("yo'l", cfg), 'йўл');
  assert.equal(toCyrillic('yangi yetti yoz yulduz', cfg), 'янги етти ёз юлдуз');
});

test('cyrillic e at word start or after vowel becomes э', () => {
  assert.equal(toCyrillic('ekran kelajak', cfg), 'экран келажак');
  assert.equal(toCyrillic('Ekran', cfg), 'Экран');
});

test('cyrillic tutuq', () => {
  assert.equal(toCyrillic("a'zo", cfg), 'аъзо');
  assert.equal(toCyrillic("Is'hoq", cfg), 'Исҳоқ');
});

test('cyrillic preserves ALL CAPS Uzbek words', () => {
  assert.equal(toCyrillic("O'ZBEK SHAHAR", cfg), 'ЎЗБЕК ШАҲАР');
});

test('exceptions: exact word and longest prefix', () => {
  const c = { ...cfg, exceptions: { aksiya: 'акция', sentabr: 'сентябрь' } };
  assert.equal(toCyrillic('aksiya', c), 'акция');
  assert.equal(toCyrillic('aksiyalar', c), 'акциялар');
  assert.equal(toCyrillic('Sentabr', c), 'Сентябрь');
});

test('keeps protected words and acronyms', () => {
  const c = { ...cfg, protectedWords: ['Google', 'Ads', 'ChatGPT', 'Chrome'] };
  assert.equal(toCyrillic('Google Ads kampaniyasi', c), 'Google Ads кампанияси');
  // SEO is kept by the default protected list; GA4 by its digit.
  assert.equal(toCyrillic('ChatGPT bilan SEO va GA4', cfg), 'ChatGPT билан SEO ва GA4');
  assert.equal(toCyrillic('ChatGPT bilan GA4', c), 'ChatGPT билан GA4');
  assert.equal(toCyrillic('Facebook sahifa', cfg), 'Facebook саҳифа');
  assert.equal(toNewLatin('Chrome brauzeri', c), 'Chrome brauzeri');
});

test('punctuation, numbers and spacing untouched', () => {
  assert.equal(toCyrillic('2026-yil, 5 ta (shahar)!', cfg), '2026-йил, 5 та (шаҳар)!');
});

// toNewLatin
test('new latin digraphs and case', () => {
  assert.equal(toNewLatin("O'zbekiston shahri choyxona", cfg), 'Özbekiston şahri çoyxona');
  assert.equal(toNewLatin("G'ALABA Shahar CHOY", cfg), 'ĞALABA Şahar ÇOY');
  assert.equal(toNewLatin('dengiz', cfg), 'dengiz');
});

test('new latin tutuq', () => {
  assert.equal(toNewLatin("Is'hoq", cfg), 'Ishoq');
  assert.equal(toNewLatin("a'zo", cfg), 'aʼzo');
});

test('normalises apostrophe variants', () => {
  for (const s of ['o‘zbek', 'oʻzbek', 'o`zbek', 'o’zbek', "o'zbek"]) {
    assert.equal(toNewLatin(s, cfg), 'özbek');
    assert.equal(toCyrillic(s, cfg), 'ўзбек');
  }
});

test('latn is identity', () => {
  assert.equal(transliterateText("o'zbek", 'latn', cfg), "o'zbek");
  assert.equal(transliterateText("o'zbek", 'cyrl', cfg), 'ўзбек');
  assert.equal(transliterateText("o'zbek", 'yangi', cfg), 'özbek');
});


test('normalizes all alphabets to current latin', () => {
  assert.equal(normalizeForSearch('Маркетинг'), 'marketing');
  assert.equal(normalizeForSearch('şahar Çoy'), 'shahar choy');
  assert.equal(normalizeForSearch('ЎЗБЕК'), "o'zbek");
  assert.equal(normalizeForSearch('o‘zbek'), "o'zbek");
  assert.equal(normalizeForSearch('Ёз юлдуз эшик'), 'yoz yulduz eshik');
  assert.equal(normalizeForSearch('ğalaba Öz'), "g'alaba o'z");
});

test('cyrillic е is ye at word start, e elsewhere', () => {
  assert.equal(normalizeForSearch('етти келажак'), 'yetti kelajak');
});

test('soft and hard signs', () => {
  assert.equal(normalizeForSearch('сентябрь аъзо'), "sentyabr a'zo");
});

test('ц is s after a consonant, ts after a vowel (Uzbek Latin spelling)', () => {
  assert.equal(normalizeForSearch('акция'), 'aksiya');
  assert.equal(normalizeForSearch('лицензия'), 'litsenziya');
});


test('defaults when alphabets settings are missing', () => {
  assert.equal(getTranslitConfig(), DEFAULT_TRANSLIT_CONFIG);
  assert.equal(indexNewLatin(), true);
});

test('admin lists replace defaults and change the version', () => {
  const cfg = getTranslitConfig({ exceptions: { kontent: 'контент' }, protectedWords: ['Foo'], indexNewLatin: false });
  assert.notEqual(cfg.version, DEFAULT_TRANSLIT_CONFIG.version);
  assert.deepEqual(cfg.exceptions, { kontent: 'контент' });
  assert.equal(toCyrillic('Foo sentabr', cfg), 'Foo сентабр');
  assert.equal(indexNewLatin({ exceptions: {}, protectedWords: [], indexNewLatin: false }), false);
});

test('empty admin lists fall back to defaults', () => {
  const cfg = getTranslitConfig({ exceptions: {}, protectedWords: [], indexNewLatin: true });
  assert.equal(cfg.version, DEFAULT_TRANSLIT_CONFIG.version);
});

test('transliterateHtml leaves markup intact', () => {
  const html = '<p class="jb-x">Shahar <a href="/shahar/" title="Choy">choy</a> <img src="/u/sh.jpg" alt="Shahar rasmi"></p>' +
    '<pre><code>shahar</code></pre><p>a &amp; b</p><iframe src="https://youtube.com/embed/sh"></iframe>'
  assert.equal(transliterateHtml(html, 'cyrl', cfg),
    '<p class="jb-x">Шаҳар <a href="/shahar/" title="Чой">чой</a> <img src="/u/sh.jpg" alt="Шаҳар расми"></p>' +
    '<pre><code>shahar</code></pre><p>а &amp; б</p><iframe src="https://youtube.com/embed/sh"></iframe>')
})

test('transliterateHtml latn is identity', () => assert.equal(transliterateHtml('<p>sh</p>', 'latn', cfg), '<p>sh</p>'))

test('transliterateHtml new latin, comments and nested skip tags', () => {
  const html = '<!-- shahar --><p>shahar</p><script>var shahar</script><style>.sh{}</style><pre><b>sh</b> <code>sh</code> sh</pre><p>choy</p>'
  assert.equal(transliterateHtml(html, 'yangi', cfg),
    '<!-- shahar --><p>şahar</p><script>var shahar</script><style>.sh{}</style><pre><b>sh</b> <code>sh</code> sh</pre><p>çoy</p>')
})

test('transliterateHtml handles entities, single-quoted attrs and data-title', () => {
  // Apostrophe entities are decoded before transliterating (quotes around words stay quotes).
  assert.equal(transliterateHtml("<p>shahar&nbsp;choy &#39;x&#39;</p><img alt='choy' data-alt=\"choy\">", 'cyrl', cfg),
    "<p>шаҳар&nbsp;чой 'х'</p><img alt='чой' data-alt=\"choy\">")
})

// ---- Final fix wave ----

test('shortcodes: jb_ tag and attribute names stay, only title="…" is transliterated', () => {
  const html = '<p>[jb_article_sections]</p><p>[jb_copy_box title="Prompt"]Shahar haqida[/jb_copy_box]</p>' +
    "<p>[jb_article_sections title='Mundarija']</p><p>[jb_copy_box title=“Choy”]x[/jb_copy_box]</p>"
  assert.equal(transliterateHtml(html, 'cyrl', cfg),
    '<p>[jb_article_sections]</p><p>[jb_copy_box title="Промпт"]Шаҳар ҳақида[/jb_copy_box]</p>' +
    "<p>[jb_article_sections title='Мундарижа']</p><p>[jb_copy_box title=“Чой”]х[/jb_copy_box]</p>")
  assert.equal(transliterateHtml('<p>[jb_copy_box title="Shahar"]choy[/jb_copy_box]</p>', 'yangi', cfg),
    '<p>[jb_copy_box title="Şahar"]çoy[/jb_copy_box]</p>')
  // Encoded quotes around the title value.
  assert.equal(transliterateHtml('<p>[jb_copy_box title=&quot;Shahar&quot;]x[/jb_copy_box]</p>', 'cyrl', cfg),
    '<p>[jb_copy_box title=&quot;Шаҳар&quot;]х[/jb_copy_box]</p>')
  // Ordinary square brackets are still text.
  assert.equal(transliterateHtml('<p>[shahar]</p>', 'cyrl', cfg), '<p>[шаҳар]</p>')
})

test('apostrophe entities are decoded before transliterating', () => {
  for (const e of ['&#39;', '&#x27;', '&apos;', '&#039;']) {
    assert.equal(transliterateHtml(`<p>O${e}zbek</p>`, 'cyrl', cfg), '<p>Ўзбек</p>', e)
  }
  for (const e of ['&rsquo;', '&#8217;', '&#x2019;']) {
    assert.equal(transliterateHtml(`<p>O${e}zbek</p>`, 'cyrl', cfg), '<p>Ўзбек</p>', e)
    assert.equal(transliterateHtml(`<p>bog${e}</p>`, 'yangi', cfg), '<p>boğ</p>', e)
  }
  assert.equal(transliterateHtml('<img alt="O&#39;zbek">', 'cyrl', cfg), '<img alt="Ўзбек">')
  // A decoded apostrophe never closes a single-quoted attribute.
  assert.equal(transliterateHtml("<img alt='ma&#39;no'>", 'cyrl', cfg), "<img alt='маъно'>")
  assert.equal(transliterateHtml("<img alt='&#39;x&#39;'>", 'cyrl', cfg), "<img alt='&#39;х&#39;'>")
})

test('brand names keep their stem when an Uzbek suffix is attached', () => {
  assert.equal(toCyrillic("Google'da", cfg), "Google'да")
  assert.equal(toCyrillic('Googleda', cfg), 'Googleда')
  assert.equal(toCyrillic('Instagram’da', cfg), 'Instagram’да')
  assert.equal(toCyrillic("Instagram'da", cfg), "Instagram'да")
  assert.equal(toCyrillic("Meta'ning", cfg), "Meta'нинг")
  assert.equal(toCyrillic('Yandexda', cfg), 'Yandexда')
  assert.equal(toCyrillic('Yoastda', cfg), 'Yoastда')
  assert.equal(toCyrillic('Telegram’da ulashish', cfg), 'Telegram’да улашиш')
  assert.equal(toCyrillic("Googlelarda va Google'ga", cfg), "Googleларда ва Google'га")
  assert.equal(toCyrillic("ChatGPT'ning", cfg), "ChatGPT'нинг")
  // New Latin: the stem and the typed apostrophe stay.
  assert.equal(toNewLatin("Google'da va Googleda", cfg), "Google'da va Googleda")
  assert.equal(toNewLatin("Telegram'dagi chat", cfg), "Telegram'dagi çat")
  // Without an apostrophe only known suffixes count.
  assert.equal(toCyrillic('Metabolizm', cfg), 'Метаболизм')
  assert.equal(toCyrillic('Notionda', cfg), 'Notionда')
  // A non-brand word is unaffected.
  assert.equal(toCyrillic('shaharda', cfg), 'шаҳарда')
  assert.equal(toCyrillic('itlar itga', cfg), 'итлар итга')
  assert.equal(toCyrillic('ITlar', cfg), 'ITлар')
})

test('UI string Telegram’da ulashish keeps Telegram in Latin', () => {
  assert.equal(transliterateText('Telegram’da ulashish', 'cyrl', cfg), 'Telegram’да улашиш')
})

test('URLs, e-mails, @handles, domains and dotted names pass through', () => {
  const cases = [
    'https://www.jurabek.blog/blog/',
    'http://example.uz/shahar?a=1#choy',
    'www.jurabek.blog/shahar',
    'info@jurabek.blog',
    'linkedin.com/in/jurabek',
    'Next.js',
    'node.js',
    '@jurabeekkd',
    'jurabek.blog',
  ]
  for (const c of cases) {
    assert.equal(toCyrillic(`Manzil: ${c} shahar`, cfg), `Манзил: ${c} шаҳар`, c)
    assert.equal(toNewLatin(`Manzil: ${c} shahar`, cfg), `Manzil: ${c} şahar`, c)
  }
  // Trailing sentence punctuation is not part of the URL.
  assert.equal(toCyrillic('Sayt: https://www.jurabek.blog/blog/. Keyin choy', cfg), 'Сайт: https://www.jurabek.blog/blog/. Кейин чой')
  assert.equal(toCyrillic('(info@jurabek.blog) va @jurabeekkd.', cfg), '(info@jurabek.blog) ва @jurabeekkd.')
  assert.equal(toCyrillic('Next.js’da sayt', cfg), 'Next.js’да сайт')
  // Normal sentences still transliterate both words.
  assert.equal(toCyrillic('Bu yaxshi. Keyin', cfg), 'Бу яхши. Кейин')
  assert.equal(toCyrillic('Bu yaxshi.Keyin', cfg), 'Бу яхши.Кейин')
  assert.equal(toCyrillic('va h.k. shahar', cfg), 'ва ҳ.к. шаҳар')
  assert.equal(toCyrillic('3.5 soat', cfg), '3.5 соат')
  assert.equal(toCyrillic('1.5-versiya', cfg), '1.5-версия')
})

test('-tsiya / -tsion become -ция / -цион in Cyrillic; bare ts stays тс', () => {
  const words: [string, string][] = [
    ['integratsiya', 'интеграция'],
    ['integratsiyasi', 'интеграцияси'],
    ['integratsiyalash', 'интеграциялаш'],
    ['navigatsiya', 'навигация'],
    ['navigatsiyasi', 'навигацияси'],
    ['investitsion', 'инвестицион'],
    ['traditsion', 'традицион'],
    ['Integratsiya', 'Интеграция'],
    ['aytsa', 'айтса'],
    ['ketsa', 'кетса'],
    ["o'tsangiz", 'ўтсангиз'],
  ]
  for (const [lat, cyr] of words) assert.equal(toCyrillic(lat, cfg), cyr, lat)
  assert.equal(toNewLatin('integratsiya', cfg), 'integratsiya')
  assert.equal(normalizeForSearch('интеграция'), 'integratsiya')
  assert.equal(normalizeForSearch('инвестицион'), 'investitsion')
})

test('dictionary: loanwords with ъ and ц', () => {
  const words: [string, string][] = [
    ['obyekt', 'объект'], ['obyektlar', 'объектлар'], ['subyekt', 'субъект'], ['sikl', 'цикл'],
    ['protsess', 'процесс'], ['protsessi', 'процесси'], ['retsept', 'рецепт'], ['ofitsial', 'официал'],
    ['litsey', 'лицей'], ['konsepsiya', 'концепция'], ['reaksiya', 'реакция'], ['tendensiya', 'тенденция'],
    ['investitsiya', 'инвестиция'], ['prezentatsiya', 'презентация'],
  ]
  for (const [lat, cyr] of words) assert.equal(toCyrillic(lat, cfg), cyr, lat)
})

test('short ALL-CAPS Uzbek words are transliterated; real acronyms stay Latin', () => {
  assert.equal(toCyrillic('Bu JUDA muhim va BEPUL. YANGI kurs!', cfg), 'Бу ЖУДА муҳим ва БЕПУЛ. ЯНГИ курс!')
  assert.equal(toNewLatin('SHAHAR va CHOY', cfg), 'ŞAHAR va ÇOY')
  const acronyms = ['SEO', 'GEO', 'AEO', 'UX', 'UI', 'CRO', 'KPI', 'ROI', 'CRM', 'CMS', 'API', 'AI', 'PR', 'HTML', 'URL', 'MBA', 'PDF', 'IT', 'SaaS', 'GA4', 'B2B', 'CTR', 'CPC', 'CPA', 'CPM', 'ROAS', 'SMM']
  for (const a of acronyms) assert.equal(toCyrillic(`${a} kerak`, cfg), `${a} керак`, a)
  // No vowel / digit / foreign letter → acronym even if not in the list.
  assert.equal(toCyrillic('BMT va TV hamda X5 va WWF', cfg), 'BMT ва TV ҳамда X5 ва WWF')
  // Words with vowels that are not protected are Uzbek words.
  assert.equal(toCyrillic('OLMA', cfg), 'ОЛМА')
})

test('opt-out: lang="en", translate="no" and class notranslate keep their contents', () => {
  const html = '<p>shahar</p><blockquote lang="en"><p>Share this with <em>your</em> team</p></blockquote><p>choy</p>' +
    '<p lang="en-US" title="Title">Hello</p><p translate="no">sharh</p><div class="x notranslate"><div>shahar</div><img alt="shahar"></div><p>shahar</p>' +
    '<p lang="uz">shahar</p><p data-lang="en">shahar</p><img lang="en" alt="Shop"><p>choy</p>'
  assert.equal(transliterateHtml(html, 'cyrl', cfg),
    '<p>шаҳар</p><blockquote lang="en"><p>Share this with <em>your</em> team</p></blockquote><p>чой</p>' +
    '<p lang="en-US" title="Title">Hello</p><p translate="no">sharh</p><div class="x notranslate"><div>shahar</div><img alt="shahar"></div><p>шаҳар</p>' +
    '<p lang="uz">шаҳар</p><p data-lang="en">шаҳар</p><img lang="en" alt="Shop"><p>чой</p>')
  assert.equal(transliterateHtml('<em lang="en">Shopping</em> shahar', 'yangi', cfg), '<em lang="en">Shopping</em> şahar')
})

// ---- Micro-fix B1/B2 ----
test('B1: common vowel acronyms stay Latin on Cyrillic pages', () => {
  assert.equal(toCyrillic('FAQ, SERP, UTM, JSON va ID', cfg), 'FAQ, SERP, UTM, JSON ва ID')
  const more = ['IP', 'ERP', 'USP', 'OKR', 'IELTS', 'AMP', 'OTP', 'SEM', 'ROMI', 'AOV', 'MAU', 'DAU', 'LTV', 'CAC', 'CPL', 'CTA', 'SLA', 'API', 'PNG', 'JPG', 'SVG', 'CSV', 'PDF', 'USD', 'UZS', 'EEAT', 'PPC', 'SMS', 'QR', 'NDA', 'MVP', 'CEO', 'CMO', 'CTO', 'HR', 'PR', 'AI', 'UI', 'UX']
  for (const a of more) assert.equal(toCyrillic(`${a} kerak`, cfg), `${a} керак`, a)
  assert.equal(toCyrillic('E-E-A-T mezoni', cfg), 'E-E-A-T мезони')
  assert.equal(toNewLatin('E-E-A-T mezoni', cfg), 'E-E-A-T mezoni')
  assert.equal(toCyrillic('Bu JUDA muhim', cfg), 'Бу ЖУДА муҳим')
})

test('B2: single capital letters transliterate', () => {
  assert.equal(toCyrillic('M. Karimov', cfg), 'М. Каримов')
  assert.equal(toCyrillic("J. Usmonov", cfg), 'Ж. Усмонов')
  assert.equal(toCyrillic('B, V, G variantlar', cfg), 'Б, В, Г вариантлар')
  assert.equal(toCyrillic('BMT va TV hamda X5 va WWF', cfg), 'BMT ва TV ҳамда X5 ва WWF')
})

// Source, brand and product names keep their original spelling on Cyrillic / new-Latin pages.
const ext = (href: string, text: string) => `<p><a href="${href}" target="_blank">${text}</a></p>`

test('names: a brand starts a run of capitalized names (Google Skillshop, Meta Ads Manager)', () => {
  assert.equal(toCyrillic('Google Skillshop kursi', cfg), 'Google Skillshop курси');
  assert.equal(toCyrillic('Meta Blueprint va Meta Ads Manager’dagi hisobot', cfg), 'Meta Blueprint ва Meta Ads Manager’даги ҳисобот');
  assert.equal(toCyrillic('Yandex Metrika va Google Sheets jadvali', cfg), 'Yandex Metrika ва Google Sheets жадвали');
  assert.equal(toCyrillic('HubSpot Academy, Semrush Academy', cfg), 'HubSpot Academy, Semrush Academy');
  assert.equal(toCyrillic('Claude Desktop’da ishlaydi', cfg), 'Claude Desktop’да ишлайди');
  assert.equal(toNewLatin('Google Skillshop kursi', cfg), 'Google Skillshop kursi');
});

test('names: English joiners inside a name run (Principles of Marketing, Introduction to Marketing)', () => {
  assert.equal(toCyrillic('Principles of Marketing darsligi', cfg), 'Principles of Marketing дарслиги');
  assert.equal(toCyrillic("Coursera'dagi Introduction to Marketing kursi", cfg), "Coursera'даги Introduction to Marketing курси");
  assert.equal(toCyrillic('FTC’ning Advertising and Marketing Basics qo‘llanmasi', cfg), 'FTC’нинг Advertising and Marketing Basics қўлланмаси');
  assert.equal(toCyrillic('Rice University bilan', cfg), 'Rice University билан');
});

test('names: a run does not swallow Uzbek words after a brand', () => {
  assert.equal(toCyrillic('Instagram O‘zbekistonda mashhur', cfg), 'Instagram Ўзбекистонда машҳур');
  assert.equal(toCyrillic('Google. Keyin Qidiruv', cfg), 'Google. Кейин Қидирув');
  assert.equal(toCyrillic('Google Ads yordam markazi', cfg), 'Google Ads ёрдам маркази');
  assert.equal(toCyrillic('Uzum Market kabi', cfg), 'Uzum Market каби');
});

test('names: authors, books and product terms from the posts stay Latin', () => {
  assert.equal(toCyrillic('Philip Kotler va Gary Armstrong', cfg), 'Philip Kotler ва Gary Armstrong');
  assert.equal(toCyrillic('Seth Godin — This Is Marketing.', cfg), 'Seth Godin — This Is Marketing.');
  assert.equal(toCyrillic('Robert Cialdini — Influence.', cfg), 'Robert Cialdini — Influence.');
  assert.equal(toCyrillic('Pro, Max, Team va Enterprise', cfg), 'Pro, Max, Team ва Enterprise');
  assert.equal(toCyrillic('Customize → Skills → Create skill → Upload a skill yo‘li', cfg), 'Customize → Skills → Create skill → Upload a skill йўли');
  assert.equal(toCyrillic('Black Friday, Bitrix24, amoCRM, MIT litsenziyasi, ZIP fayl', cfg), 'Black Friday, Bitrix24, amoCRM, MIT лицензияси, ZIP файл');
  assert.equal(toCyrillic('(engagement rate, ER) va (reach)', cfg), '(engagement rate, ER) ва (reach)');
  assert.equal(toCyrillic('search engine optimization', cfg), 'search engine optimization');
});

test('names: metrika is an Uzbek word; only Yandex Metrika stays Latin', () => {
  assert.equal(toCyrillic('Metrikalarning ro‘yxati, metrika', cfg), 'Метрикаларнинг рўйхати, метрика');
});

test('names: Name + apostrophe + suffix keeps the name, Uzbek stems lose the apostrophe', () => {
  assert.equal(toCyrillic('Corey Haines’ning to‘plami', cfg), 'Corey Haines’нинг тўплами');
  assert.equal(toCyrillic('Market’da', cfg), 'Market’да');
  assert.equal(toCyrillic("Najot Ta'lim'ning kursi", cfg), 'Нажот Таълимнинг курси');
  assert.equal(toCyrillic("bog'da, Do‘konda, ma’lumot", cfg), 'боғда, Дўконда, маълумот');
});

test('names: AQSh is an Uzbek abbreviation, digital gets its Cyrillic spelling', () => {
  assert.equal(toCyrillic('AQSh va Digital marketing', cfg), 'АҚШ ва Диджитал маркетинг');
});

test('names: capitalized title in an external link stays as the source wrote it', () => {
  assert.equal(
    transliterateHtml(ext('https://datareportal.com/x', 'Digital 2026: Uzbekistan hisoboti'), 'cyrl', cfg),
    ext('https://datareportal.com/x', 'Digital 2026: Uzbekistan ҳисоботи'),
  );
  assert.equal(
    transliterateHtml(ext('https://nps.bain.com/', 'Bain &amp; Company'), 'cyrl', cfg),
    ext('https://nps.bain.com/', 'Bain &amp; Company'),
  );
  assert.equal(
    transliterateHtml(ext('https://najottalim.uz/', "Najot Ta'lim'ning SMM Pro kursi"), 'cyrl', cfg),
    ext('https://najottalim.uz/', "Najot Ta'lim'нинг SMM Pro курси"),
  );
  assert.equal(
    transliterateHtml(ext('https://lex.uz/x', '«Reklama to’g’risida»gi Qonun'), 'cyrl', cfg),
    ext('https://lex.uz/x', '«Реклама тўғрисида»ги Қонун'),
  );
  // Internal links are ordinary text.
  assert.equal(
    transliterateHtml('<a href="/kirill/seo/">Digital 2026: Hisobot</a>', 'cyrl', cfg),
    '<a href="/kirill/seo/">Диджитал 2026: Ҳисобот</a>',
  );
});
