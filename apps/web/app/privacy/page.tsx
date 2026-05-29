import { LegalLayout } from '@/components/LegalLayout'

export const metadata = { title: 'Privacy Policy · Wrapd' }

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="29 May 2026">
      <Section title="1. Who runs Wrapd">
        <p>
          Wrapd is a personal portfolio project built and maintained by Antonio Jesús González
          Domingo (Spain, EU). It is <strong className="text-text">not a commercial product</strong>
          {' '}— there are no ads, no tracking pixels, no analytics sold to third parties, and no
          monetisation of your data.
        </p>
      </Section>

      <Section title="2. What we collect">
        <p>When you connect your Spotify account, we read and store:</p>
        <ul className="list-disc list-inside space-y-1.5 pl-2">
          <li>
            Your <strong className="text-text">Spotify profile</strong>: display name, email,
            country, subscription tier, avatar URL.
          </li>
          <li>
            Your <strong className="text-text">listening history</strong> obtained via Spotify
            Web API (<code>/me/player/recently-played</code>,{' '}
            <code>/me/player/currently-playing</code>,{' '}
            <code>/me/top/tracks</code>, <code>/me/top/artists</code>).
          </li>
          <li>
            Spotify <strong className="text-text">OAuth tokens</strong> (access &amp; refresh)
            stored encrypted-at-rest by our database provider.
          </li>
        </ul>
        <p>
          We do <strong className="text-text">not</strong> collect your password, payment data,
          location, contacts, or any data outside of what Spotify exposes through its API.
        </p>
      </Section>

      <Section title="3. Where it's stored">
        <p>
          All data lives in a PostgreSQL database hosted by Supabase (EU region · Ireland). The
          worker that ingests data runs on Render / Fly.io in the EU. We do not transfer data
          outside the European Economic Area.
        </p>
      </Section>

      <Section title="4. What we use it for">
        <p>Strictly to render your personal dashboard inside Wrapd:</p>
        <ul className="list-disc list-inside space-y-1.5 pl-2">
          <li>Show your recent plays and currently playing track.</li>
          <li>Compute your top tracks, artists and listening patterns.</li>
          <li>Generate a downloadable share card with your stats.</li>
        </ul>
        <p>
          We do <strong className="text-text">not</strong> build advertising profiles, sell or
          share your data with third parties, or use it to train ML models for any external party.
        </p>
      </Section>

      <Section title="5. Sharing">
        <p>
          Data is shared only with the infrastructure providers strictly necessary to run Wrapd:
          Supabase (database), Vercel (web hosting), Render or Fly.io (worker). Each provider
          processes data on our behalf and may not use it for any other purpose.
        </p>
      </Section>

      <Section title="6. Your rights (GDPR)">
        <p>You can at any time:</p>
        <ul className="list-disc list-inside space-y-1.5 pl-2">
          <li>
            <strong className="text-text">Revoke access</strong> to Wrapd from
            {' '}
            <a
              className="text-cyan hover:underline"
              href="https://www.spotify.com/account/apps/"
              target="_blank"
              rel="noopener noreferrer"
            >
              spotify.com/account/apps
            </a>
            . That immediately invalidates our refresh tokens.
          </li>
          <li>
            <strong className="text-text">Delete all your data</strong> by emailing the address
            below — we delete your row from <code>raw.users</code> and PostgreSQL cascades the
            deletion to tokens, plays, and any downstream record.
          </li>
          <li>
            <strong className="text-text">Request a copy</strong> of all data we hold about you.
          </li>
        </ul>
      </Section>

      <Section title="7. Retention">
        <p>
          Data is kept while you have a valid Spotify session with Wrapd, and for up to 30 days
          after you revoke access (for backup integrity). After that it is permanently deleted.
        </p>
      </Section>

      <Section title="8. Cookies">
        <p>
          Wrapd uses one <code>httpOnly</code> cookie (<code>wrapd_session</code>) to hold your
          signed JWT session, and a short-lived <code>wrapd_oauth_state</code> cookie for CSRF
          protection during the OAuth flow. No tracking or marketing cookies.
        </p>
      </Section>

      <Section title="9. Spotify">
        <p>
          Wrapd uses the Spotify Web API but is not endorsed, certified, or otherwise approved by
          Spotify. Use of Wrapd is also subject to{' '}
          <a
            className="text-cyan hover:underline"
            href="https://www.spotify.com/legal/end-user-agreement/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Spotify&apos;s End User Agreement
          </a>
          .
        </p>
      </Section>

      <Section title="10. Contact">
        <p>
          Questions, deletion requests or anything else:{' '}
          <a
            className="text-cyan hover:underline"
            href="mailto:antoniojesusgonzalezdomingo4@gmail.com"
          >
            antoniojesusgonzalezdomingo4@gmail.com
          </a>
        </p>
      </Section>
    </LegalLayout>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-text mb-3 tracking-tight">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}
