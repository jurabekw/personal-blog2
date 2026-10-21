import 'server-only'
import postgres from 'postgres'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

type DB = PostgresJsDatabase<typeof schema>

const globalForDb = globalThis as unknown as { __jbSql?: postgres.Sql; __jbDb?: DB }

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL)
}

function createClient(): postgres.Sql {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Add a Postgres connection string in your environment variables (see .env.example).',
    )
  }
  const local = /@(localhost|127\.0\.0\.1)(:|\/)/.test(url) || url.includes('host=/')
  return postgres(url, {
    // Transaction poolers (Supabase, PgBouncer, Neon pooled) don't support prepared statements.
    prepare: false,
    max: process.env.VERCEL ? 5 : 10,
    idle_timeout: 20,
    connect_timeout: 15,
    ssl: local || /sslmode=disable/.test(url) ? false : url.includes('sslmode=') ? undefined : 'require',
    onnotice: () => {},
  })
}

/** Shared Drizzle instance (reused across hot reloads and warm serverless invocations). */
export function getDb(): DB {
  if (!globalForDb.__jbDb) {
    globalForDb.__jbSql = globalForDb.__jbSql ?? createClient()
    globalForDb.__jbDb = drizzle(globalForDb.__jbSql, { schema })
  }
  return globalForDb.__jbDb
}

export { schema }
