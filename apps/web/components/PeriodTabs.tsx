import Link from 'next/link'

export type Period = '1d' | '7d' | '30d' | '1y'

const PERIODS: Period[] = ['1d', '7d', '30d', '1y']

interface Props {
  active: Period
  baseHref: string // ej. "/top"
  searchKey?: string // ej. "period"
}

export function PeriodTabs({ active, baseHref, searchKey = 'period' }: Props) {
  return (
    <div className="flex gap-1 bg-surface rounded-full p-1 mb-6">
      {PERIODS.map((p) => {
        const isActive = p === active
        const href = p === '30d' ? baseHref : `${baseHref}?${searchKey}=${p}`
        return (
          <Link
            key={p}
            href={href}
            className={`flex-1 text-center py-2 font-mono text-[11px] font-medium rounded-full transition-colors ${
              isActive ? 'bg-magenta text-white' : 'text-text-mute hover:text-text-dim'
            }`}
            scroll={false}
          >
            {p}
          </Link>
        )
      })}
    </div>
  )
}

export function parsePeriod(value?: string | null): Period {
  if (value === '1d' || value === '7d' || value === '30d' || value === '1y') {
    return value
  }
  return '30d'
}
