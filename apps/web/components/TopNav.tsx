'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  displayName?: string | null
  avatarUrl?: string | null
}

const tabs = [
  { href: '/home', label: 'Home' },
  { href: '/top', label: 'Top' },
  { href: '/stats', label: 'Stats' },
  { href: '/share', label: 'Share' },
] as const

export function TopNav({ displayName, avatarUrl }: Props) {
  const pathname = usePathname() ?? ''

  return (
    <header className="hidden md:block sticky top-0 z-40 bg-bg/85 backdrop-blur-xl border-b border-border">
      <div className="max-w-6xl mx-auto px-8 lg:px-12 h-16 flex items-center gap-8">
        {/* Logo */}
        <Link href="/home" className="font-extrabold text-2xl tracking-tighter shrink-0">
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
        </Link>

        {/* Tabs */}
        <nav className="flex gap-1">
          {tabs.map((t) => {
            const active = pathname === t.href || pathname.startsWith(t.href + '/')
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`relative px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  active
                    ? 'bg-magenta-soft text-magenta'
                    : 'text-text-dim hover:text-text hover:bg-surface'
                }`}
              >
                {t.label}
              </Link>
            )
          })}
        </nav>

        {/* Right: user */}
        <div className="ml-auto flex items-center gap-3">
          {displayName && (
            <span className="text-sm text-text-dim hidden lg:inline">{displayName}</span>
          )}
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={displayName ?? 'avatar'}
              className="w-9 h-9 rounded-full object-cover border border-border-strong"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-full border border-border-strong"
              style={{ background: 'linear-gradient(135deg, #ff2d92, #6e00ff)' }}
            />
          )}
          <a
            href="/api/auth/logout"
            className="font-mono text-[11px] text-text-mute hover:text-text-dim ml-1"
          >
            logout →
          </a>
        </div>
      </div>
    </header>
  )
}
