'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/home', label: 'Home', icon: '●' },
  { href: '/top', label: 'Top', icon: '▤' },
  { href: '/stats', label: 'Stats', icon: '▦' },
  { href: '/share', label: 'Share', icon: '↗' },
] as const

export function BottomNav() {
  const pathname = usePathname() ?? ''

  return (
    <nav className="md:hidden fixed bottom-6 left-6 right-6 max-w-md mx-auto bg-surface/85 backdrop-blur-xl border border-border rounded-full h-15 flex items-center justify-around px-2 z-40">
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(t.href + '/')
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-medium px-3.5 py-2 rounded-full transition-colors ${
              active ? 'bg-magenta-soft text-magenta' : 'text-text-mute hover:text-text-dim'
            }`}
          >
            <span className="text-[18px] leading-none">{t.icon}</span>
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
