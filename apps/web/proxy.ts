/**
 * Proxy (Next.js 16) — fuerza el host a 127.0.0.1 cuando el visitante
 * llega por `localhost`. Imprescindible en dev porque Spotify OAuth
 * sólo acepta 127.0.0.1 como redirect URI sin HTTPS, y las cookies
 * de sesión se guardan por dominio (localhost ≠ 127.0.0.1).
 */
import { NextResponse, type NextRequest } from 'next/server'

export function proxy(req: NextRequest) {
  const host = req.headers.get('host') ?? ''
  if (host.startsWith('localhost')) {
    const url = req.nextUrl.clone()
    const port = host.includes(':') ? host.split(':')[1] : '3000'
    url.host = '127.0.0.1'
    url.port = port
    return NextResponse.redirect(url, 308)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
