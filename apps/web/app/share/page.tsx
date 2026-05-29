import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { query } from '@/lib/db'
import { BottomNav } from '@/components/BottomNav'
import { TopNav } from '@/components/TopNav'
import { PeriodTabs, parsePeriod } from '@/components/PeriodTabs'
import { FormatTabs, parseFormat } from '@/components/FormatTabs'
import { SharePreview } from '@/components/SharePreview'
import { buildShareData } from '@/lib/share-data'

interface UserMeta { display_name: string | null; avatar_url: string | null }

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

  let user: UserMeta = { display_name: null, avatar_url: null }
  try {
    const u = await query<UserMeta>(`SELECT display_name, avatar_url FROM raw.users WHERE id = $1`, [session.userId])
    user = u[0] ?? user
  } catch {}

  return (
    <>
      <TopNav displayName={user.display_name} avatarUrl={user.avatar_url} />

      <main className="min-h-screen px-6 md:px-8 lg:px-12 pt-8 md:pt-12 pb-32 md:pb-16 max-w-md md:max-w-6xl mx-auto">
        {/* Mobile header */}
        <div className="flex md:hidden items-center justify-between mb-6">
          <Link href="/home" className="font-mono text-[11px] text-text-mute">← back</Link>
          <span className="font-extrabold text-xl tracking-tighter">
            <span style={{ background: 'linear-gradient(135deg, var(--color-magenta), var(--color-cyan))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>wrapd</span>
            <span className="text-magenta">.</span>
          </span>
          <div className="w-12" />
        </div>

        <div className="font-mono text-[11px] text-text-mute uppercase tracking-widest mb-1">
          share · {data.periodHuman}
        </div>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 md:mb-10">
          Tu <span className="text-magenta">share card</span>
        </h1>

        {/* DESKTOP: preview izquierda, controles derecha · MOBILE: stacked */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8">
          {/* PREVIEW */}
          <div className="lg:col-span-7 xl:col-span-8">
            <SharePreview format={format} period={period} />
          </div>

          {/* CONTROLS */}
          <aside className="lg:col-span-5 xl:col-span-4 flex flex-col gap-5">
            <div className="bg-surface border border-border rounded-2xl p-5 md:p-6">
              <h2 className="font-mono text-[11px] text-text-dim uppercase tracking-widest mb-3">período</h2>
              <PeriodTabs active={period} baseHref={`/share?format=${format}`} />
            </div>

            <div className="bg-surface border border-border rounded-2xl p-5 md:p-6">
              <h2 className="font-mono text-[11px] text-text-dim uppercase tracking-widest mb-3">formato</h2>
              <FormatTabs active={format} period={period} />
            </div>

            {/* Stats inline */}
            <div className="bg-surface border border-border rounded-2xl p-5 md:p-6">
              <h2 className="font-mono text-[11px] text-text-dim uppercase tracking-widest mb-3">datos en la card</h2>
              <div className="grid grid-cols-3 gap-2.5 mb-5">
                <Mini label="plays" value={data.totalPlays} />
                <Mini label="tracks" value={data.uniqueTracks} />
                <Mini label="artistas" value={data.uniqueArtists} />
              </div>

              {data.topArtists.length > 0 && (
                <>
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
                </>
              )}

              {isEmpty && (
                <p className="font-mono text-[11px] text-text-mute mt-3 leading-relaxed">
                  Para este período no tenemos plays. La card se genera con datos por defecto.
                </p>
              )}
            </div>
          </aside>
        </div>

        <BottomNav />
      </main>
    </>
  )
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-bg-soft border border-border rounded-xl px-3 py-2.5">
      <div className="font-mono text-[9px] text-text-mute uppercase tracking-widest">{label}</div>
      <div className="font-mono text-[18px] font-semibold tracking-tight mt-0.5">
        {value.toLocaleString('es-ES')}
      </div>
    </div>
  )
}
