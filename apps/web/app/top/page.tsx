import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { query } from '@/lib/db'
import { BottomNav } from '@/components/BottomNav'
import { PeriodTabs, parsePeriod, type Period } from '@/components/PeriodTabs'
import { AlbumArt } from '@/components/AlbumArt'

// -- Types -----------------------------------------------------------------
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
  rank: number
}

interface SpotifyTopArtist {
  rank: number
  artist_id: string
  artist_name: string | null
  artist_image_url: string | null
  genres: string[] | null
  popularity: number | null
}

interface SpotifyTopTrack {
  rank: number
  track_id: string
  track_name: string | null
  album_name: string | null
  album_image_url: string | null
  artist_id: string | null
  artist_name: string | null
  energy: number | null
  valence: number | null
  danceability: number | null
}

type View = 'artists' | 'tracks'
type Source = 'plays' | 'spotify'
type SpotifyRange = 'short_term' | 'medium_term' | 'long_term'

function parseView(value?: string | null): View {
  return value === 'tracks' ? 'tracks' : 'artists'
}
function parseSource(value?: string | null): Source {
  return value === 'spotify' ? 'spotify' : 'plays'
}
function parseSpotifyRange(value?: string | null): SpotifyRange {
  return value === 'medium_term' || value === 'long_term' ? value : 'short_term'
}

const PERIOD_LABEL: Record<Period, string> = {
  '1d': 'últimas 24h',
  '7d': 'última semana',
  '30d': 'último mes',
  '1y': 'último año',
}
const RANGE_LABEL: Record<SpotifyRange, string> = {
  short_term: '4 semanas',
  medium_term: '6 meses',
  long_term: 'all time',
}
const RANGE_TABS: SpotifyRange[] = ['short_term', 'medium_term', 'long_term']
const RANGE_SHORT: Record<SpotifyRange, string> = {
  short_term: '4w',
  medium_term: '6m',
  long_term: 'all',
}

// --------------------------------------------------------------------------
export default async function TopPage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string
    view?: string
    source?: string
    range?: string
  }>
}) {
  const session = await getSession()
  if (!session) redirect('/')

  const sp = await searchParams
  const view = parseView(sp.view)
  const source = parseSource(sp.source)
  const period = parsePeriod(sp.period)
  const range = parseSpotifyRange(sp.range)

  const limit = 50
  let artists: TopArtist[] = []
  let tracks: TopTrack[] = []
  let spArtists: SpotifyTopArtist[] = []
  let spTracks: SpotifyTopTrack[] = []

  try {
    if (source === 'plays') {
      if (view === 'artists') {
        artists = await query<TopArtist>(
          `SELECT * FROM marts.top_artists_by_period
            WHERE user_id = $1 AND period = $2 ORDER BY rank LIMIT $3`,
          [session.userId, period, limit]
        )
      } else {
        tracks = await query<TopTrack>(
          `SELECT * FROM marts.top_tracks_by_period
            WHERE user_id = $1 AND period = $2 ORDER BY rank LIMIT $3`,
          [session.userId, period, limit]
        )
      }
    } else {
      if (view === 'artists') {
        spArtists = await query<SpotifyTopArtist>(
          `SELECT * FROM marts.top_artists_spotify
            WHERE user_id = $1 AND time_range = $2 ORDER BY rank LIMIT $3`,
          [session.userId, range, limit]
        )
      } else {
        spTracks = await query<SpotifyTopTrack>(
          `SELECT * FROM marts.top_tracks_spotify
            WHERE user_id = $1 AND time_range = $2 ORDER BY rank LIMIT $3`,
          [session.userId, range, limit]
        )
      }
    }
  } catch (e) {
    console.error('[top] query failed', e)
  }

  const isEmpty =
    source === 'plays'
      ? view === 'artists'
        ? artists.length === 0
        : tracks.length === 0
      : view === 'artists'
        ? spArtists.length === 0
        : spTracks.length === 0

  const baseHref =
    `/top?source=${source}` +
    (view === 'tracks' ? '&view=tracks' : '') +
    (source === 'spotify' ? `&range=${range}` : '')

  return (
    <main className="min-h-screen px-6 pt-12 pb-32 max-w-md mx-auto relative">
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

      <div className="font-mono text-[11px] text-text-mute uppercase tracking-widest mb-1">
        tus tops · {source === 'plays' ? PERIOD_LABEL[period] : `top spotify · ${RANGE_LABEL[range]}`}
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-5">
        Top <span className="text-magenta">{view === 'artists' ? 'artistas' : 'tracks'}</span>
      </h1>

      {/* SOURCE toggle */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Link
          href={`/top?source=plays${view === 'tracks' ? '&view=tracks' : ''}`}
          className={`text-center py-2.5 rounded-xl border text-sm font-medium transition-colors ${
            source === 'plays'
              ? 'bg-surface border-magenta text-text'
              : 'bg-transparent border-border text-text-dim hover:text-text'
          }`}
        >
          Mis plays
        </Link>
        <Link
          href={`/top?source=spotify${view === 'tracks' ? '&view=tracks' : ''}`}
          className={`text-center py-2.5 rounded-xl border text-sm font-medium transition-colors ${
            source === 'spotify'
              ? 'bg-surface border-cyan text-text'
              : 'bg-transparent border-border text-text-dim hover:text-text'
          }`}
        >
          Spotify Top
        </Link>
      </div>

      {/* VIEW toggle */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Link
          href={`/top?source=${source}${source === 'spotify' ? `&range=${range}` : ''}${sp.period ? `&period=${period}` : ''}`}
          className={`text-center py-2 rounded-lg border text-[13px] font-medium transition-colors ${
            view === 'artists' ? 'border-border-strong text-text' : 'border-border text-text-mute hover:text-text-dim'
          }`}
        >
          Artistas
        </Link>
        <Link
          href={`/top?source=${source}&view=tracks${source === 'spotify' ? `&range=${range}` : ''}${sp.period ? `&period=${period}` : ''}`}
          className={`text-center py-2 rounded-lg border text-[13px] font-medium transition-colors ${
            view === 'tracks' ? 'border-border-strong text-text' : 'border-border text-text-mute hover:text-text-dim'
          }`}
        >
          Tracks
        </Link>
      </div>

      {/* PERIOD or RANGE tabs */}
      {source === 'plays' ? (
        <PeriodTabs active={period} baseHref={baseHref} />
      ) : (
        <div className="flex gap-1 bg-surface rounded-full p-1 mb-6">
          {RANGE_TABS.map((r) => {
            const isActive = r === range
            const href = `/top?source=spotify&range=${r}${view === 'tracks' ? '&view=tracks' : ''}`
            return (
              <Link
                key={r}
                href={href}
                scroll={false}
                className={`flex-1 text-center py-2 font-mono text-[11px] font-medium rounded-full transition-colors ${
                  isActive ? 'bg-cyan text-bg' : 'text-text-mute hover:text-text-dim'
                }`}
              >
                {RANGE_SHORT[r]}
              </Link>
            )
          })}
        </div>
      )}

      {/* EMPTY */}
      {isEmpty && (
        <div className="bg-surface border border-dashed border-border-strong rounded-2xl p-6 text-center">
          <div className="font-mono text-[10px] text-magenta uppercase tracking-widest mb-2">
            sin datos · todavía
          </div>
          <p className="text-text-dim leading-relaxed text-sm">
            {source === 'spotify'
              ? 'Lanza el worker con --tops para traer tu top de Spotify (4 semanas / 6 meses / all time).'
              : 'Lanza el worker para ingestar plays.'}
          </p>
          <code className="block mt-3 font-mono text-[11px] text-cyan">
            {source === 'spotify'
              ? 'python -m wrapd_worker.flows --tops'
              : 'python -m wrapd_worker.flows'}
          </code>
        </div>
      )}

      {/* LIST · plays · artists */}
      {!isEmpty && source === 'plays' && view === 'artists' && (
        <ul className="space-y-3.5">
          {artists.map((a, i) => {
            const max = artists[0].play_count
            const pct = Math.round((a.play_count / max) * 100)
            return (
              <li key={a.artist_id} className="flex items-center gap-3.5">
                <RankBadge i={i} />
                <AlbumArt url={a.artist_image_url} seed={a.artist_id} size={52} rounded="md" />
                <div className="flex-1 min-w-0">
                  <div className="text-text font-semibold truncate">{a.artist_name}</div>
                  <div className="text-text-dim text-[12px] truncate">
                    {a.play_count} plays
                    {a.genres && a.genres.length > 0 && (
                      <> · <span className="text-text-mute">{a.genres.slice(0, 2).join(' / ')}</span></>
                    )}
                  </div>
                  <Bar pct={pct} />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* LIST · plays · tracks */}
      {!isEmpty && source === 'plays' && view === 'tracks' && (
        <ul className="space-y-3.5">
          {tracks.map((t, i) => {
            const max = Number(tracks[0].play_count)
            const pct = Math.round((t.play_count / max) * 100)
            return (
              <li key={t.track_id} className="flex items-center gap-3.5">
                <RankBadge i={i} />
                <AlbumArt url={t.album_image_url} seed={t.track_id} size={52} rounded="md" />
                <div className="flex-1 min-w-0">
                  <div className="text-text font-semibold truncate">{t.track_name}</div>
                  <div className="text-text-dim text-[12px] truncate">
                    {t.artist_name} · {t.play_count} plays
                  </div>
                  <Bar pct={pct} />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* LIST · spotify · artists */}
      {!isEmpty && source === 'spotify' && view === 'artists' && (
        <ul className="space-y-3.5">
          {spArtists.map((a, i) => (
            <li key={a.artist_id} className="flex items-center gap-3.5">
              <RankBadge i={i} variant="cyan" />
              <AlbumArt url={a.artist_image_url} seed={a.artist_id} size={52} rounded="md" />
              <div className="flex-1 min-w-0">
                <div className="text-text font-semibold truncate">
                  {a.artist_name ?? '—'}
                </div>
                <div className="text-text-dim text-[12px] truncate">
                  {a.popularity !== null && <>pop {a.popularity}</>}
                  {a.genres && a.genres.length > 0 && (
                    <> · <span className="text-text-mute">{a.genres.slice(0, 2).join(' / ')}</span></>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* LIST · spotify · tracks */}
      {!isEmpty && source === 'spotify' && view === 'tracks' && (
        <ul className="space-y-3.5">
          {spTracks.map((t, i) => (
            <li key={t.track_id} className="flex items-center gap-3.5">
              <RankBadge i={i} variant="cyan" />
              <AlbumArt url={t.album_image_url} seed={t.track_id} size={52} rounded="md" />
              <div className="flex-1 min-w-0">
                <div className="text-text font-semibold truncate">
                  {t.track_name ?? '—'}
                </div>
                <div className="text-text-dim text-[12px] truncate">
                  {t.artist_name ?? '—'}
                </div>
                {(t.energy !== null || t.valence !== null) && (
                  <div className="flex gap-2 mt-1 font-mono text-[10px] text-text-mute">
                    {t.energy !== null && <span>energy {Math.round(Number(t.energy) * 100)}</span>}
                    {t.valence !== null && <span>mood {Math.round(Number(t.valence) * 100)}</span>}
                    {t.danceability !== null && <span>dance {Math.round(Number(t.danceability) * 100)}</span>}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <BottomNav />
    </main>
  )
}

function RankBadge({ i, variant = 'mag' }: { i: number; variant?: 'mag' | 'cyan' }) {
  const top1 = variant === 'cyan' ? 'text-cyan' : 'text-magenta'
  const top2 = variant === 'cyan' ? 'text-magenta' : 'text-cyan'
  const cls =
    i === 0 ? `${top1} text-[22px]` :
    i === 1 ? `${top2} text-[18px]` :
    i === 2 ? 'text-gold text-[18px]' :
    'text-text-mute text-[18px]'
  return (
    <span className={`font-mono w-7 font-semibold ${cls}`}>
      {String(i + 1).padStart(2, '0')}
    </span>
  )
}

function Bar({ pct }: { pct: number }) {
  return (
    <div className="mt-1.5 h-1 bg-border rounded-full overflow-hidden w-[70px]">
      <div
        className="h-full rounded-full"
        style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--color-magenta), var(--color-cyan))' }}
      />
    </div>
  )
}
