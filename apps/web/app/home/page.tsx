import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { query } from '@/lib/db'
import { BottomNav } from '@/components/BottomNav'
import { AlbumArt } from '@/components/AlbumArt'

interface UserRow {
  id: string
  display_name: string | null
  avatar_url: string | null
  email: string | null
  country: string | null
  product: string | null
  updated_at: string
}

interface OverviewRow {
  user_id: string
  display_name: string | null
  avatar_url: string | null
  plays_today: number
  plays_30d: number
  unique_tracks_30d: number
  last_played_at: string | null
}

interface RecentPlayRow {
  track_id: string
  track_name: string
  artist_name: string | null
  album_image_url: string | null
  played_at: string
}

export default async function HomePage() {
  const session = await getSession()
  if (!session) redirect('/')

  // Fetch user + overview + recent plays in parallel.
  // Wrap overview/recents in try/catch so we don't break if marts views aren't applied yet.
  const userPromise = query<UserRow>(
    `SELECT id, display_name, avatar_url, email, country, product, updated_at
       FROM raw.users WHERE id = $1`,
    [session.userId]
  )

  let overview: OverviewRow | null = null
  let recents: RecentPlayRow[] = []
  try {
    const [ov, rs] = await Promise.all([
      query<OverviewRow>(`SELECT * FROM marts.user_overview WHERE user_id = $1`, [session.userId]),
      query<RecentPlayRow>(
        `SELECT p.track_id, p.played_at, t.name AS track_name, a.name AS artist_name, t.album_image_url
           FROM raw.plays p
           LEFT JOIN raw.tracks t ON t.id = p.track_id
           LEFT JOIN raw.artists a ON a.id = t.artist_id
          WHERE p.user_id = $1
          ORDER BY p.played_at DESC
          LIMIT 8`,
        [session.userId]
      ),
    ])
    overview = ov[0] ?? null
    recents = rs
  } catch (e) {
    console.error('[home] marts query failed (probably not applied yet)', e)
  }

  const userRows = await userPromise
  const user = userRows[0]
  if (!user) redirect('/')

  const now = new Date()
  const greetingTime = now.toLocaleTimeString('es-ES', {
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <main className="min-h-screen px-6 pt-12 pb-32 max-w-md mx-auto relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <span className="font-extrabold text-2xl tracking-tighter">
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
        <Link
          href="/api/auth/logout"
          className="font-mono text-[11px] text-text-mute hover:text-text-dim"
        >
          logout →
        </Link>
      </div>

      {/* Greeting */}
      <div className="font-mono text-[11px] text-text-mute uppercase tracking-widest mb-1">
        {greetingTime}
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-6">
        Hola, <span className="text-magenta">{user.display_name ?? 'Anónimo'}</span>
      </h1>

      {/* Avatar card */}
      <div className="bg-surface border border-border rounded-2xl p-4 flex items-center gap-3.5 mb-8">
        <AlbumArt url={user.avatar_url} seed={user.id} size={48} rounded="full" alt="avatar" />
        <div className="flex-1 min-w-0">
          <div className="text-text font-medium truncate">{user.display_name}</div>
          <div className="text-text-dim text-sm truncate font-mono">
            {user.country ?? '—'} · {user.product ?? 'free'}
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-2.5 mb-8">
        <Kpi label="hoy" value={overview?.plays_today ?? 0} unit="plays" />
        <Kpi label="este mes" value={overview?.plays_30d ?? 0} unit="plays" />
        <Kpi label="tracks únicos · 30d" value={overview?.unique_tracks_30d ?? 0} unit="" />
        <Kpi
          label="último play"
          value={overview?.last_played_at ? timeAgo(overview.last_played_at) : '—'}
          unit=""
          isString
        />
      </div>

      {/* Recent plays */}
      <div className="flex justify-between items-baseline mb-3 mt-2">
        <h2 className="font-bold text-sm uppercase tracking-wider">Hoy escuchado</h2>
        <Link href="/top" className="font-mono text-[11px] text-text-mute hover:text-text-dim">
          ver todo →
        </Link>
      </div>

      {recents.length === 0 ? (
        <div className="bg-surface border border-dashed border-border-strong rounded-2xl p-6 text-center">
          <div className="font-mono text-[10px] text-magenta uppercase tracking-widest mb-2">
            sin plays todavía
          </div>
          <p className="text-text-dim leading-relaxed text-sm">
            Tu sesión está activa y tus tokens guardados en Postgres.
            <br />
            Cuando arranquemos el worker, aquí verás tu música en vivo.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {recents.map((r) => (
            <li key={`${r.track_id}-${r.played_at}`} className="flex items-center gap-3">
              <AlbumArt url={r.album_image_url} seed={r.track_id} size={44} rounded="md" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{r.track_name}</div>
                <div className="text-xs text-text-dim truncate">{r.artist_name}</div>
              </div>
              <span className="font-mono text-[10px] text-text-mute">
                {new Date(r.played_at).toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </li>
          ))}
        </ul>
      )}

      <BottomNav />
    </main>
  )
}

function Kpi({
  label,
  value,
  unit,
  isString = false,
}: {
  label: string
  value: number | string
  unit?: string
  isString?: boolean
}) {
  return (
    <div className="bg-surface border border-border rounded-xl px-3.5 py-3">
      <div className="font-mono text-[9px] text-text-mute uppercase tracking-widest mb-1.5">
        {label}
      </div>
      <div className="font-mono text-[22px] font-semibold leading-none tracking-tight">
        {isString ? value : value.toLocaleString('es-ES')}
      </div>
      {unit && <div className="font-mono text-[10px] text-text-dim mt-1">{unit}</div>}
    </div>
  )
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const seconds = Math.floor((Date.now() - then) / 1000)
  if (seconds < 60) return 'hace segundos'
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `hace ${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  return `hace ${days}d`
}
