import Link from 'next/link'
import type { ReactNode } from 'react'

interface Props {
  title: string
  updated: string
  children: ReactNode
}

export function LegalLayout({ title, updated, children }: Props) {
  return (
    <main className="min-h-screen px-6 py-12 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-12">
        <Link href="/" className="font-mono text-[11px] text-text-mute hover:text-text-dim">
          ← wrapd.
        </Link>
        <Link
          href="/api/auth/login"
          className="font-mono text-[11px] text-text-mute hover:text-text-dim"
        >
          login →
        </Link>
      </div>

      <div className="font-mono text-[10px] text-text-mute uppercase tracking-widest mb-3">
        última actualización · {updated}
      </div>
      <h1 className="text-4xl font-bold tracking-tight mb-12">{title}</h1>

      <article className="prose-wrapd space-y-6 text-text-dim leading-relaxed">
        {children}
      </article>

      <footer className="mt-20 pt-8 border-t border-border font-mono text-[10px] text-text-mute flex justify-between">
        <Link href="/privacy" className="hover:text-text-dim">
          privacy
        </Link>
        <Link href="/terms" className="hover:text-text-dim">
          terms
        </Link>
        <a href="mailto:antoniojesusgonzalezdomingo4@gmail.com" className="hover:text-text-dim">
          contact
        </a>
      </footer>
    </main>
  )
}
