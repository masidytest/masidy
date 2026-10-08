import type { Metadata } from 'next'
import { AccountClient } from '@/components/account/account-client'
import { AppHeader } from '@/components/shared/app-header'

export const metadata: Metadata = {
  title: 'Account — Masidy',
}

export default function AccountPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col">
      <AppHeader />
      <main className="flex-1">
        <AccountClient />
      </main>
    </div>
  )
}
