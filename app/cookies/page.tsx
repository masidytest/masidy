import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/legal-page'

export const metadata: Metadata = {
  title: 'Cookie Policy | Masidy',
  description: 'Learn about cookies and browser storage used by Masidy.',
}

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      summary="Masidy uses essential browser storage to operate sign-in and remember your preferences."
      sections={[
        {
          title: 'Essential cookies',
          content: (
            <p>
              Authentication uses a session cookie so the service can
              recognize your signed-in session and protect account features.
              These cookies are necessary for the service to work.
            </p>
          ),
        },
        {
          title: 'Browser storage',
          content: (
            <p>
              The app may use session storage to temporarily preserve a prompt
              while you move through authentication, and local storage to
              remember interface preferences and custom design-system data.
              This data stays in your browser unless you clear it; clearing it
              may remove saved preferences or an unfinished prompt.
            </p>
          ),
        },
        {
          title: 'Analytics and controls',
          content: (
            <p>
              The current application code does not include an analytics or
              advertising cookie system. You can manage or clear cookies and
              browser storage through your browser settings. Blocking
              essential cookies may prevent sign-in and other features from
              working correctly.
            </p>
          ),
        },
      ]}
    />
  )
}
