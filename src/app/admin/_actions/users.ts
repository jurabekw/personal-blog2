'use server'

import bcrypt from 'bcryptjs'
import { asc, eq, sql } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { getDb, schema } from '@/lib/db'
import { hashPassword, requireUser, validatePassword } from '@/lib/auth'
import { SESSION_COOKIE, signSession } from '@/lib/auth/session'
import { sanitizePlain } from '@/lib/content/sanitize'
import type { ActionResult } from '@/lib/admin-types'

const { users } = schema
const ROLES = ['administrator', 'editor', 'author'] as const

export async function listUsers() {
  await requireUser('manage_users')
  const rows = await getDb().select().from(users).orderBy(asc(users.email))
  return rows.map((u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, lastLoginAt: u.lastLoginAt?.toISOString() ?? null, createdAt: u.createdAt.toISOString() }))
}

export async function createUser(input: { email: string; name: string; role: string; password: string }): Promise<ActionResult> {
  await requireUser('manage_users')
  const email = input.email.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'Enter a valid email.' }
  const pwError = validatePassword(input.password)
  if (pwError) return { ok: false, error: pwError }
  const role = ROLES.includes(input.role as (typeof ROLES)[number]) ? input.role : 'author'
  try {
    await getDb().insert(users).values({ email, name: sanitizePlain(input.name) || email, role, passwordHash: await hashPassword(input.password) })
  } catch {
    return { ok: false, error: 'A user with this email already exists.' }
  }
  return { ok: true, message: 'User added.' }
}

export async function updateUserRole(id: number, role: string): Promise<ActionResult> {
  const me = await requireUser('manage_users')
  if (!ROLES.includes(role as (typeof ROLES)[number])) return { ok: false, error: 'Invalid role.' }
  if (id === me.id && role !== 'administrator') return { ok: false, error: "You can't remove your own administrator role." }
  await getDb().update(users).set({ role, sessionVersion: sql`${users.sessionVersion} + 1` }).where(eq(users.id, id))
  return { ok: true, message: 'Role updated.' }
}

export async function deleteUser(id: number): Promise<ActionResult> {
  const me = await requireUser('manage_users')
  if (id === me.id) return { ok: false, error: "You can't delete yourself." }
  const db = getDb()
  const [{ admins }] = await db.select({ admins: sql<number>`count(*) filter (where ${users.role} = 'administrator')`.mapWith(Number) }).from(users)
  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  if (target?.role === 'administrator' && admins <= 1) return { ok: false, error: 'Keep at least one administrator.' }
  await db.delete(users).where(eq(users.id, id))
  return { ok: true, message: 'User deleted. Their posts were kept.' }
}

export async function resetUserPassword(id: number, password: string): Promise<ActionResult> {
  await requireUser('manage_users')
  const pwError = validatePassword(password)
  if (pwError) return { ok: false, error: pwError }
  await getDb()
    .update(users)
    .set({ passwordHash: await hashPassword(password), sessionVersion: sql`${users.sessionVersion} + 1`, failedLogins: 0, lockedUntil: null })
    .where(eq(users.id, id))
  return { ok: true, message: 'Password changed; the user was signed out everywhere.' }
}

async function reissue(userId: number) {
  const [u] = await getDb().select().from(users).where(eq(users.id, userId)).limit(1)
  if (!u) return
  const token = await signSession({ uid: u.id, ver: u.sessionVersion, role: u.role })
  ;(await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 14 * 24 * 3600 })
}

export async function updateProfile(input: { name: string; email: string; currentPassword: string; newPassword: string }): Promise<ActionResult> {
  const me = await requireUser()
  const db = getDb()
  const [u] = await db.select().from(users).where(eq(users.id, me.id)).limit(1)
  if (!u) return { ok: false, error: 'Not found.' }
  const email = input.email.trim().toLowerCase()
  const changes: Partial<typeof users.$inferInsert> = { name: sanitizePlain(input.name) || u.name }
  if (email !== u.email || input.newPassword) {
    if (!(await bcrypt.compare(input.currentPassword, u.passwordHash))) return { ok: false, error: 'Current password is incorrect.' }
  }
  if (email !== u.email) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'Enter a valid email.' }
    changes.email = email
  }
  if (input.newPassword) {
    const pwError = validatePassword(input.newPassword)
    if (pwError) return { ok: false, error: pwError }
    changes.passwordHash = await hashPassword(input.newPassword)
    changes.sessionVersion = u.sessionVersion + 1
  }
  try {
    await db.update(users).set(changes).where(eq(users.id, me.id))
  } catch {
    return { ok: false, error: 'That email is used by another account.' }
  }
  if (changes.sessionVersion) await reissue(me.id)
  return { ok: true, message: input.newPassword ? 'Profile and password updated. Other sessions were signed out.' : 'Profile updated.' }
}

export async function logoutEverywhere(): Promise<ActionResult> {
  const me = await requireUser()
  await getDb().update(users).set({ sessionVersion: sql`${users.sessionVersion} + 1` }).where(eq(users.id, me.id))
  await reissue(me.id)
  return { ok: true, message: 'All other sessions were signed out.' }
}
