import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { BottomNav } from '@/components/BottomNav'
import { PeriodTabs, parsePeriod } from '@/components/PeriodTabs'
import { FormatTabs, parseFormat } from '@/components/FormatTabs'
import { SharePreview } from '@/components/SharePreview'
import { buildShareData } from '@/lib/share-data'

export default async function SharePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; format?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/')

  const sp = await searchParams
  const period = parsePeriod(sp.period)
  const format = parseFormat(sp.format)
  const data = await buildShareData(session.userId, period)

  const isEmpty = data.totalPlays === 0

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

      <div className="font-mono text-[11px] text-text-mute uppercase tracking-widest mb-1">
        share · {data.periodHuman}
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-6">
        Tu <span className="text-magenta">share card</span>
      </h1>

      <PeriodTabs active={period} baseHref={`/share?format=${format}`} />
      <FormatTabs active={format} period={period} />

      {isEmpty ? (
        <div className="bg-surface border border-dashed border-border-strong rounded-2xl p-6 text-center mb-6">
          <div className="font-mono text-[10px] text-magenta uppercase tracking-widest mb-2">
            sin datos · todavía
          </div>
          <p className="text-text-dim leading-relaxed text-sm">
            Para este período aún no tienes plays ingestados. Lanza el worker
            para acumular datos y vuelve aquí. La share card sigue generándose
            con los datos por defecto.
          </p>
        </div>
      ) : null}

      <SharePreview format={format} period={period} />

      {/* Quick stats inline */}
      <div className="mt-6 grid grid-cols-3 gap-2.5">
        <Mini label="plays" value={data.totalPlays} />
        <Mini label="tracks" value={data.uniqueTracks} />
        <Mini label="artistas" value={data.uniqueArtists} />
      </div>

      {data.topArtists.length > 0 && (
        <div className="mt-4 bg-surface border border-border rounded-2xl p-4">
          <div className="font-mono text-[10px] text-text-mute uppercase tracking-widest mb-2">
            top en la card
          </div>
          <ol className="space-y-1.5">
            {data.topArtists.map((a) => (
              <li key={a.rank} className="flex items-center gap-3 text-sm">
                <span className="font-mono text-text-mute w-6">{String(a.rank).padStart(2, '0')}</span>
                <span className="text-text font-medium truncate flex-1">{a.name}</span>
                <span className="font-mono text-[11px] text-text-dim">{a.plays} plays</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <BottomNav />
    </main>
  )
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface border border-border rounded-xl px-3 py-2.5">
      <div className="font-mono text-[9px] text-text-mute uppercase tracking-widest">
        {label}
      </div>
      <div className="font-mono text-[18px] font-semibold tracking-tight mt-0.5">
        {value.toLocaleString('es-ES')}
      </div>
    </div>
  )
}
