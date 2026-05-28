import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { query } from '@/lib/db'

interface UserRow {
  id: string
  display_name: string | null
  avatar_url: string | null
  email: string | null
  country: string | null
  product: string | null
  updated_at: string
}

export default async function HomePage() {
  const session = await getSession()
  if (!session) redirect('/')

  const rows = await query<UserRow>(
    `SELECT id, display_name, avatar_url, email, country, product, updated_at
       FROM raw.users WHERE id = $1`,
    [session.userId]
  )
  const user = rows[0]
  if (!user) redirect('/')

  return (
    <main className="min-h-screen px-6 py-12 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
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
        autenticado · {user.country ?? '—'} · {user.product ?? 'free'}
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-8">
        Hola, <span className="text-magenta">{user.display_name ?? 'Anónimo'}</span>
      </h1>

      {/* Avatar + meta */}
      <div className="bg-surface border border-border rounded-2xl p-5 flex items-center gap-4 mb-8">
        {user.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatar_url}
            alt={user.display_name ?? 'avatar'}
            className="w-14 h-14 rounded-full object-cover border border-border-strong"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-border" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-text font-medium truncate">{user.display_name}</div>
          <div className="text-text-dim text-sm truncate">{user.email}</div>
        </div>
      </div>

      {/* Placeholder · pendiente */}
      <div className="bg-surface border border-dashed border-border-strong rounded-2xl p-6 text-center">
        <div className="font-mono text-[10px] text-magenta uppercase tracking-widest mb-2">
          next up
        </div>
        <p className="text-text-dim leading-relaxed text-sm">
          Tu sesión está activa y tus tokens guardados en Postgres.
          <br />
          Cuando arranquemos el worker Python, aquí verás tu música.
        </p>
      </div>

      <div className="mt-8 font-mono text-[10px] text-text-mute text-center tracking-widest">
        user id · {user.id}
      </div>
    </main>
  )
}
