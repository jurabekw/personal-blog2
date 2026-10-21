/**
 * Runs database migrations and the idempotent seed.
 * Executed automatically before `next build` (see package.json) and safe to run repeatedly.
 * When DATABASE_URL is missing it does nothing, so the build still succeeds.
 */
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Load .env / .env.local for local runs (Vercel injects env vars itself).
for (const file of ['.env', '.env.local']) {
  const full = path.join(root, file)
  if (!fs.existsSync(full)) continue
  for (const line of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m || process.env[m[1]]) continue
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const url = process.env.DATABASE_URL
if (!url) {
  console.log('[migrate] DATABASE_URL is not set — skipping migrations and seed.')
  process.exit(0)
}

const local = /@(localhost|127\.0\.0\.1)(:|\/)/.test(url) || url.includes('host=/')
const sql = postgres(url, {
  prepare: false,
  max: 1,
  ssl: local || /sslmode=disable/.test(url) ? false : url.includes('sslmode=') ? undefined : 'require',
  onnotice: () => {},
})

const ABOUT_HTML = [
  '<p>Ko‘p yillik tajribaga ega marketolog sifatida raqamli marketing, texnologiyalar va biznes rivojiga oid bilimlarimni shu blogda ulashib boraman. Bu yerda nazariyadan ko‘ra amaliy tajriba, real loyihalar va ishlaydigan yechimlarga ko‘proq e’tibor qarataman.</p>',
  '<h2>Nima bilan shug‘ullanaman</h2>',
  '<p>Raqamli marketing strategiyalarini ishlab chiqaman, reklama kampaniyalarini boshqaraman, veb-saytlar ustida ishlayman va AI instrumentlarini kundalik ish jarayonlariga integratsiya qilaman.</p>',
  '<p>Yondashuvim oddiy: avval ma’lumot va o‘lchov, keyin qaror. Men uchun chiroyli g‘oyadan ko‘ra, uning real natijasi muhim.</p>',
  '<h2>Bu blogda nimalar haqida yozaman</h2>',
  '<p>Bu blogda marketing va texnologiyaga oid amaliy kontent bilan bo‘lishaman:</p>',
  '<ul><li>real loyihalarda sinab ko‘rilgan marketing yondashuvlari;</li><li>AI instrumentlarining imkoniyatlari;</li><li>veb-sayt tezligi, konversiya va analitika bo‘yicha amaliy tavsiyalar;</li><li>shaxsiy tajriba, yo‘l qo‘yilgan xatolar va ulardan chiqarilgan xulosalar;</li><li>ish jarayonini samaraliroq qilish uchun foydali instrumentlar va yondashuvlar.</li></ul>',
  '<h2>Aloqa</h2>',
  '<p>Hamkorlik, loyiha yoki maslahat masalalari bo‘yicha telegram orqali bog‘lanishingiz mumkin.</p>',
].join('\n')

try {
  const db = drizzle(sql)
  await migrate(db, { migrationsFolder: path.join(root, 'drizzle') })
  console.log('[migrate] Migrations applied.')

  // Seed: first administrator from env (only when there are no users yet).
  const [{ count: userCount }] = await sql`select count(*)::int as count from users`
  if (userCount === 0) {
    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
    const password = process.env.ADMIN_PASSWORD || ''
    if (email && password) {
      const bcrypt = (await import('bcryptjs')).default
      const hash = await bcrypt.hash(password, 12)
      await sql`insert into users (email, name, password_hash, role) values (${email}, 'Jurabek', ${hash}, 'administrator')`
      console.log(`[migrate] Created administrator ${email}.`)
    } else {
      console.log('[migrate] No users yet. Set ADMIN_EMAIL and ADMIN_PASSWORD to create the first administrator.')
    }
  }

  // Seed: the "Men haqimda" page on a brand-new site (the WordPress importer will overwrite it).
  const [{ count: postCount }] = await sql`select count(*)::int as count from posts`
  if (postCount === 0) {
    await sql`
      insert into posts (type, status, title, slug, content, template, published_at)
      values ('page', 'publish', 'Men haqimda', 'men-haqimda', ${ABOUT_HTML}, 'about', now())
      on conflict (slug) do nothing`
    console.log('[migrate] Created the "Men haqimda" page.')
  }
} catch (error) {
  console.error('[migrate] Failed:', error)
  process.exitCode = 1
} finally {
  await sql.end({ timeout: 5 })
}
