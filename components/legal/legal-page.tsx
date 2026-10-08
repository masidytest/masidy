'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useLocale } from '@/components/providers/locale-provider'
import { LanguageSwitcher } from '@/components/shared/language-switcher'

export interface LegalSection {
  title: string
  content: ReactNode
}

export function LegalPage({
  title,
  summary,
  sections,
}: {
  title: string
  summary: string
  sections: LegalSection[]
}) {
  const { t } = useLocale()
  return (
    <main className="min-h-screen bg-background px-5 py-12 text-foreground sm:px-8">
      <article className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('Masidy')}
          </Link>
          <LanguageSwitcher />
        </div>
        <header className="mt-10 border-b border-border pb-8">
          <p className="text-sm text-muted-foreground">
            {t('Last updated October 8, 2026')}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t(title)}
          </h1>
          <p className="mt-4 text-muted-foreground">{t(summary)}</p>
        </header>

        <aside className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-6 text-muted-foreground">
          {t('This is a service-specific starting point, not legal advice. Before public launch, the service operator should confirm this document, publish its legal business name and contact details, and select applicable governing law and jurisdiction.')}
        </aside>

        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold">{t(section.title)}</h2>
              <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
                {section.content}
              </div>
            </section>
          ))}
        </div>

        <nav
          aria-label={t('Legal')}
          className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-6 text-sm text-muted-foreground"
        >
          <Link href="/privacy" className="hover:text-foreground">
            {t('Privacy')}
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            {t('Terms')}
          </Link>
          <Link href="/cookies" className="hover:text-foreground">
            {t('Cookies')}
          </Link>
          <Link href="/acceptable-use" className="hover:text-foreground">
            {t('Acceptable Use')}
          </Link>
        </nav>
      </article>
    </main>
  )
}
