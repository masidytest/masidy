'use client'

import Link from 'next/link'
import { useLocale } from '@/components/providers/locale-provider'

export function LegalFooter({ className = '' }: { className?: string }) {
  const { t } = useLocale()
  return (
    <footer
      className={`border-t border-white/10 px-5 py-6 text-sm text-zinc-400 ${className}`}
    >
      <nav
        aria-label={t('Legal and policies')}
        className="mx-auto flex max-w-7xl flex-wrap justify-center gap-x-5 gap-y-2"
      >
        <Link href="/privacy" className="hover:text-white">
          {t('Privacy')}
        </Link>
        <Link href="/terms" className="hover:text-white">
          {t('Terms')}
        </Link>
        <Link href="/cookies" className="hover:text-white">
          {t('Cookies')}
        </Link>
        <Link href="/acceptable-use" className="hover:text-white">
          {t('Acceptable Use')}
        </Link>
      </nav>
    </footer>
  )
}
