import { LegalLayout } from '@/components/LegalLayout'

export const metadata = { title: 'Terms of Use · Wrapd' }

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Use" updated="29 May 2026">
      <Section title="1. The service">
        <p>
          Wrapd is a free, non-commercial personal-portfolio project that lets a Spotify user
          connect their account and view analytics of their own listening history. It is provided
          on an &quot;as-is&quot; basis with no warranty of availability, accuracy or fitness for
          any particular purpose.
        </p>
      </Section>

      <Section title="2. Eligibility">
        <p>
          You must own a Spotify account and accept Spotify&apos;s own terms in order to use
          Wrapd. Wrapd does not store your Spotify credentials — authentication runs through
          Spotify&apos;s official OAuth flow.
        </p>
      </Section>

      <Section title="3. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc list-inside space-y-1.5 pl-2">
          <li>Use Wrapd in a way that interferes with its normal operation.</li>
          <li>Reverse-engineer or attempt to extract data belonging to other users.</li>
          <li>Use Wrapd to violate Spotify&apos;s Developer Policy.</li>
        </ul>
      </Section>

      <Section title="4. Liability">
        <p>
          Wrapd is provided free of charge for portfolio purposes. To the maximum extent permitted
          by law, the maintainer disclaims all liability for any direct, indirect or consequential
          damages arising from the use of, or inability to use, the service.
        </p>
      </Section>

      <Section title="5. Termination">
        <p>
          You can stop using Wrapd at any time by revoking access at{' '}
          <a
            className="text-cyan hover:underline"
            href="https://www.spotify.com/account/apps/"
            target="_blank"
            rel="noopener noreferrer"
          >
            spotify.com/account/apps
          </a>
          . The maintainer may at any time discontinue, suspend or modify Wrapd without notice.
        </p>
      </Section>

      <Section title="6. Changes">
        <p>
          These terms may evolve. The current version is always published at{' '}
          <a className="text-cyan hover:underline" href="/terms">/terms</a> with the &quot;last
          updated&quot; date at the top. Continuing to use Wrapd after a change means you accept
          the new version.
        </p>
      </Section>

      <Section title="7. Governing law">
        <p>These terms are governed by the laws of Spain.</p>
      </Section>

      <Section title="8. Contact">
        <p>
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
