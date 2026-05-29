'use client'

import { useEffect, useRef, useState } from 'react'
import { AlbumArt } from './AlbumArt'

interface NowPlayingData {
  isPlaying: boolean
  progressMs: number
  durationMs: number
  trackName: string
  artistName: string
  albumImageUrl: string | null
  trackUrl: string
}

const POLL_INTERVAL_MS = 15_000

export function NowPlaying() {
  const [data, setData] = useState<NowPlayingData | null>(null)
  const [tick, setTick] = useState(0)
  const lastFetchAt = useRef(Date.now())

  useEffect(() => {
    let aborted = false

    async function fetchNow() {
      try {
        const res = await fetch('/api/now-playing', { cache: 'no-store' })
        if (aborted) return
        if (res.status === 204) {
          setData(null)
        } else if (res.ok) {
          const d = (await res.json()) as NowPlayingData
          setData(d)
          lastFetchAt.current = Date.now()
        }
      } catch {
        // network glitch; siguiente tick
      }
    }

    fetchNow()
    const id = setInterval(fetchNow, POLL_INTERVAL_MS)
    return () => {
      aborted = true
      clearInterval(id)
    }
  }, [])

  // Animar la barra de progreso entre polls
  useEffect(() => {
    if (!data?.isPlaying) return
    const id = setInterval(() => setTick((t) => t + 1), 500)
    return () => clearInterval(id)
  }, [data?.isPlaying])

  if (!data) return null

  const elapsed = data.progressMs + (Date.now() - lastFetchAt.current)
  const pct = data.durationMs > 0 ? Math.min(100, (elapsed / data.durationMs) * 100) : 0

  return (
    <a
      href={data.trackUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-2xl p-4 mb-5 border border-magenta/30 relative overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, rgba(255, 45, 146, 0.18), rgba(0, 212, 255, 0.06))',
      }}
    >
      <div className="flex items-center gap-3.5">
        <AlbumArt url={data.albumImageUrl} seed={data.trackName} size={56} rounded="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-magenta animate-pulse-soft" />
            <span className="font-mono text-[9px] text-magenta uppercase tracking-widest">
              {data.isPlaying ? 'now playing' : 'paused'}
            </span>
          </div>
          <div className="text-text font-semibold truncate">{data.trackName}</div>
          <div className="text-text-dim text-sm truncate">{data.artistName}</div>
        </div>
        <span className="font-mono text-[10px] text-text-mute">{Math.round(pct)}%</span>
      </div>
      <div className="mt-3 h-1 bg-border/50 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-linear"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, var(--color-magenta), var(--color-cyan))',
          }}
          // suppress unused tick warning while still re-rendering each interval
          data-tick={tick}
        />
      </div>
    </a>
  )
}
