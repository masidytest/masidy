import Link from 'next/link'
import type { ReactNode } from 'react'

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
  return (
    <main className="min-h-screen bg-background px-5 py-12 text-foreground sm:px-8">
      <article className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Masidy
        </Link>
        <header className="mt-10 border-b border-border pb-8">
          <p className="text-sm text-muted-foreground">
            Last updated October 8, 2026
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 text-muted-foreground">{summary}</p>
        </header>

        <aside className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-6 text-muted-foreground">
          This is a service-specific starting point, not legal advice. Before
          public launch, the service operator should confirm this document,
          publish its legal business name and contact details, and select
          applicable governing law and jurisdiction.
        </aside>

        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
                {section.content}
              </div>
            </section>
          ))}
        </div>

        <nav
          aria-label="Legal"
          className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-6 text-sm text-muted-foreground"
        >
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <Link href="/cookies" className="hover:text-foreground">
            Cookies
          </Link>
          <Link href="/acceptable-use" className="hover:text-foreground">
            Acceptable Use
          </Link>
        </nav>
      </article>
    </main>
  )
}
