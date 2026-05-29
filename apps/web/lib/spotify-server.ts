/**
 * Server-side Spotify client per user, con refresh de tokens contra Postgres.
 *
 * Lo usamos para endpoints que necesitan datos REAL-TIME (currently playing).
 * Para historial y tops batch, sigue siendo el worker Python.
 */
import { query } from '@/lib/db'
import { env } from '@/lib/env'

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'

interface TokenRow {
  access_token: string
  refresh_token: string
  expires_at: string
}

async function getAccessToken(userId: string): Promise<string> {
  const rows = await query<TokenRow>(
    `SELECT access_token, refresh_token, expires_at FROM raw.tokens WHERE user_id = $1`,
    [userId]
  )
  if (rows.length === 0) throw new Error(`No tokens for user ${userId}`)
  const tok = rows[0]
  const expiresAt = new Date(tok.expires_at).getTime()
  if (expiresAt - 60_000 > Date.now()) {
    return tok.access_token
  }
  // Refresh
  const credentials = Buffer.from(
    `${env.spotify.clientId}:${env.spotify.clientSecret}`
  ).toString('base64')
  const r = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tok.refresh_token,
    }),
    cache: 'no-store',
  })
  if (!r.ok) {
    const t = await r.text()
    throw new Error(`Token refresh failed: ${r.status} ${t.slice(0, 200)}`)
  }
  const data: {
    access_token: string
    expires_in: number
    refresh_token?: string
  } = await r.json()
  const newExpiresAt = new Date(Date.now() + data.expires_in * 1000)
  await query(
    `UPDATE raw.tokens
        SET access_token = $1,
            refresh_token = COALESCE($2, refresh_token),
            expires_at = $3,
            updated_at = NOW()
      WHERE user_id = $4`,
    [data.access_token, data.refresh_token ?? null, newExpiresAt, userId]
  )
  return data.access_token
}

/** GET /me/player/currently-playing → null si nada suena */
export async function fetchCurrentlyPlaying(userId: string): Promise<{
  isPlaying: boolean
  progressMs: number
  durationMs: number
  trackName: string
  artistName: string
  albumImageUrl: string | null
  trackUrl: string
} | null> {
  const token = await getAccessToken(userId)
  const r = await fetch(`${SPOTIFY_API_BASE}/me/player/currently-playing`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (r.status === 204) return null // no track playing
  if (!r.ok) {
    const t = await r.text()
    throw new Error(`/me/player/currently-playing failed: ${r.status} ${t.slice(0, 200)}`)
  }
  const data = await r.json()
  const item = data.item
  if (!item) return null
  return {
    isPlaying: !!data.is_playing,
    progressMs: data.progress_ms ?? 0,
    durationMs: item.duration_ms ?? 0,
    trackName: item.name,
    artistName: (item.artists ?? [])[0]?.name ?? '—',
    albumImageUrl: (item.album?.images ?? [{}])[0]?.url ?? null,
    trackUrl: item.external_urls?.spotify ?? '#',
  }
}
