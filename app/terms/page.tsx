import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/legal-page'
import { LocalizedText } from '@/components/providers/locale-provider'

export const metadata: Metadata = {
  title: 'Terms of Service | Masidy',
  description: 'Read the terms for using Masidy.',
}

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      summary="These terms apply when you access or use Masidy, an AI-powered app-building service."
      sections={[
        {
          title: 'Using the service',
          content: (
            <p><LocalizedText text="You must be legally able to agree to these terms and provide accurate account information. Keep your credentials secure. You are responsible for activity carried out through your account and for ensuring your use complies with applicable law." /></p>
          ),
        },
        {
          title: 'Your content and AI-generated output',
          content: (
            <p><LocalizedText text="You are responsible for prompts, files, and other content you submit, and must have the rights and permissions needed to submit them. AI-generated output may be inaccurate, incomplete, insecure, or similar to content generated for others. Review, test, and secure all output before using or deploying it. Do not treat it as professional, legal, medical, financial, or security advice. Rights in generated output may also be affected by the terms of the underlying provider and any third-party materials used." /></p>
          ),
        },
        {
          title: 'Acceptable use',
          content: (
            <p><LocalizedText text="You may not use Masidy to break the law, infringe others' rights, distribute malicious code, compromise systems, evade access controls, abuse the service, or submit content you are not authorized to use. The Acceptable Use Policy provides additional detail." /></p>
          ),
        },
        {
          title: 'Third-party services and availability',
          content: (
            <p><LocalizedText text="Masidy depends on third-party services, including the v0 Platform API. Their availability, features, limits, and terms may change. The service or any feature may be unavailable, changed, or discontinued. You are responsible for provider charges or accounts that apply to your use." /></p>
          ),
        },
        {
          title: 'Accounts and termination',
          content: (
            <p><LocalizedText text="You may stop using Masidy and request deletion of your account. We may suspend or restrict access when reasonably necessary to protect the service, comply with law, or address a breach of these terms. Deleting a Masidy account may not delete content held directly by third-party providers." /></p>
          ),
        },
        {
          title: 'Disclaimers and liability',
          content: (
            <p><LocalizedText text="To the extent permitted by law, the service is provided 'as is' and without warranties that it will be uninterrupted, error-free, secure, or suitable for a particular purpose. To the extent permitted by law, the service operator is not liable for indirect, incidental, special, consequential, or exemplary loss arising from use of the service. Nothing in these terms limits rights or liability that cannot legally be limited." /></p>
          ),
        },
        {
          title: 'Changes and governing law',
          content: (
            <p><LocalizedText text="These terms may be updated as the service changes. The revised date will be shown above. The operator must specify its legal name, contact information, and governing law/jurisdiction here before these terms are relied on as final legal terms." /></p>
          ),
        },
      ]}
    />
  )
}
