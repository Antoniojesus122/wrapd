/**
 * Build the data payload for a share card.
 * Read from marts views; gracefully fall back when no data.
 */
import { query } from '@/lib/db'
import { parsePeriod, type Period } from '@/components/PeriodTabs'

export interface ShareTopArtist {
  rank: number
  name: string
  plays: number
}

export interface ShareData {
  userId: string
  displayName: string | null
  avatarUrl: string | null
  period: Period
  periodLabel: string // ej. "may · 2026"
  periodHuman: string // ej. "este mes"
  headline: string
  totalPlays: number
  uniqueTracks: number
  uniqueArtists: number
  topArtists: ShareTopArtist[]
  topGenre: string | null
}

const PERIOD_HUMAN: Record<Period, string> = {
  '1d': 'hoy',
  '7d': 'esta semana',
  '30d': 'este mes',
  '1y': 'este año',
}

function buildHeadline(topArtist: string | undefined, topGenre: string | null): string {
  if (!topArtist) return 'Tu música, analizada de verdad.'
  if (topGenre) return `${capitalize(topGenre)} fue tu vibra.`
  return `${topArtist} dominó tu música.`
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function periodLabel(period: Period): string {
  const now = new Date()
  if (period === '1d') {
    return now.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).toLowerCase()
  }
  if (period === '7d') return 'última semana'
  if (period === '30d') {
    return now.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }).toLowerCase()
  }
  return String(now.getFullYear())
}

interface PlayAgg {
  total_plays: string | number
  unique_tracks: string | number
  unique_artists: string | number
}

interface UserMeta {
  display_name: string | null
  avatar_url: string | null
}

interface TopArtistRow {
  rank: number
  artist_name: string
  genres: string[] | null
  play_count: number
}

const INTERVAL_BY_PERIOD: Record<Period, string> = {
  '1d': '1 day',
  '7d': '7 days',
  '30d': '30 days',
  '1y': '1 year',
}

export async function buildShareData(userId: string, periodInput?: string | null): Promise<ShareData> {
  const period = parsePeriod(periodInput)
  const interval = INTERVAL_BY_PERIOD[period]

  let userMeta: UserMeta = { display_name: null, avatar_url: null }
  let totalPlays = 0
  let uniqueTracks = 0
  let uniqueArtists = 0
  let topArtists: ShareTopArtist[] = []
  let topGenre: string | null = null

  try {
    const [users, plays, artistsRows] = await Promise.all([
      query<UserMeta>(
        `SELECT display_name, avatar_url FROM raw.users WHERE id = $1`,
        [userId]
      ),
      query<PlayAgg>(
        `SELECT
           COUNT(*)                                            AS total_plays,
           COUNT(DISTINCT track_id)                            AS unique_tracks,
           COUNT(DISTINCT (SELECT artist_id FROM raw.tracks WHERE id = p.track_id))
                                                               AS unique_artists
         FROM raw.plays p
         WHERE user_id = $1 AND played_at >= NOW() - $2::interval`,
        [userId, interval]
      ),
      query<TopArtistRow>(
        `SELECT rank, artist_name, genres, play_count
           FROM marts.top_artists_by_period
          WHERE user_id = $1 AND period = $2
          ORDER BY rank
          LIMIT 5`,
        [userId, period]
      ),
    ])

    userMeta = users[0] ?? userMeta
    if (plays[0]) {
      totalPlays = Number(plays[0].total_plays)
      uniqueTracks = Number(plays[0].unique_tracks)
      uniqueArtists = Number(plays[0].unique_artists)
    }
    topArtists = artistsRows.slice(0, 3).map((a) => ({
      rank: a.rank,
      name: a.artist_name,
      plays: a.play_count,
    }))

    // Top genre — first non-empty
    for (const a of artistsRows) {
      if (a.genres && a.genres.length > 0) {
        topGenre = a.genres[0]
        break
      }
    }
  } catch (e) {
    console.error('[share-data] query failed', e)
  }

  return {
    userId,
    displayName: userMeta.display_name,
    avatarUrl: userMeta.avatar_url,
    period,
    periodLabel: periodLabel(period),
    periodHuman: PERIOD_HUMAN[period],
    headline: buildHeadline(topArtists[0]?.name, topGenre),
    totalPlays,
    uniqueTracks,
    uniqueArtists,
    topArtists,
    topGenre,
  }
}
