/**
 * GET /api/auth/callback/spotify?code=...&state=...
 *
 * 1. Verifica que `state` coincide con la cookie temporal (CSRF).
 * 2. Intercambia el code por tokens.
 * 3. Obtiene el perfil del usuario.
 * 4. UPSERT en raw.users + raw.tokens.
 * 5. Emite la cookie de sesión (JWT firmado) y redirige a /home.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { exchangeCodeForTokens, fetchSpotifyProfile } from '@/lib/spotify'
import { pool } from '@/lib/db'
import { setSessionCookie } from '@/lib/session'
import { absoluteUrl } from '@/lib/url'

const STATE_COOKIE = 'wrapd_oauth_state'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  if (error) {
    return NextResponse.redirect(absoluteUrl(req, `/?error=${encodeURIComponent(error)}`))
  }
  if (!code || !state) {
    return NextResponse.redirect(absoluteUrl(req, '/?error=missing_code_or_state'))
  }

  // Verify CSRF state
  const c = await cookies()
  const cookieState = c.get(STATE_COOKIE)?.value
  c.delete(STATE_COOKIE)
  if (!cookieState || cookieState !== state) {
    return NextResponse.redirect(absoluteUrl(req, '/?error=state_mismatch'))
  }

  try {
    // Exchange code -> tokens
    const tokens = await exchangeCodeForTokens(code)
    // Fetch profile
    const profile = await fetchSpotifyProfile(tokens.access_token)
    const avatarUrl = profile.images?.[0]?.url ?? null

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    // UPSERT user + tokens in one transaction
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `INSERT INTO raw.users (id, display_name, email, avatar_url, country, product, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (id) DO UPDATE SET
           display_name = EXCLUDED.display_name,
           email        = EXCLUDED.email,
           avatar_url   = EXCLUDED.avatar_url,
           country      = EXCLUDED.country,
           product      = EXCLUDED.product,
           updated_at   = NOW()`,
        [
          profile.id,
          profile.display_name,
          profile.email,
          avatarUrl,
          profile.country,
          profile.product,
        ]
      )
      await client.query(
        `INSERT INTO raw.tokens (user_id, access_token, refresh_token, scope, expires_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           access_token  = EXCLUDED.access_token,
           refresh_token = EXCLUDED.refresh_token,
           scope         = EXCLUDED.scope,
           expires_at    = EXCLUDED.expires_at,
           updated_at    = NOW()`,
        [profile.id, tokens.access_token, tokens.refresh_token, tokens.scope, expiresAt]
      )
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }

    // Sign + set session cookie
    await setSessionCookie({ userId: profile.id })

    return NextResponse.redirect(absoluteUrl(req, '/home'))
  } catch (e) {
    console.error('[oauth] callback failed', e)
    const message = e instanceof Error ? e.message : 'unknown'
    return NextResponse.redirect(
      absoluteUrl(req, `/?error=${encodeURIComponent('oauth_failed:' + message.slice(0, 400))}`)
    )
  }
}
