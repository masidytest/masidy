'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import useSWR from 'swr'
import Link from 'next/link'
import { entitlementsByUserType } from '@/lib/entitlements'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { useLocale } from '@/components/providers/locale-provider'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface AccountStats {
  todayCount: number
  totalCount: number
  userType: 'regular' | 'guest'
  createdAt: string | null
}

interface ChatItem {
  id: string
  messages?: Array<{ content?: string }>
  latestVersion?: { title?: string }
  updatedAt?: string
  createdAt?: string
}

function timeAgo(dateStr: string, locale: 'en' | 'ar'): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const seconds = Math.floor(diff / 1000)
  const relativeTime = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  if (seconds < 60) return relativeTime.format(0, 'second')
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return relativeTime.format(-minutes, 'minute')
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return relativeTime.format(-hours, 'hour')
  const days = Math.floor(hours / 24)
  if (days < 30) return relativeTime.format(-days, 'day')
  const months = Math.floor(days / 30)
  if (months < 12) return relativeTime.format(-months, 'month')
  return relativeTime.format(-Math.floor(months / 12), 'year')
}

export function AccountClient() {
  const { t, locale } = useLocale()
  const { data: session } = useSession()
  const { data: stats } = useSWR<AccountStats>('/api/account/stats', fetcher)
  const { data: chatsData } = useSWR<{ data: ChatItem[] }>(
    '/api/chats',
    fetcher,
  )
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  const isGuest = session?.user?.type === 'guest'
  const userType = stats?.userType ?? session?.user?.type ?? 'regular'
  const maxMessages =
    entitlementsByUserType[userType as 'regular' | 'guest']
      ?.maxMessagesPerDay ?? 50
  const todayCount = stats?.todayCount ?? 0
  const usagePercent = Math.min(
    100,
    Math.round((todayCount / maxMessages) * 100),
  )

  const recentChats = (chatsData?.data ?? []).slice(0, 20)

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch('/api/account', { method: 'DELETE' })
      if (res.ok) {
        await signOut({ callbackUrl: '/' })
      }
    } catch {
      toast({
        title: t('Deletion failed'),
        description:
          t('Could not delete your account. Please try again or contact support.'),
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const memberSince = stats?.createdAt
    ? timeAgo(stats.createdAt, locale)
    : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-10">
      {/* Profile section */}
      <section>
        <h2 className="text-lg font-semibold mb-4">{t('Profile')}</h2>
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('Email')}</span>
            <span className="text-sm font-medium">
              {session?.user?.email ?? '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('Account type')}</span>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                isGuest
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
              }`}
            >
              {isGuest ? t('Guest') : t('Regular')}
            </span>
          </div>
          {memberSince && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t('Member since')}
              </span>
              <span className="text-sm">{memberSince}</span>
            </div>
          )}
        </div>
      </section>

      {/* Usage stats */}
      <section>
        <h2 className="text-lg font-semibold mb-4">{t('Usage')}</h2>
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {t('Generations today')}
              </span>
              <span className="text-sm font-medium">
                {todayCount} / {maxMessages}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t('Total generations')}
            </span>
            <span className="text-sm font-medium">
              {stats?.totalCount ?? '—'}
            </span>
          </div>
        </div>
      </section>

      {/* Chat history */}
      {recentChats.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">{t('Recent Chats')}</h2>
          <div className="flex flex-col gap-1">
            {recentChats.map((chat) => {
              const firstMsg =
                chat.messages?.[0]?.content ||
                chat.latestVersion?.title ||
                'Chat'
              const truncated =
                firstMsg.length > 60 ? firstMsg.slice(0, 60) + '...' : firstMsg
              const ts = chat.updatedAt || chat.createdAt
              return (
                <Link
                  key={chat.id}
                  href={`/chats/${chat.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted transition-colors text-sm"
                >
                  <span className="truncate max-w-[70%]">{truncated}</span>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {ts ? timeAgo(ts, locale) : ''}
                  </span>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Danger zone */}
      {!isGuest && (
        <section>
          <h2 className="text-lg font-semibold text-destructive mb-4">
            {t('Danger Zone')}
          </h2>
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5">
            <p className="text-sm text-muted-foreground mb-4">
              {t('Permanently delete your account and all associated data. This action cannot be undone.')}
            </p>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              {t('Delete Account')}
            </Button>
          </div>
        </section>
      )}

      {/* Confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Delete Account')}</DialogTitle>
            <DialogDescription>
              {t('Are you sure you want to permanently delete your account? All your chat history and data will be removed. This action cannot be undone.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              {t('Cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isDeleting}
            >
              {isDeleting ? t('Deleting…') : t('Yes, delete my account')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
