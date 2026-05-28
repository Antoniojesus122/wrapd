/**
 * Centralised environment variable access.
 * Lazy — variables are validated when accessed, not at import time,
 * so `next build` works even before .env.local is populated.
 */

function required(name: string): string {
  const v = process.env[name]
  if (!v) {
    throw new Error(
      `[env] Missing required environment variable: ${name}. ` +
        `Set it in apps/web/.env.local (see .env.example).`
    )
  }
  return v
}

export const env = {
  spotify: {
    get clientId() {
      return required('SPOTIFY_CLIENT_ID')
    },
    get clientSecret() {
      return required('SPOTIFY_CLIENT_SECRET')
    },
    get redirectUri() {
      return required('SPOTIFY_REDIRECT_URI')
    },
    scopes: [
      'user-read-recently-played',
      'user-read-currently-playing',
      'user-read-email',
      'user-read-private',
    ].join(' '),
  },
  auth: {
    get secret() {
      return required('AUTH_SECRET')
    },
  },
  postgres: {
    get url() {
      return required('POSTGRES_URL')
    },
  },
}
