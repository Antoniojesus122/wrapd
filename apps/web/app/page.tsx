export default function LandingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background glow */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 20%, rgba(255, 45, 146, 0.18), transparent 55%), radial-gradient(circle at 80% 90%, rgba(0, 212, 255, 0.10), transparent 60%)',
        }}
      />

      <div className="relative max-w-md w-full text-center">
        <div
          className="text-7xl font-extrabold tracking-tighter mb-2"
          style={{
            background: 'linear-gradient(135deg, var(--color-magenta), var(--color-cyan))',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          wrapd<span className="text-magenta">.</span>
        </div>

        <p className="text-text-dim text-lg leading-snug mb-14 max-w-xs mx-auto">
          Tu música, <span className="text-text font-medium">analizada de verdad</span>.
          <br />
          Empieza conectando tu cuenta.
        </p>

        <a
          href="/api/auth/login"
          className="inline-flex items-center justify-center gap-3 bg-white text-black rounded-full px-6 py-4 font-semibold text-[15px] w-full transition-transform hover:scale-[1.02] active:scale-95"
        >
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green text-black text-sm font-bold">
            ♫
          </span>
          Continuar con Spotify
        </a>

        <div className="mt-6 font-mono text-[10px] text-text-mute tracking-widest">
          privacy-first · sin ads · open source
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 inset-x-0 text-center font-mono text-[10px] text-text-mute tracking-widest">
        wrapd · v0.1 · built by{' '}
        <a
          href="https://github.com/Antoniojesus122"
          className="hover:text-text-dim"
          target="_blank"
          rel="noopener noreferrer"
        >
          @antoniojesus122
        </a>
      </div>
    </main>
  )
}
