import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
})

const jetbrains = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'Wrapd · Your music, 365 days a year',
  description:
    'Spotify Wrapped pero todo el año. Análisis honesto de lo que escuchas, con insights reales y un share card que vas a querer publicar.',
  applicationName: 'Wrapd',
  authors: [{ name: 'Antonio Jesús' }],
  openGraph: {
    title: 'Wrapd',
    description: 'Tu música, analizada de verdad.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a0a0a',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-bg text-text font-sans">{children}</body>
    </html>
  )
}
