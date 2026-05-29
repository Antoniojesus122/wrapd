import Link from 'next/link'

interface Props {
  page: number
  pageSize: number
  total: number
  buildHref: (page: number) => string
}

export function Pagination({ page, pageSize, total, buildHref }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null

  // Build a list of page numbers to show: 1, ..., current-1, current, current+1, ..., last
  const pages: (number | 'gap')[] = []
  for (let p = 1; p <= totalPages; p++) {
    if (
      p === 1 ||
      p === totalPages ||
      (p >= page - 1 && p <= page + 1)
    ) {
      pages.push(p)
    } else if (pages[pages.length - 1] !== 'gap') {
      pages.push('gap')
    }
  }

  const startItem = (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, total)

  return (
    <nav className="mt-8 md:mt-10 flex items-center justify-between gap-3 flex-wrap">
      <span className="font-mono text-[11px] text-text-mute">
        {startItem}–{endItem} de {total}
      </span>

      <div className="flex items-center gap-1">
        {/* Prev */}
        {page > 1 ? (
          <Link
            href={buildHref(page - 1)}
            scroll={false}
            className="px-3 py-1.5 rounded-lg border border-border text-text-dim hover:text-text hover:bg-surface font-mono text-[11px] transition-colors"
          >
            ← prev
          </Link>
        ) : (
          <span className="px-3 py-1.5 rounded-lg border border-border/40 text-text-mute font-mono text-[11px] cursor-not-allowed">
            ← prev
          </span>
        )}

        {/* Numbers */}
        {pages.map((p, i) =>
          p === 'gap' ? (
            <span key={`gap-${i}`} className="px-2 text-text-mute font-mono text-[11px]">
              …
            </span>
          ) : p === page ? (
            <span
              key={p}
              className="min-w-[34px] text-center px-2 py-1.5 rounded-lg bg-magenta text-white font-mono text-[11px] font-semibold"
            >
              {p}
            </span>
          ) : (
            <Link
              key={p}
              href={buildHref(p)}
              scroll={false}
              className="min-w-[34px] text-center px-2 py-1.5 rounded-lg border border-border text-text-dim hover:text-text hover:bg-surface font-mono text-[11px] transition-colors"
            >
              {p}
            </Link>
          )
        )}

        {/* Next */}
        {page < totalPages ? (
          <Link
            href={buildHref(page + 1)}
            scroll={false}
            className="px-3 py-1.5 rounded-lg border border-border text-text-dim hover:text-text hover:bg-surface font-mono text-[11px] transition-colors"
          >
            next →
          </Link>
        ) : (
          <span className="px-3 py-1.5 rounded-lg border border-border/40 text-text-mute font-mono text-[11px] cursor-not-allowed">
            next →
          </span>
        )}
      </div>
    </nav>
  )
}
