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

  let profile: AudioProfileRow | null = null
  try {
    const rows = await query<AudioProfileRow>(
      `SELECT * FROM marts.user_audio_profile WHERE user_id = $1`,
      [session.userId]
    )
    profile = rows[0] ?? null
  } catch (e) {
    console.error('[stats] audio profile query failed', e)
  }

  const isEmpty = !profile || profile.tracks_with_features === 0

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
        stats · audio profile
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-6">
        Tu <span className="text-magenta">huella sonora</span>
      </h1>

      {isEmpty ? (
        <div className="bg-surface border border-dashed border-border-strong rounded-2xl p-6 text-center">
          <div className="font-mono text-[10px] text-magenta uppercase tracking-widest mb-2">
            sin audio features · todavía
          </div>
          <p className="text-text-dim leading-relaxed text-sm">
            Necesitamos ingestar audio features de tus tracks. Lanza:
          </p>
          <code className="block mt-3 font-mono text-[11px] text-cyan">
            python -m wrapd_worker.flows --tops
          </code>
          <p className="text-text-dim text-[12px] mt-3">
            Trae top tracks, top artistas <em>y</em> sus audio features de una.
          </p>
        </div>
      ) : (
        <>
          <Headline profile={profile!} />
          <FeatureGrid profile={profile!} />
        </>
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
        basado en {profile.tracks_with_features} tracks con audio features
      </div>
    </div>
  )
}

function FeatureGrid({ profile }: { profile: AudioProfileRow }) {
  const features: Array<{ key: keyof AudioProfileRow; label: string; color: string }> = [
    { key: 'avg_energy', label: 'energy', color: 'var(--color-magenta)' },
    { key: 'avg_valence', label: 'mood (valence)', color: 'var(--color-cyan)' },
    { key: 'avg_danceability', label: 'danceability', color: 'var(--color-gold)' },
    { key: 'avg_acousticness', label: 'acoustic', color: 'var(--color-green)' },
    { key: 'avg_instrumentalness', label: 'instrumental', color: 'var(--color-purple)' },
    { key: 'avg_speechiness', label: 'speech', color: 'var(--color-magenta)' },
  ]
  const tempo = profile.avg_tempo ? Math.round(Number(profile.avg_tempo)) : null

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 mb-5">
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
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: f.color }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {tempo !== null && (
        <div className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] text-text-mute uppercase tracking-widest mb-1">
              tempo medio
            </div>
            <div className="text-2xl font-bold tracking-tight">{tempo} BPM</div>
          </div>
          <div className="font-mono text-[10px] text-cyan uppercase tracking-widest">
            ♩ = {tempo}
          </div>
        </div>
      )}
    </>
  )
}
