/**
 * Build an absolute URL using the actual host header of the request.
 * Avoids Next.js normalising req.url to `localhost` in dev when bound to 127.0.0.1.
 */
import type { NextRequest } from 'next/server'

export function absoluteUrl(req: NextRequest | Request, path: string): URL {
  const headers = req.headers
  const host = headers.get('host') ?? '127.0.0.1:3000'
  const proto =
    headers.get('x-forwarded-proto') ??
    (host.startsWith('127.0.0.1') || host.startsWith('localhost') ? 'http' : 'https')
  return new URL(path, `${proto}://${host}`)
}
