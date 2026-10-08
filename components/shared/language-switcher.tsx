'use client'

import { Button } from '@/components/ui/button'
import { useLocale } from '@/components/providers/locale-provider'

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale()
  const nextLocale = locale === 'en' ? 'ar' : 'en'

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => setLocale(nextLocale)}
      aria-label={`${t('Change language')}: ${nextLocale === 'ar' ? t('Arabic') : t('English')}`}
    >
      {nextLocale === 'ar' ? 'العربية' : 'English'}
    </Button>
  )
}
