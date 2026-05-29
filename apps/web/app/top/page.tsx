import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { query } from '@/lib/db'
import { BottomNav } from '@/components/BottomNav'
import { TopNav } from '@/components/TopNav'
import { PeriodTabs, parsePeriod, type Period } from '@/components/PeriodTabs'
import { AlbumArt } from '@/components/AlbumArt'

interface UserMeta {
  display_name: string | null
  avatar_url: string | null
}
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

function parseView(v?: string | null): View { return v === 'tracks' ? 'tracks' : 'artists' }
function parseSource(v?: string | null): Source { return v === 'spotify' ? 'spotify' : 'plays' }
function parseSpotifyRange(v?: string | null): SpotifyRange {
  return v === 'medium_term' || v === 'long_term' ? v : 'short_term'
}

const PERIOD_LABEL: Record<Period, string> = {
  '1d': 'últimas 24h', '7d': 'última semana', '30d': 'último mes', '1y': 'último año',
}
const RANGE_LABEL: Record<SpotifyRange, string> = {
  short_term: '4 semanas', medium_term: '6 meses', long_term: 'all time',
}
const RANGE_TABS: SpotifyRange[] = ['short_term', 'medium_term', 'long_term']
const RANGE_SHORT: Record<SpotifyRange, string> = {
  short_term: '4w', medium_term: '6m', long_term: 'all',
}

export default async function TopPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; view?: string; source?: string; range?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/')

  const sp = await searchParams
  const view = parseView(sp.view)
  const source = parseSource(sp.source)
  const period = parsePeriod(sp.period)
  const range = parseSpotifyRange(sp.range)

  let user: UserMeta = { display_name: null, avatar_url: null }
  let artists: TopArtist[] = []
  let tracks: TopTrack[] = []
  let spArtists: SpotifyTopArtist[] = []
  let spTracks: SpotifyTopTrack[] = []

  try {
    const userRows = await query<UserMeta>(
      `SELECT display_name, avatar_url FROM raw.users WHERE id = $1`,
      [session.userId]
    )
    user = userRows[0] ?? user

    const limit = 50
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
      ? (view === 'artists' ? artists.length === 0 : tracks.length === 0)
      : (view === 'artists' ? spArtists.length === 0 : spTracks.length === 0)

  return (
    <>
      <TopNav displayName={user.display_name} avatarUrl={user.avatar_url} />

      <main className="min-h-screen px-6 md:px-8 lg:px-12 pt-8 md:pt-12 pb-32 md:pb-16 max-w-md md:max-w-6xl mx-auto">
        {/* Mobile header */}
        <div className="flex md:hidden items-center justify-between mb-6">
          <Link href="/home" className="font-mono text-[11px] text-text-mute">← back</Link>
          <span className="font-extrabold text-xl tracking-tighter">
            <span style={{
              background: 'linear-gradient(135deg, var(--color-magenta), var(--color-cyan))',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            }}>wrapd</span><span className="text-magenta">.</span>
          </span>
          <div className="w-12" />
        </div>

        <div className="font-mono text-[11px] text-text-mute uppercase tracking-widest mb-1">
          tus tops · {source === 'plays' ? PERIOD_LABEL[period] : `top spotify · ${RANGE_LABEL[range]}`}
        </div>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 md:mb-8">
          Top <span className="text-magenta">{view === 'artists' ? 'artistas' : 'tracks'}</span>
        </h1>

        {/* CONTROLS — responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="lg:col-span-3 flex flex-col gap-3">
            {/* Source toggle */}
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={`/top?source=plays${view === 'tracks' ? '&view=tracks' : ''}`}
                className={`text-center py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                  source === 'plays' ? 'bg-surface border-magenta text-text' : 'border-border text-text-dim hover:text-text'
                }`}
              >Mis plays</Link>
              <Link
                href={`/top?source=spotify${view === 'tracks' ? '&view=tracks' : ''}`}
                className={`text-center py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                  source === 'spotify' ? 'bg-surface border-cyan text-text' : 'border-border text-text-dim hover:text-text'
                }`}
              >Spotify Top</Link>
            </div>

            {/* View toggle */}
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={`/top?source=${source}${source === 'spotify' ? `&range=${range}` : ''}`}
                className={`text-center py-2 rounded-lg border text-[13px] font-medium transition-colors ${
                  view === 'artists' ? 'border-border-strong text-text' : 'border-border text-text-mute hover:text-text-dim'
                }`}
              >Artistas</Link>
              <Link
                href={`/top?source=${source}&view=tracks${source === 'spotify' ? `&range=${range}` : ''}`}
                className={`text-center py-2 rounded-lg border text-[13px] font-medium transition-colors ${
                  view === 'tracks' ? 'border-border-strong text-text' : 'border-border text-text-mute hover:text-text-dim'
                }`}
              >Tracks</Link>
            </div>
          </div>

          <div className="lg:col-span-9">
            {/* Period / range tabs */}
            {source === 'plays' ? (
              <PeriodTabs
                active={period}
                baseHref={`/top?source=plays${view === 'tracks' ? '&view=tracks' : ''}`}
              />
            ) : (
              <div className="flex gap-1 bg-surface rounded-full p-1">
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
                      {RANGE_SHORT[r]} · {RANGE_LABEL[r]}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* EMPTY */}
        {isEmpty && (
          <div className="bg-surface border border-dashed border-border-strong rounded-2xl p-6 text-center max-w-2xl mx-auto">
            <div className="font-mono text-[10px] text-magenta uppercase tracking-widest mb-2">
              sin datos · todavía
            </div>
            <p className="text-text-dim leading-relaxed text-sm">
              {source === 'spotify'
                ? 'Lanza el worker con --tops para traer tu top de Spotify.'
                : 'Lanza el worker para ingestar plays.'}
            </p>
            <code className="block mt-3 font-mono text-[11px] text-cyan">
              {source === 'spotify' ? 'python -m wrapd_worker.flows --tops' : 'python -m wrapd_worker.flows'}
            </code>
          </div>
        )}

        {/* LISTS · grid responsive */}
        {!isEmpty && source === 'plays' && view === 'artists' && (
          <ResponsiveList>
            {artists.map((a, i) => {
              const max = artists[0].play_count
              const pct = Math.round((a.play_count / max) * 100)
              return (
                <ItemRow
                  key={a.artist_id}
                  rank={i}
                  art={<AlbumArt url={a.artist_image_url} seed={a.artist_id} size={52} rounded="md" />}
                  title={a.artist_name}
                  subtitle={
                    <>
                      {a.play_count} plays
                      {a.genres && a.genres.length > 0 && (
                        <> · <span className="text-text-mute">{a.genres.slice(0, 2).join(' / ')}</span></>
                      )}
                    </>
                  }
                  bar={pct}
                />
              )
            })}
          </ResponsiveList>
        )}

        {!isEmpty && source === 'plays' && view === 'tracks' && (
          <ResponsiveList>
            {tracks.map((t, i) => {
              const max = Number(tracks[0].play_count)
              const pct = Math.round((t.play_count / max) * 100)
              return (
                <ItemRow
                  key={t.track_id}
                  rank={i}
                  art={<AlbumArt url={t.album_image_url} seed={t.track_id} size={52} rounded="md" />}
                  title={t.track_name}
                  subtitle={<>{t.artist_name} · {t.play_count} plays</>}
                  bar={pct}
                />
              )
            })}
          </ResponsiveList>
        )}

        {!isEmpty && source === 'spotify' && view === 'artists' && (
          <ResponsiveList>
            {spArtists.map((a, i) => (
              <ItemRow
                key={a.artist_id}
                rank={i}
                variant="cyan"
                art={<AlbumArt url={a.artist_image_url} seed={a.artist_id} size={52} rounded="md" />}
                title={a.artist_name ?? '—'}
                subtitle={
                  <>
                    {a.popularity !== null && <>pop {a.popularity}</>}
                    {a.genres && a.genres.length > 0 && (
                      <> · <span className="text-text-mute">{a.genres.slice(0, 2).join(' / ')}</span></>
                    )}
                  </>
                }
              />
            ))}
          </ResponsiveList>
        )}

        {!isEmpty && source === 'spotify' && view === 'tracks' && (
          <ResponsiveList>
            {spTracks.map((t, i) => (
              <ItemRow
                key={t.track_id}
                rank={i}
                variant="cyan"
                art={<AlbumArt url={t.album_image_url} seed={t.track_id} size={52} rounded="md" />}
                title={t.track_name ?? '—'}
                subtitle={
                  <>
                    {t.artist_name ?? '—'}
                    {(t.energy !== null || t.valence !== null) && (
                      <div className="flex gap-2 mt-1 font-mono text-[10px] text-text-mute">
                        {t.energy !== null && <span>energy {Math.round(Number(t.energy) * 100)}</span>}
                        {t.valence !== null && <span>mood {Math.round(Number(t.valence) * 100)}</span>}
                        {t.danceability !== null && <span>dance {Math.round(Number(t.danceability) * 100)}</span>}
                      </div>
                    )}
                  </>
                }
              />
            ))}
          </ResponsiveList>
        )}

        <BottomNav />
      </main>
    </>
  )
}

function ResponsiveList({ children }: { children: React.ReactNode }) {
  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-x-5 gap-y-3">
      {children}
    </ul>
  )
}

function ItemRow({
  rank, art, title, subtitle, bar, variant = 'mag',
}: {
  rank: number
  art: React.ReactNode
  title: string
  subtitle: React.ReactNode
  bar?: number
  variant?: 'mag' | 'cyan'
}) {
  const top1 = variant === 'cyan' ? 'text-cyan' : 'text-magenta'
  const top2 = variant === 'cyan' ? 'text-magenta' : 'text-cyan'
  const rankColor =
    rank === 0 ? `${top1} text-[22px]` :
    rank === 1 ? `${top2} text-[18px]` :
    rank === 2 ? 'text-gold text-[18px]' :
    'text-text-mute text-[18px]'

  return (
    <li className="bg-surface border border-border rounded-xl p-3 flex items-center gap-3.5 hover:border-border-strong transition-colors">
      <span className={`font-mono w-7 shrink-0 text-center font-semibold ${rankColor}`}>
        {String(rank + 1).padStart(2, '0')}
      </span>
      {art}
      <div className="flex-1 min-w-0">
        <div className="text-text font-semibold truncate">{title}</div>
        <div className="text-text-dim text-[12px] truncate">{subtitle}</div>
        {bar !== undefined && (
          <div className="mt-1.5 h-1 bg-border rounded-full overflow-hidden w-[70px]">
            <div
              className="h-full rounded-full"
              style={{ width: `${bar}%`, background: 'linear-gradient(90deg, var(--color-magenta), var(--color-cyan))' }}
            />
          </div>
        )}
      </div>
    </li>
  )
}
