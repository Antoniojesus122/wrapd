/**
 * Build an absolute URL using the actual host header of the request.
 * Avoids Next.js normalising req.url to `localhost` in dev when bound to 127.0.0.1.
 *
 * Robust against malformed host headers — falls back to 127.0.0.1:3000 if parsing fails.
 */
import type { NextRequest } from 'next/server'

const DEFAULT_HOST = '127.0.0.1:3000'
const HOST_REGEX = /^[a-zA-Z0-9.\-]+(:\d+)?$/

export function absoluteUrl(req: NextRequest | Request, path: string): URL {
  const headers = req.headers
  let host = headers.get('host')?.trim() ?? DEFAULT_HOST
  if (!HOST_REGEX.test(host)) {
    console.warn('[url] malformed host header, falling back', { host })
    host = DEFAULT_HOST
  }
  const proto =
    headers.get('x-forwarded-proto') ??
    (host.startsWith('127.0.0.1') || host.startsWith('localhost') ? 'http' : 'https')

  try {
    return new URL(path, `${proto}://${host}`)
  } catch (e) {
    console.error('[url] new URL failed, falling back', { host, path, error: String(e) })
    return new URL(path, `http://${DEFAULT_HOST}`)
  }
}
