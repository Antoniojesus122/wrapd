import Link from 'next/link'

export type ShareFormat = 'story' | 'square' | 'og'

const FORMATS: { id: ShareFormat; label: string; ratio: string }[] = [
  { id: 'story', label: 'Story', ratio: '9:16' },
  { id: 'square', label: 'Post', ratio: '1:1' },
  { id: 'og', label: 'Link', ratio: '1.91:1' },
]

interface Props {
  active: ShareFormat
  period: string
}

export function FormatTabs({ active, period }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2 mb-5">
      {FORMATS.map((f) => {
        const isActive = active === f.id
        const href = `/share?period=${period}&format=${f.id}`
        return (
          <Link
            key={f.id}
            href={href}
            scroll={false}
            className={`rounded-xl border py-2.5 px-3 flex flex-col items-center gap-0.5 transition-colors ${
              isActive
                ? 'bg-surface border-magenta text-text'
                : 'bg-transparent border-border text-text-dim hover:text-text'
            }`}
          >
            <span className="text-sm font-medium">{f.label}</span>
            <span className="font-mono text-[10px] text-text-mute">{f.ratio}</span>
          </Link>
        )
      })}
    </div>
  )
}

export function parseFormat(value?: string | null): ShareFormat {
  if (value === 'square' || value === 'og') return value
  return 'story'
}
