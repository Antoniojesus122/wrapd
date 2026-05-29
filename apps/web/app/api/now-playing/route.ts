/**
 * GET /api/now-playing
 * Devuelve el track que está sonando ahora mismo, o 204 si nada.
 */
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { fetchCurrentlyPlaying } from '@/lib/spotify-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    const data = await fetchCurrentlyPlaying(session.userId)
    if (!data) return new NextResponse(null, { status: 204 })
    return NextResponse.json(data)
  } catch (e) {
    console.error('[now-playing] failed', e)
    const msg = e instanceof Error ? e.message : 'unknown'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
