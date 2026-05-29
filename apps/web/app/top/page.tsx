import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { query } from '@/lib/db'
import { BottomNav } from '@/components/BottomNav'
import { PeriodTabs, parsePeriod, type Period } from '@/components/PeriodTabs'
import { AlbumArt } from '@/components/AlbumArt'

interface TopArtist {
  artist_id: string
  artist_name: string
  artist_image_url: string | null
  genres: string[] | null
  play_count: number
  rank: number
}

interface TopTrack {
  track_id: string
  track_name: string
  album_name: string | null
  album_image_url: string | null
  artist_id: string
  artist_name: string
  play_count: number
  total_ms: string | number
  rank: number
}

type View = 'artists' | 'tracks'

function parseView(value?: string | null): View {
  return value === 'tracks' ? 'tracks' : 'artists'
}

const PERIOD_LABEL: Record<Period, string> = {
  '1d': 'últimas 24h',
  '7d': 'última semana',
  '30d': 'último mes',
  '1y': 'último año',
}

export default async function TopPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; view?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/')

  const sp = await searchParams
  const period = parsePeriod(sp.period)
  const view = parseView(sp.view)

  const limit = 30

  let artists: TopArtist[] = []
  let tracks: TopTrack[] = []
  try {
    if (view === 'artists') {
      artists = await query<TopArtist>(
        `SELECT * FROM marts.top_artists_by_period
          WHERE user_id = $1 AND period = $2
          ORDER BY rank
          LIMIT $3`,
        [session.userId, period, limit]
      )
    } else {
      tracks = await query<TopTrack>(
        `SELECT * FROM marts.top_tracks_by_period
          WHERE user_id = $1 AND period = $2
          ORDER BY rank
          LIMIT $3`,
        [session.userId, period, limit]
      )
    }
  } catch (e) {
    // marts views may not be applied yet — render empty state instead of crashing
    console.error('[top] query failed', e)
  }

  const isEmpty = view === 'artists' ? artists.length === 0 : tracks.length === 0
  const baseHrefView = view === 'artists' ? '/top' : '/top?view=tracks'

  return (
    <main className="min-h-screen px-6 pt-12 pb-32 max-w-md mx-auto relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/home" className="font-mono text-[11px] text-text-mute hover:text-text-dim">
          ← back
        </Link>
        <span className="font-extrabold text-xl tracking-tighter">
          <span
            style={{
              background: 'linear-gradient(135deg, var(--color-magenta), var(--color-cyan))',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            wrapd
          </span>
          <span className="text-magenta">.</span>
        </span>
        <div className="w-12" />
      </div>

      {/* Title */}
      <div className="font-mono text-[11px] text-text-mute uppercase tracking-widest mb-1">
        tus tops · {PERIOD_LABEL[period]}
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-6">
        Top <span className="text-magenta">{view === 'artists' ? 'artistas' : 'tracks'}</span>
      </h1>

      {/* View toggle */}
      <div className="flex gap-2 mb-4">
        <Link
          href={`/top${sp.period ? `?period=${period}` : ''}`}
          className={`flex-1 text-center py-2.5 rounded-xl border text-sm font-medium transition-colors ${
            view === 'artists'
              ? 'bg-surface border-magenta text-text'
              : 'bg-transparent border-border text-text-dim hover:text-text'
          }`}
        >
          Artistas
        </Link>
        <Link
          href={`/top?view=tracks${sp.period ? `&period=${period}` : ''}`}
          className={`flex-1 text-center py-2.5 rounded-xl border text-sm font-medium transition-colors ${
            view === 'tracks'
              ? 'bg-surface border-magenta text-text'
              : 'bg-transparent border-border text-text-dim hover:text-text'
          }`}
        >
          Tracks
        </Link>
      </div>

      <PeriodTabs active={period} baseHref={baseHrefView} />

      {/* Empty state */}
      {isEmpty && (
        <div className="bg-surface border border-dashed border-border-strong rounded-2xl p-6 text-center mt-4">
          <div className="font-mono text-[10px] text-magenta uppercase tracking-widest mb-2">
            sin datos · todavía
          </div>
          <p className="text-text-dim leading-relaxed text-sm">
            Aún no hay plays para este período. En cuanto arranquemos la ingesta,
            verás aquí tus top {view === 'artists' ? 'artistas' : 'tracks'} en tiempo real.
          </p>
          <p className="font-mono text-[10px] text-text-mute mt-3">
            user_id · {session.userId}
          </p>
        </div>
      )}

      {/* Real list */}
      {!isEmpty && view === 'artists' && (
        <ul className="space-y-3.5">
          {artists.map((a, i) => {
            const max = artists[0].play_count
            const pct = Math.round((a.play_count / max) * 100)
            return (
              <li key={a.artist_id} className="flex items-center gap-3.5">
                <span
                  className={`font-mono w-7 font-semibold ${
                    i === 0 ? 'text-magenta text-[22px]' :
                    i === 1 ? 'text-cyan text-[18px]' :
                    i === 2 ? 'text-gold text-[18px]' :
                    'text-text-mute text-[18px]'
                  }`}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <AlbumArt url={a.artist_image_url} seed={a.artist_id} size={52} rounded="md" />
                <div className="flex-1 min-w-0">
                  <div className="text-text font-semibold truncate">{a.artist_name}</div>
                  <div className="text-text-dim text-[12px] truncate">
                    {a.play_count} plays
                    {a.genres && a.genres.length > 0 && (
                      <>
                        {' · '}
                        <span className="text-text-mute">{a.genres.slice(0, 2).join(' / ')}</span>
                      </>
                    )}
                  </div>
                  <div className="mt-1.5 h-1 bg-border rounded-full overflow-hidden w-[70px]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background:
                          'linear-gradient(90deg, var(--color-magenta), var(--color-cyan))',
                      }}
                    />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {!isEmpty && view === 'tracks' && (
        <ul className="space-y-3.5">
          {tracks.map((t, i) => {
            const max = Number(tracks[0].play_count)
            const pct = Math.round((t.play_count / max) * 100)
            return (
              <li key={t.track_id} className="flex items-center gap-3.5">
                <span
                  className={`font-mono w-7 font-semibold ${
                    i === 0 ? 'text-magenta text-[22px]' :
                    i === 1 ? 'text-cyan text-[18px]' :
                    i === 2 ? 'text-gold text-[18px]' :
                    'text-text-mute text-[18px]'
                  }`}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <AlbumArt url={t.album_image_url} seed={t.track_id} size={52} rounded="md" />
                <div className="flex-1 min-w-0">
                  <div className="text-text font-semibold truncate">{t.track_name}</div>
                  <div className="text-text-dim text-[12px] truncate">
                    {t.artist_name} · {t.play_count} plays
                  </div>
                  <div className="mt-1.5 h-1 bg-border rounded-full overflow-hidden w-[70px]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background:
                          'linear-gradient(90deg, var(--color-magenta), var(--color-cyan))',
                      }}
                    />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <BottomNav />
    </main>
  )
}
