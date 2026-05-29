/**
 * AlbumArt — renderiza la imagen si existe, o un gradiente determinista basado
 * en un seed (id del artista/track) cuando no hay imagen.
 */
const GRADIENTS = [
  'linear-gradient(135deg, #ff2d92, #6e00ff)',
  'linear-gradient(135deg, #00d4ff, #1ed760)',
  'linear-gradient(135deg, #ffc857, #ff5e3a)',
  'linear-gradient(135deg, #6e00ff, #00d4ff)',
  'linear-gradient(135deg, #1ed760, #ffc857)',
  'linear-gradient(135deg, #ff5e3a, #ff2d92)',
  'linear-gradient(135deg, #00d4ff, #ff2d92)',
  'linear-gradient(135deg, #ffc857, #1ed760)',
] as const

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

interface Props {
  url?: string | null
  seed: string
  size?: number
  className?: string
  rounded?: 'sm' | 'md' | 'lg' | 'full'
  alt?: string
}

export function AlbumArt({
  url,
  seed,
  size = 56,
  className = '',
  rounded = 'md',
  alt = '',
}: Props) {
  const radiusClass = {
    sm: 'rounded-md',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    full: 'rounded-full',
  }[rounded]

  const style: React.CSSProperties = {
    width: size,
    height: size,
    flexShrink: 0,
  }

  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt={alt}
        className={`${radiusClass} object-cover border border-border ${className}`}
        style={style}
      />
    )
  }

  return (
    <div
      aria-hidden
      className={`${radiusClass} ${className}`}
      style={{
        ...style,
        background: GRADIENTS[hash(seed) % GRADIENTS.length],
      }}
    />
  )
}
