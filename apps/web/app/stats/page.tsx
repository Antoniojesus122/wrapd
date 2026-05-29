import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { BottomNav } from '@/components/BottomNav'

export default async function StatsPage() {
  const session = await getSession()
  if (!session) redirect('/')

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
        ¿Cuándo <span className="text-magenta">escuchas</span>?
      </h1>

      <div className="bg-surface border border-dashed border-border-strong rounded-2xl p-6 text-center">
        <div className="font-mono text-[10px] text-cyan uppercase tracking-widest mb-2">
          next sprint
        </div>
        <p className="text-text-dim leading-relaxed text-sm">
          Heatmap de horas, evolución de géneros e insights mensuales en
          construcción. Cuando tengas plays ingeridos, esta pantalla se llena sola.
        </p>
      </div>

      <BottomNav />
    </main>
  )
}
