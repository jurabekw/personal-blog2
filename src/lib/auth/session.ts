/**
 * Session token helpers (no DB access) — shared by proxy.ts and server code.
 */
import { jwtVerify, SignJWT } from 'jose'

export const SESSION_COOKIE = 'jb_session'
export const SESSION_DAYS = 14

export interface SessionPayload {
  uid: number
  ver: number
  role: string
}

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 16) {
    throw new Error('AUTH_SECRET is missing or too short (min 16 characters). Set it in your environment variables.')
  }
  return new TextEncoder().encode(secret)
}

export function isAuthConfigured(): boolean {
  return Boolean(process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 16)
}

export async function signSession(payload: SessionPayload, days = SESSION_DAYS): Promise<string> {
  return new SignJWT({ ver: payload.ver, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(payload.uid))
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(secretKey())
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token || !isAuthConfigured()) return null
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] })
    const uid = Number(payload.sub)
    if (!Number.isInteger(uid) || uid <= 0) return null
    return { uid, ver: Number(payload.ver) || 0, role: String(payload.role || '') }
  } catch {
    return null
  }
}
