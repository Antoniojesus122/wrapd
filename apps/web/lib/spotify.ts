/**
 * Spotify OAuth + REST client helpers (server-side only).
 *
 * Flow: Authorization Code (sin PKCE — usamos client_secret server-side).
 *   1. /api/auth/login → genera state, redirige a accounts.spotify.com/authorize
 *   2. Usuario aprueba → Spotify redirige a /api/auth/callback/spotify?code=...&state=...
 *   3. Intercambiamos code por access + refresh tokens, los guardamos en raw.tokens,
 *      creamos/actualizamos raw.users y emitimos cookie de sesión.
 */
import { env } from './env'

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize'
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'

export interface SpotifyTokens {
  access_token: string
  refresh_token: string
  expires_in: number // seconds
  scope: string
  token_type: string
}

export interface SpotifyUser {
  id: string
  display_name: string | null
  email: string | null
  country: string | null
  product: string | null
  images: Array<{ url: string }>
}

/** Build authorization URL with state for CSRF protection. */
export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.spotify.clientId,
    response_type: 'code',
    redirect_uri: env.spotify.redirectUri,
    scope: env.spotify.scopes,
    state,
    show_dialog: 'false',
  })
  return `${SPOTIFY_AUTH_URL}?${params.toString()}`
}

/** Exchange the authorization code for tokens. */
export async function exchangeCodeForTokens(code: string): Promise<SpotifyTokens> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: env.spotify.redirectUri,
  })

  const credentials = Buffer.from(
    `${env.spotify.clientId}:${env.spotify.clientSecret}`
  ).toString('base64')

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`[spotify] token exchange failed: ${res.status} ${text}`)
  }
  return (await res.json()) as SpotifyTokens
}

/** Fetch the current user's profile. */
export async function fetchSpotifyProfile(accessToken: string): Promise<SpotifyUser> {
  const res = await fetch(`${SPOTIFY_API_BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text()
    console.error('[spotify] /me failed', {
      status: res.status,
      statusText: res.statusText,
      body: text,
      headers: Object.fromEntries(res.headers.entries()),
    })
    throw new Error(`[spotify] /me failed: ${res.status} ${text.slice(0, 400)}`)
  }
  return (await res.json()) as SpotifyUser
}
