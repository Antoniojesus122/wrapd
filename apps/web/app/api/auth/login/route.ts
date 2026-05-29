/**
 * GET /api/auth/login
 *
 * Genera un state aleatorio (CSRF), lo guarda en cookie temporal y redirige a Spotify.
 *
 * Query opcional:
 *   ?force=1  → fuerza la pantalla de consentimiento de Spotify
 *               (úsalo cuando añades scopes nuevos para que el usuario los acepte)
 */
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { buildAuthorizeUrl } from '@/lib/spotify'

const STATE_COOKIE = 'wrapd_oauth_state'
const STATE_MAX_AGE = 60 * 10 // 10 min

function randomState(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function GET(req: NextRequest) {
  const state = randomState()
  const forceConsent = req.nextUrl.searchParams.get('force') === '1'

  const c = await cookies()
  c.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: STATE_MAX_AGE,
  })
  return NextResponse.redirect(buildAuthorizeUrl(state, forceConsent))
}
