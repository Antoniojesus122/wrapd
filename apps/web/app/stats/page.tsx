import { Fragment } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { query } from '@/lib/db'
import { BottomNav } from '@/components/BottomNav'

interface AudioProfileRow {
  avg_energy: string | null
  avg_valence: string | null
  avg_danceability: string | null
  avg_acousticness: string | null
  avg_instrumentalness: string | null
  avg_speechiness: string | null
  avg_tempo: string | null
  tracks_with_features: number
}

interface HeatmapCell {
  hour_of_day: number
  day_of_week: number // 0=lunes ... 6=domingo
  plays: number
}

interface GenreCount {
  genre: string
  count: number
}

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const HOUR_BUCKETS = [
  { from: 0, label: '00' },
  { from: 3, label: '03' },
  { from: 6, label: '06' },
  { from: 9, label: '09' },
  { from: 12, label: '12' },
  { from: 15, label: '15' },
  { from: 18, label: '18' },
  { from: 21, label: '21' },
]

function moodFromValence(v: number): { label: string; emoji: string } {
  if (v >= 0.7) return { label: 'eufórica', emoji: '🥳' }
  if (v >= 0.55) return { label: 'feliz', emoji: '😊' }
  if (v >= 0.4) return { label: 'neutral', emoji: '🙂' }
  if (v >= 0.25) return { label: 'melancólica', emoji: '🌒' }
  return { label: 'oscura', emoji: '🌑' }
}

function energyLabel(e: number): string {
  if (e >= 0.75) return 'intensa'
  if (e >= 0.55) return 'energética'
  if (e >= 0.35) return 'moderada'
  return 'tranquila'
}

export default async function StatsPage() {
  const session = await getSession()
  if (!session) redirect('/')

  let audioProfile: AudioProfileRow | null = null
  let heatmap: HeatmapCell[] = []
  let topGenres: GenreCount[] = []
  try {
    const [ap, hm, gn] = await Promise.all([
      query<AudioProfileRow>(`SELECT * FROM marts.user_audio_profile WHERE user_id = $1`, [session.userId]),
      query<HeatmapCell>(`SELECT * FROM marts.hourly_heatmap WHERE user_id = $1`, [session.userId]),
      query<GenreCount>(
        `SELECT UNNEST(genres) AS genre, COUNT(*)::int AS count
           FROM raw.artists a
          WHERE EXISTS (
            SELECT 1 FROM marts.latest_spotify_tops t
            WHERE t.user_id = $1 AND t.kind = 'artist' AND t.item_id = a.id
          )
          AND ARRAY_LENGTH(genres, 1) > 0
          GROUP BY genre
          ORDER BY count DESC
          LIMIT 8`,
        [session.userId]
      ),
    ])
    audioProfile = ap[0] ?? null
    heatmap = hm
    topGenres = gn
  } catch (e) {
    console.error('[stats] query failed', e)
  }

  const hasAudio = !!audioProfile && audioProfile.tracks_with_features > 0
  const hasHeatmap = heatmap.length > 0
  const hasGenres = topGenres.length > 0

  // Bucketize heatmap into 8 x 7 grid (3-hour blocks)
  const grid: number[][] = Array.from({ length: 8 }, () => Array(7).fill(0))
  for (const cell of heatmap) {
    const bucket = Math.floor(cell.hour_of_day / 3)
    if (bucket >= 0 && bucket < 8 && cell.day_of_week >= 0 && cell.day_of_week < 7) {
      grid[bucket][cell.day_of_week] += cell.plays
    }
  }
  const maxCell = Math.max(1, ...grid.flat())

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
        stats
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-6">
        Tu <span className="text-magenta">universo musical</span>
      </h1>

      {/* AUDIO PROFILE — solo si Spotify nos lo da */}
      {hasAudio && (
        <section className="mb-7">
          <Headline profile={audioProfile!} />
          <FeatureGrid profile={audioProfile!} />
        </section>
      )}

      {/* HEATMAP */}
      <section className="mb-7">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-3">
          ¿Cuándo escuchas?
        </h2>
        {hasHeatmap ? (
          <div className="bg-surface border border-border rounded-2xl p-4">
            <div className="grid grid-cols-[28px_repeat(7,1fr)] gap-1 mb-1">
              <div />
              {DAY_LABELS.map((d) => (
                <div key={d} className="text-center font-mono text-[10px] text-text-mute">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-[28px_repeat(7,1fr)] gap-1">
              {HOUR_BUCKETS.map((b, bi) => (
                <Fragment key={bi}>
                  <div className="font-mono text-[10px] text-text-mute flex items-center justify-end pr-1">
                    {b.label}
                  </div>
                  {Array.from({ length: 7 }).map((_, day) => {
                    const v = grid[bi][day]
                    const intensity = v / maxCell
                    const bg =
                      v === 0
                        ? 'var(--color-border)'
                        : `rgba(255, 45, 146, ${0.25 + intensity * 0.75})`
                    return (
                      <div
                        key={`c${bi}-${day}`}
                        className="aspect-square rounded-sm"
                        style={{ background: bg }}
                        title={`${b.label}h · ${DAY_LABELS[day]} · ${v} plays`}
                      />
                    )
                  })}
                </Fragment>
              ))}
            </div>
            <div className="font-mono text-[10px] text-text-mute mt-3 text-center">
              últimos 30 días · cada celda = 3 horas
            </div>
          </div>
        ) : (
          <div className="bg-surface border border-dashed border-border-strong rounded-2xl p-6 text-center">
            <p className="text-text-dim text-sm">
              Aún no hay datos suficientes para el heatmap. Necesitas plays en varias franjas horarias.
            </p>
          </div>
        )}
      </section>

      {/* GÉNEROS */}
      <section className="mb-7">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-3">
          Tus géneros principales
        </h2>
        {hasGenres ? (
          <div className="flex flex-wrap gap-2">
            {topGenres.map((g, i) => {
              const size = i === 0 ? 'text-base' : i < 3 ? 'text-sm' : 'text-xs'
              const color = i === 0 ? 'bg-magenta text-white' : i < 3 ? 'bg-cyan/20 text-cyan border border-cyan/40' : 'bg-surface border border-border text-text-dim'
              return (
                <span key={g.genre} className={`px-3 py-1.5 rounded-full font-medium ${size} ${color}`}>
                  {g.genre}
                </span>
              )
            })}
          </div>
        ) : (
          <div className="bg-surface border border-dashed border-border-strong rounded-2xl p-6 text-center">
            <p className="text-text-dim text-sm">
              Los géneros vienen de Spotify Top. Lanza:
            </p>
            <code className="block mt-2 font-mono text-[11px] text-cyan">
              python -m wrapd_worker.flows --tops
            </code>
          </div>
        )}
      </section>

      {/* NOTA AUDIO FEATURES */}
      {!hasAudio && (
        <section className="bg-surface border border-dashed border-amber/30 rounded-2xl p-5 text-center">
          <div className="font-mono text-[10px] text-amber uppercase tracking-widest mb-2">
            audio features · pendiente
          </div>
          <p className="text-text-dim text-sm leading-relaxed">
            Spotify deprecó <code className="font-mono text-[11px]">/audio-features</code> para
            apps en modo Development (nov 2024). Para habilitar la
            <em> huella sonora</em> (energy/mood/dance/BPM) hay que pedir
            <strong className="text-text"> Extended Quota Mode</strong> a Spotify.
          </p>
        </section>
      )}

      <BottomNav />
    </main>
  )
}

function Headline({ profile }: { profile: AudioProfileRow }) {
  const valence = Number(profile.avg_valence ?? 0)
  const energy = Number(profile.avg_energy ?? 0)
  const mood = moodFromValence(valence)
  const energyLbl = energyLabel(energy)
  return (
    <div
      className="rounded-2xl p-5 mb-5 relative overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, rgba(255, 45, 146, 0.18), rgba(0, 212, 255, 0.10))',
      }}
    >
      <div className="font-mono text-[10px] text-text-mute uppercase tracking-widest mb-1.5">
        mood agregado · últimos 30 días
      </div>
      <div className="text-2xl font-bold tracking-tight">
        Tu música es <span className="text-magenta">{mood.label}</span> y{' '}
        <span className="text-cyan">{energyLbl}</span> {mood.emoji}
      </div>
      <div className="font-mono text-[11px] text-text-dim mt-2">
        basado en {profile.tracks_with_features} tracks con features
      </div>
    </div>
  )
}

function FeatureGrid({ profile }: { profile: AudioProfileRow }) {
  const features: Array<{ key: keyof AudioProfileRow; label: string; color: string }> = [
    { key: 'avg_energy', label: 'energy', color: 'var(--color-magenta)' },
    { key: 'avg_valence', label: 'mood', color: 'var(--color-cyan)' },
    { key: 'avg_danceability', label: 'dance', color: 'var(--color-gold)' },
    { key: 'avg_acousticness', label: 'acoustic', color: 'var(--color-green)' },
  ]
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {features.map((f) => {
        const v = profile[f.key]
        const value = v !== null && v !== undefined ? Number(v) : 0
        const pct = Math.round(value * 100)
        return (
          <div key={f.key} className="bg-surface border border-border rounded-xl p-3.5">
            <div className="flex items-baseline justify-between mb-2">
              <span className="font-mono text-[10px] text-text-mute uppercase tracking-widest">
                {f.label}
              </span>
              <span className="font-mono text-[14px] font-semibold tracking-tight">{pct}</span>
            </div>
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: f.color }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
