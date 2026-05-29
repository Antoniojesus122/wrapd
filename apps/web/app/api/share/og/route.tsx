/**
 * GET /api/share/og?period=30d&format=story
 *
 * Renderiza una share card como PNG con next/og.
 *
 * Query params:
 *   period: 1d | 7d | 30d | 1y    (default 30d)
 *   format: story | square | og    (default story)
 *
 *   story  = 1080 × 1920  (Instagram Stories, TikTok, Reels)
 *   square = 1080 × 1080  (Instagram feed)
 *   og     = 1200 ×  630  (Twitter / LinkedIn / link preview)
 *
 * Runtime: Node (necesitamos pg para leer Postgres).
 */
import { ImageResponse } from 'next/og'
import { type NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { buildShareData } from '@/lib/share-data'

// Force Node runtime (pg client doesn't run on edge)
export const runtime = 'nodejs'
// Don't cache between renders so it always reflects fresh data
export const dynamic = 'force-dynamic'

type Format = 'story' | 'square' | 'og'

const DIMENSIONS: Record<Format, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
  og: { width: 1200, height: 630 },
}

function parseFormat(value?: string | null): Format {
  if (value === 'square' || value === 'og') return value
  return 'story'
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  const sp = req.nextUrl.searchParams
  const format = parseFormat(sp.get('format'))
  const period = sp.get('period')
  const { width, height } = DIMENSIONS[format]

  const data = await buildShareData(session.userId, period)
  const isOg = format === 'og'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #ff2d92 0%, #6e00ff 50%, #00d4ff 100%)',
          color: 'white',
          padding: isOg ? 56 : 80,
          fontFamily: 'Inter, sans-serif',
          position: 'relative',
        }}
      >
        {/* Top sheen */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '60%',
            height: '60%',
            background:
              'radial-gradient(circle at 100% 0%, rgba(255,255,255,0.25), transparent 60%)',
            display: 'flex',
          }}
        />

        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          }}
        >
          <div
            style={{
              fontSize: isOg ? 44 : 64,
              fontWeight: 800,
              letterSpacing: '-0.04em',
              display: 'flex',
            }}
          >
            wrapd.
          </div>
          <div
            style={{
              fontSize: isOg ? 20 : 28,
              opacity: 0.85,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              display: 'flex',
            }}
          >
            {data.periodLabel}
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            marginTop: isOg ? 32 : 80,
            fontSize: isOg ? 60 : 96,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.04em',
            maxWidth: '90%',
            display: 'flex',
          }}
        >
          {data.headline}
        </div>

        {/* Stats grid */}
        <div
          style={{
            display: 'flex',
            gap: isOg ? 16 : 28,
            marginTop: isOg ? 28 : 64,
          }}
        >
          <Stat label="plays" value={data.totalPlays.toLocaleString('es-ES')} isOg={isOg} />
          <Stat label="tracks únicos" value={data.uniqueTracks.toLocaleString('es-ES')} isOg={isOg} />
          <Stat label="artistas" value={data.uniqueArtists.toLocaleString('es-ES')} isOg={isOg} />
        </div>

        {/* Top list */}
        {!isOg && data.topArtists.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              marginTop: 80,
              fontSize: 42,
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            <div style={{ opacity: 0.7, fontSize: 22, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 500, display: 'flex' }}>
              top artistas · {data.periodHuman}
            </div>
            {data.topArtists.map((a) => (
              <div key={a.rank} style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
                <span style={{ opacity: 0.6, minWidth: 56, display: 'flex' }}>
                  {String(a.rank).padStart(2, '0')}
                </span>
                <span style={{ display: 'flex' }}>{a.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Spacer */}
        <div style={{ flexGrow: 1, display: 'flex' }} />

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            fontSize: isOg ? 18 : 24,
            opacity: 0.75,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}
        >
          <div style={{ display: 'flex' }}>
            {data.displayName ?? '@you'}
          </div>
          <div style={{ display: 'flex' }}>wrapd.app</div>
        </div>
      </div>
    ),
    { width, height }
  )
}

function Stat({ label, value, isOg }: { label: string; value: string; isOg: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        background: 'rgba(255,255,255,0.14)',
        borderRadius: isOg ? 18 : 28,
        padding: isOg ? '18px 22px' : '28px 32px',
        flex: 1,
      }}
    >
      <div
        style={{
          fontSize: isOg ? 14 : 22,
          opacity: 0.85,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          display: 'flex',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: isOg ? 44 : 68,
          fontWeight: 800,
          letterSpacing: '-0.03em',
          display: 'flex',
        }}
      >
        {value}
      </div>
    </div>
  )
}
