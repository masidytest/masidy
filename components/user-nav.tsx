'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { useTheme } from 'next-themes'
import useSWR from 'swr'
import { Session } from 'next-auth'
import {
  Gauge,
  LayoutTemplate,
  LogIn,
  LogOut,
  MessageSquareText,
  Moon,
  Monitor,
  Palette,
  Settings,
  Sun,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { entitlementsByUserType } from '@/lib/entitlements'

interface UserNavProps {
  session: Session | null
  collapsed?: boolean
}

interface AccountStats {
  todayCount: number
  userType: 'regular' | 'guest'
}

const fetchAccountStats = async (url: string): Promise<AccountStats> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Could not load account usage.')
  }
  return response.json()
}

const moreLinks = [
  {
    label: 'Templates',
    href: '/templates',
    icon: LayoutTemplate,
  },
  {
    label: 'Design systems',
    href: '/design-systems',
    icon: Palette,
  },
]

const avatarColors = [
  'bg-rose-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-lime-600',
  'bg-emerald-600',
  'bg-teal-600',
  'bg-cyan-600',
  'bg-sky-600',
  'bg-blue-600',
  'bg-indigo-600',
  'bg-violet-600',
  'bg-fuchsia-600',
]

export function UserNav({ session, collapsed = false }: UserNavProps) {
  const [mounted, setMounted] = useState(false)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const { theme, setTheme } = useTheme()
  const isGuest = session?.user?.type === 'guest'
  const userLabel =
    session?.user?.name ||
    session?.user?.email?.split('@')[0] ||
    (isGuest ? 'Guest' : 'Account')
  const initials = userLabel.slice(0, 2).toUpperCase()
  const avatarIdentity = session?.user?.id || userLabel
  const avatarHash = Array.from(avatarIdentity).reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
    0,
  )
  const avatarColor = avatarColors[avatarHash % avatarColors.length]
  const { data: accountStats, error: accountStatsError } = useSWR<AccountStats>(
    session?.user?.id ? '/api/account/stats' : null,
    fetchAccountStats,
  )
  const userType = accountStats?.userType || session?.user?.type || 'regular'
  const maxGenerations =
    entitlementsByUserType[userType]?.maxMessagesPerDay ??
    entitlementsByUserType.regular.maxMessagesPerDay
  const usageLabel = accountStats
    ? `${accountStats.todayCount} / ${maxGenerations}`
    : accountStatsError
      ? 'Unavailable'
      : 'Loading…'

  useEffect(() => setMounted(true), [])

  const feedbackUrl = new URL(
    'https://github.com/masidytest/v0-clone/issues/new',
  )
  feedbackUrl.searchParams.set('title', 'Product feedback')
  feedbackUrl.searchParams.set('body', feedback.trim())

  if (!session) {
    return (
      <Button
        asChild
        variant="ghost"
        className={
          collapsed
            ? 'relative h-8 w-8 rounded-full p-0'
            : 'h-9 w-full justify-start gap-2 rounded-md px-2'
        }
        aria-label="Sign in"
        title={collapsed ? 'Sign in' : undefined}
      >
        <Link href="/login">
          <LogIn className="size-4 shrink-0" />
          {!collapsed && (
            <span className="text-sm font-medium">Sign in</span>
          )}
        </Link>
      </Button>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={
              collapsed
                ? 'relative h-8 w-8 rounded-full p-0'
                : 'h-9 w-full justify-start gap-2 rounded-md px-2'
            }
            aria-label="Open account menu"
            title={collapsed ? userLabel : undefined}
          >
            <Avatar className="size-8 shrink-0">
              {session.user.image && (
                <AvatarImage
                  src={session.user.image}
                  alt={`${userLabel}'s profile picture`}
                />
              )}
              <AvatarFallback
                className={`${mounted ? avatarColor : 'bg-violet-600'} font-semibold text-white`}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <span className="min-w-0 truncate text-left text-sm font-medium">
                {userLabel}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-64"
          align="start"
          side="top"
          sideOffset={8}
        >
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{userLabel}</p>
              {session?.user?.email && (
                <p className="text-xs leading-none text-muted-foreground">
                  {session.user.email}
                </p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a href="/account">
              <Settings className="mr-2 size-4" />
              Settings
            </a>
          </DropdownMenuItem>
          {session?.user?.id && (
            <DropdownMenuItem asChild>
              <a href="/account" className="flex w-full items-center">
                <Gauge className="mr-2 size-4" />
                <span>Usage</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {usageLabel}
                </span>
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={() => {
              setFeedback('')
              setIsFeedbackOpen(true)
            }}
          >
            <MessageSquareText className="mr-2 size-4" />
            Feedback
          </DropdownMenuItem>
          <DropdownMenuLabel className="flex items-center justify-between font-normal">
            <span>Theme</span>
            <div className="flex items-center rounded-md border p-0.5">
              <Button
                type="button"
                variant={theme === 'system' ? 'secondary' : 'ghost'}
                size="icon"
                className="size-7"
                aria-label="Use system theme"
                aria-pressed={theme === 'system'}
                onClick={() => setTheme('system')}
              >
                <Monitor className="size-4" />
              </Button>
              <Button
                type="button"
                variant={theme === 'light' ? 'secondary' : 'ghost'}
                size="icon"
                className="size-7"
                aria-label="Use light theme"
                aria-pressed={theme === 'light'}
                onClick={() => setTheme('light')}
              >
                <Sun className="size-4" />
              </Button>
              <Button
                type="button"
                variant={theme === 'dark' ? 'secondary' : 'ghost'}
                size="icon"
                className="size-7"
                aria-label="Use dark theme"
                aria-pressed={theme === 'dark'}
                onClick={() => setTheme('dark')}
              >
                <Moon className="size-4" />
              </Button>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {moreLinks.map(({ label, href, icon: Icon }) => (
                <DropdownMenuItem key={label} asChild>
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    <Icon className="mr-2 size-4" />
                    {label}
                  </a>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          {isGuest && (
            <>
              <DropdownMenuItem asChild>
                <a href="/register">Create Account</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/login">Sign In</a>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem
            onClick={async () => {
              await signOut({ callbackUrl: '/', redirect: true })
            }}
          >
            <LogOut className="mr-2 size-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Give feedback</DialogTitle>
            <DialogDescription>
              Share what went well or how we can improve Masidy. Submit opens a
              GitHub feedback draft for you to review.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            autoFocus
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder="Tell us what you think…"
            aria-label="Your feedback"
            className="min-h-32"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFeedbackOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!feedback.trim()}
              onClick={() => {
                window.open(
                  feedbackUrl.toString(),
                  '_blank',
                  'noopener,noreferrer',
                )
                setIsFeedbackOpen(false)
              }}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
