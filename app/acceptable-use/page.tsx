import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/legal-page'
import { LocalizedText } from '@/components/providers/locale-provider'

export const metadata: Metadata = {
  title: 'Acceptable Use Policy | Masidy',
  description: 'Understand the uses prohibited on Masidy.',
}

export default function AcceptableUsePage() {
  return (
    <LegalPage
      title="Acceptable Use Policy"
      summary="Use Masidy responsibly and only with content and systems you are authorized to use."
      sections={[
        {
          title: 'You may not use Masidy to',
          content: (
            <ul className="list-disc space-y-2 pl-5">
              <li><LocalizedText text="Violate applicable law, regulations, or another person's rights." /></li>
              <li><LocalizedText text="Generate, distribute, or deploy malware, phishing pages, credential theft, or tools intended to compromise systems." /></li>
              <li><LocalizedText text="Access, probe, scan, or disrupt systems, accounts, or data without authorization." /></li>
              <li><LocalizedText text="Submit personal, confidential, or copyrighted material without the required rights or permission." /></li>
              <li><LocalizedText text="Harass, threaten, defraud, impersonate, or facilitate harm to others." /></li>
              <li><LocalizedText text="Bypass usage limits, interfere with service operation, or attempt to gain unauthorized access." /></li>
            </ul>
          ),
        },
        {
          title: 'Your responsibility',
          content: (
            <p><LocalizedText text="You are responsible for the content you submit and for reviewing, testing, and securing generated code before using it. Do not include secrets or sensitive personal information in prompts. Third-party providers may apply additional acceptable-use rules." /></p>
          ),
        },
        {
          title: 'Enforcement and reporting',
          content: (
            <p><LocalizedText text="Access may be limited or suspended when necessary to protect users, providers, or the service, or to comply with law. To report suspected abuse, contact the service operator using the contact details that should be published here before public launch." /></p>
          ),
        },
      ]}
    />
  )
}
