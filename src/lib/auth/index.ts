import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { eq, sql } from 'drizzle-orm'
import { getDb, isDatabaseConfigured, schema } from '@/lib/db'
import { SESSION_COOKIE, SESSION_DAYS, signSession, verifySession } from './session'

export type Role = 'administrator' | 'editor' | 'author'

export interface CurrentUser {
  id: number
  email: string
  name: string
  role: Role
}

const MAX_FAILED = 5
const LOCK_MINUTES = 15

export const ROLE_LABELS: Record<Role, string> = {
  administrator: 'Administrator',
  editor: 'Editor',
  author: 'Author',
}

/** What each role may do (WordPress-like capabilities). */
export function can(user: CurrentUser | null, capability: 'manage_options' | 'edit_others' | 'publish' | 'manage_users' | 'upload'): boolean {
  if (!user) return false
  if (user.role === 'administrator') return true
  if (user.role === 'editor') return capability !== 'manage_options' && capability !== 'manage_users'
  return capability === 'publish' || capability === 'upload'
}

/** The signed-in user (verified against the database), or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!isDatabaseConfigured()) return null
  const jar = await cookies()
  const payload = await verifySession(jar.get(SESSION_COOKIE)?.value)
  if (!payload) return null
  const [user] = await getDb().select().from(schema.users).where(eq(schema.users.id, payload.uid)).limit(1)
  if (!user || user.sessionVersion !== payload.ver) return null
  return { id: user.id, email: user.email, name: user.name || user.email, role: (user.role as Role) || 'author' }
})

/** For admin pages and server actions: redirect to login when signed out. */
export async function requireUser(capability?: Parameters<typeof can>[1]): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login/')
  if (capability && !can(user, capability)) {
    throw new Error('You do not have permission to do that.')
  }
  return user
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export function validatePassword(password: string): string | null {
  if (password.length < 10) return 'Password must be at least 10 characters.'
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return 'Use letters and numbers in the password.'
  return null
}

/** Create the first administrator from ADMIN_EMAIL / ADMIN_PASSWORD when the users table is empty. */
async function bootstrapAdmin(email: string, password: string): Promise<boolean> {
  const envEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
  const envPassword = process.env.ADMIN_PASSWORD || ''
  if (!envEmail || !envPassword || email !== envEmail || password !== envPassword) return false
  const db = getDb()
  const [{ count }] = await db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(schema.users)
  if (count > 0) return false
  await db
    .insert(schema.users)
    .values({ email: envEmail, name: 'Jurabek', passwordHash: await hashPassword(envPassword), role: 'administrator' })
    .onConflictDoNothing()
  return true
}

export type LoginResult = { ok: true } | { ok: false; error: string }

export async function login(emailInput: string, password: string, remember: boolean): Promise<LoginResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'The database is not connected yet (DATABASE_URL).' }
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 16) {
    return { ok: false, error: 'AUTH_SECRET is not set. Add it to your environment variables.' }
  }
  const email = emailInput.trim().toLowerCase()
  const generic = { ok: false as const, error: 'Incorrect email or password.' }
  if (!email || !password) return generic

  const db = getDb()
  let [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1)
  if (!user && (await bootstrapAdmin(email, password))) {
    ;[user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1)
  }
  if (!user) {
    await bcrypt.compare(password, '$2b$12$cZAeMd9MZtGp4bfvQ2EAyeDiFHTRCjg/qCQ8l4xdGAq66oPFE78YS') // equalize timing
    return generic
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
    return { ok: false, error: `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.` }
  }
  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    const failed = user.failedLogins + 1
    await db
      .update(schema.users)
      .set({
        failedLogins: failed >= MAX_FAILED ? 0 : failed,
        lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60000) : null,
      })
      .where(eq(schema.users.id, user.id))
    return generic
  }

  await db
    .update(schema.users)
    .set({ failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() })
    .where(eq(schema.users.id, user.id))

  const token = await signSession({ uid: user.id, ver: user.sessionVersion, role: user.role }, SESSION_DAYS)
  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    ...(remember ? { maxAge: SESSION_DAYS * 24 * 60 * 60 } : {}),
  })
  return { ok: true }
}

export async function logout(): Promise<void> {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
}
