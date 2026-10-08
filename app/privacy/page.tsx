import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/legal-page'

export const metadata: Metadata = {
  title: 'Privacy Policy | Masidy',
  description: 'Learn how Masidy handles account, prompt, and project data.',
}

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      summary="This policy describes the information Masidy processes when you use this AI app-building service."
      sections={[
        {
          title: 'Information we process',
          content: (
            <>
              <p>
                When you register, Masidy stores your email address, a
                password hash, and account creation time. Authentication also
                uses a session cookie to keep you signed in.
              </p>
              <p>
                When you create apps, your prompts, submitted attachments,
                generated chat content, and related chat or project identifiers
                are sent to and processed by the v0 Platform API. Masidy stores
                account-to-chat and account-to-project ownership records.
              </p>
              <p>
                The application also records IP addresses for anonymous usage
                limits. Browser storage may hold a prompt temporarily while
                you continue or resume a sign-in flow, and may store interface
                preferences or custom design-system data on your device.
              </p>
            </>
          ),
        },
        {
          title: 'How information is used',
          content: (
            <ul className="list-disc space-y-2 pl-5">
              <li>To provide sign-in, account, chat, project, and generation features.</li>
              <li>To send your request and related inputs to the v0 service so it can generate app content.</li>
              <li>To protect the service, enforce usage limits, and troubleshoot failures.</li>
              <li>To retain your account and associate your chats and projects with it.</li>
            </ul>
          ),
        },
        {
          title: 'Service providers and transfers',
          content: (
            <p>
              The v0 Platform API processes generation requests and may store
              chat and project content under its own terms and privacy
              practices. Review the v0 provider&apos;s current policies before
              submitting sensitive information. The service may also use its
              configured hosting and database providers to run the application
              and store account and ownership records. The exact providers
              depend on the deployment configuration.
            </p>
          ),
        },
        {
          title: 'Retention and deletion',
          content: (
            <p>
              You can request deletion of your Masidy account through the
              account controls. The account deletion endpoint attempts to
              delete the local account record; related-record deletion
              depends on the configured database. It does not delete chats or
              projects held by v0 or other providers, which may need to be
              deleted with the relevant provider. Operational records,
              including usage-limit logs, may remain as required for
              security, service operation, or legal obligations.
            </p>
          ),
        },
        {
          title: 'Security and your choices',
          content: (
            <p>
              Masidy uses password hashing and server-side credentials for
              authentication and provider access. No internet service can
              promise absolute security. Do not submit passwords, payment
              details, private keys, or other sensitive personal information
              in prompts or uploaded content. You may stop using the service
              and request account deletion through the account page.
            </p>
          ),
        },
        {
          title: 'Children and contact',
          content: (
            <>
              <p>
                The service is not designed for children who are not legally
                permitted to use online services in their location.
              </p>
              <p>
                For privacy questions or requests, contact the service
                operator using the contact details that should be published
                here before public launch.
              </p>
            </>
          ),
        },
      ]}
    />
  )
}
