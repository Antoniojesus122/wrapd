'use client'

/**
 * Cliente: imagen del share card + estado de carga + botón de descarga.
 * Mostrar la imagen vía <img src="/api/share/og?..."> aprovecha el cache del
 * browser; cuando cambia el query string, se vuelve a pedir.
 */
import { useState } from 'react'
import type { ShareFormat } from './FormatTabs'

const ASPECT_FOR_PREVIEW: Record<ShareFormat, string> = {
  story: 'aspect-[9/16]',
  square: 'aspect-square',
  og: 'aspect-[1200/630]',
}

interface Props {
  format: ShareFormat
  period: string
}

export function SharePreview({ format, period }: Props) {
  const [busting, setBusting] = useState(0)
  const url = `/api/share/og?period=${period}&format=${format}&v=${busting}`

  const refresh = () => setBusting((n) => n + 1)

  const download = async () => {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `wrapd-${period}-${format}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(a.href)
    } catch (e) {
      console.error('[share] download failed', e)
      alert('No se pudo descargar la imagen. Reintenta.')
    }
  }

  return (
    <div className="space-y-4">
      <div
        className={`relative overflow-hidden rounded-2xl border border-border shadow-2xl shadow-magenta/10 ${ASPECT_FOR_PREVIEW[format]}`}
      >
        {/* Skeleton bg in case the image takes a moment */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, #2a0a3a, #0a0a0f)' }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={busting}
          src={url}
          alt="Share card preview"
          className="relative w-full h-full block"
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={download}
          className="rounded-xl bg-white text-black font-semibold py-3 text-[14px] flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          ↓ Descargar PNG
        </button>
        <button
          onClick={refresh}
          className="rounded-xl bg-surface border border-border text-text-dim hover:text-text font-medium py-3 text-[14px] flex items-center justify-center gap-2 transition-colors"
        >
          ↻ Refrescar
        </button>
      </div>
    </div>
  )
}
