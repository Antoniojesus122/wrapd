import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { BottomNav } from '@/components/BottomNav'

export default async function SharePage() {
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
        share
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-6">
        Tu <span className="text-magenta">share card</span>
      </h1>

      <div className="rounded-2xl p-7 text-white relative overflow-hidden min-h-[420px] flex flex-col"
           style={{ background: 'linear-gradient(135deg, #ff2d92, #6e00ff 60%, #00d4ff)' }}>
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 90% 10%, rgba(255,255,255,0.2), transparent 50%)' }}
        />
        <div className="relative z-10">
          <div className="font-extrabold text-lg tracking-tighter">wrapd.</div>
          <div className="font-mono text-[10px] opacity-80 uppercase tracking-widest mt-1">
            preview
          </div>
          <div className="text-3xl font-extrabold leading-tight tracking-tight mt-6 mb-10">
            Tu share card,
            <br />
            cuando tengas plays.
          </div>
          <div className="mt-auto font-mono text-[10px] opacity-70 uppercase tracking-widest">
            wrapd.app
          </div>
        </div>
      </div>

      <p className="text-text-dim text-sm leading-relaxed text-center mt-6 max-w-xs mx-auto">
        Cuando ingestes tus primeros plays, esta tarjeta se generará con tus
        tops reales y podrás exportarla en PNG para redes.
      </p>

      <BottomNav />
    </main>
  )
}
