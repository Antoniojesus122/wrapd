/**
 * Sesiones JWT firmadas con HS256 + cookies httpOnly.
 * No usamos NextAuth para mantener control total y mínima dependencia.
 */
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { env } from './env'

const COOKIE_NAME = 'wrapd_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 días

export interface SessionData {
  userId: string // Spotify user id
}

function secret() {
  return new TextEncoder().encode(env.auth.secret)
}

export async function signSession(data: SessionData): Promise<string> {
  return new SignJWT({ uid: data.userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret())
}

export async function verifySession(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, secret())
    if (typeof payload.uid !== 'string') return null
    return { userId: payload.uid }
  } catch {
    return null
  }
}

export async function setSessionCookie(data: SessionData) {
  const token = await signSession(data)
  const c = await cookies()
  c.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  })
}

export async function clearSessionCookie() {
  const c = await cookies()
  c.delete(COOKIE_NAME)
}

export async function getSession(): Promise<SessionData | null> {
  const c = await cookies()
  const token = c.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifySession(token)
}
