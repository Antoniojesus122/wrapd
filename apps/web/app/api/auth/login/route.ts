/**
 * GET /api/auth/login
 * Genera un state aleatorio (CSRF), lo guarda en cookie temporal y redirige a Spotify.
 */
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { buildAuthorizeUrl } from '@/lib/spotify'

const STATE_COOKIE = 'wrapd_oauth_state'
const STATE_MAX_AGE = 60 * 10 // 10 min

function randomState(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function GET() {
  const state = randomState()
  const c = await cookies()
  c.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: STATE_MAX_AGE,
  })
  return NextResponse.redirect(buildAuthorizeUrl(state))
}
