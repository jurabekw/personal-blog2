import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replaceVars } from '../src/lib/seo/templates'
import { analyzeReadability, analyzeSeo, titleWidth, ratingFromScore } from '../src/lib/seo/analysis'

test('Yoast variables render like WordPress', () => {
  const ctx = { title: 'Marketing nima?', sitename: 'Jurabek', sitedesc: 'Blog', sep: '-' }
  assert.equal(replaceVars('%%title%% %%page%% %%sep%% %%sitename%%', ctx), 'Marketing nima? - Jurabek')
  assert.equal(replaceVars('%%title%% %%page%% %%sep%% %%sitename%%', { ...ctx, page: 2, pageTotal: 5 }), 'Marketing nima? Sahifa 2 / 5 - Jurabek')
  assert.equal(replaceVars('%%sitename%% %%sep%% %%sitedesc%%', { ...ctx, sitedesc: '' }), 'Jurabek')
  assert.equal(replaceVars('%%unknown%% %%title%%', ctx), 'Marketing nima?')
  assert.equal(replaceVars('%%term_title%% %%sep%% %%sitename%%', { ...ctx, termTitle: 'Target', sep: '|' }), 'Target | Jurabek')
})

const longText = (kp: string) => {
  const para = (i: number) => `<p>Bu ${i}-paragraf. ${kp.charAt(0).toUpperCase() + kp.slice(1)}ni tushunish muhim, chunki natija shunga bog‘liq. Masalan, kichik biznes ham foyda ko‘radi. Shuning uchun reja tuzing.</p>`
  return `<p>${kp.charAt(0).toUpperCase() + kp.slice(1)} haqida qisqa kirish: bu maqolada ${kp} nimaligini ko‘ramiz.</p>` +
    Array.from({ length: 14 }, (_, i) => (i % 4 === 0 ? `<h2>${i === 0 ? 'Marketing nima' : 'Boshqa bo‘lim ' + i}</h2>` : '') + para(i)).join('') +
    `<p><a href="/blog/">Blog</a> va <a href="https://example.com">manba</a>.</p><img src="/uploads/x.jpg" alt="${kp} rasmi">`
}

test('SEO analysis rewards a well-optimised Uzbek post (stem-tolerant matching)', () => {
  const res = analyzeSeo({
    html: longText('marketing nima'),
    title: 'Marketing nima',
    seoTitle: 'Marketing nima va biznesga nima uchun kerak? - Jurabek',
    metaDescription: 'Marketing nima va biznesga nima uchun kerak? Oddiy tilda tushuntirish, misollar va amaliy maslahatlar bilan to‘liq qo‘llanma kichik biznes uchun.',
    metaDescriptionIsCustom: true,
    slug: 'marketing-nima-va-nima-uchun-kerak',
    keyphrase: 'marketing nima',
    siteHost: 'www.jurabek.blog',
  })
  const by = Object.fromEntries(res.checks.map((c) => [c.id, c.rating]))
  assert.equal(by.titleKeyphrase, 'good')
  assert.equal(by.intro, 'good')
  assert.equal(by.slug, 'good')
  assert.equal(by.metaKeyphrase, 'good')
  assert.equal(by.internal, 'good')
  assert.equal(by.outbound, 'good')
  assert.equal(by.imageKeyphrase, 'good')
  assert.equal(by.textLength, 'good')
  assert.equal(res.rating, 'good', JSON.stringify(res.checks.filter((c) => c.rating !== 'good')))
})

test('SEO analysis flags problems and missing keyphrase', () => {
  const none = analyzeSeo({ html: '<p>Qisqa.</p>', title: 'X', seoTitle: 'X - Jurabek', metaDescription: '', metaDescriptionIsCustom: false, slug: 'x', keyphrase: '', siteHost: 'a.com' })
  assert.equal(none.rating, 'na')
  assert.ok(none.checks.some((c) => c.id === 'keyphrase' && c.rating === 'bad'))
  const bad = analyzeSeo({ html: '<h1>Big</h1><p>Hech narsa yo‘q.</p>', title: 'X', seoTitle: 'Boshqa narsa', metaDescription: 'Tavsif', metaDescriptionIsCustom: true, slug: 'boshqa', keyphrase: 'target reklama', siteHost: 'a.com', keyphraseUsedElsewhere: 2 })
  const by = Object.fromEntries(bad.checks.map((c) => [c.id, c.rating]))
  assert.equal(by.singleH1, 'bad')
  assert.equal(by.titleKeyphrase, 'bad')
  assert.equal(by.usedBefore, 'bad')
  assert.equal(by.density, 'bad')
  assert.equal(bad.rating, 'bad')
})

test('readability: transition words (uz), long sentences, consecutive starts', () => {
  const good = analyzeReadability({ html: Array.from({ length: 12 }, () => '<p>Marketing muhim. Chunki u mijozni tushunadi. Shuning uchun reja kerak. Masalan, kichik do‘kon ham foyda oladi.</p>').join('') })
  assert.equal(good.checks.find((c) => c.id === 'transitions')?.rating, 'good')
  const long = analyzeReadability({ html: '<p>' + Array.from({ length: 6 }, () => 'Men ' + 'juda '.repeat(25) + 'uzun gap yozdim.').join(' ') + '</p>' })
  assert.equal(long.checks.find((c) => c.id === 'sentenceLength')?.rating, 'bad')
  assert.equal(long.checks.find((c) => c.id === 'consecutive')?.rating, 'bad')
})

test('title width and score ratings', () => {
  assert.ok(titleWidth('Marketing nima - Jurabek') < 300)
  assert.ok(titleWidth('M'.repeat(60)) > 600)
  assert.equal(ratingFromScore(80), 'good')
  assert.equal(ratingFromScore(60), 'ok')
  assert.equal(ratingFromScore(20), 'bad')
  assert.equal(ratingFromScore(null), 'na')
})
