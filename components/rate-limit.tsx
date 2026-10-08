'use client'

import { useState, useEffect } from 'react'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface RateLimitProps {
  isOpen: boolean
  onClose?: () => void
  userEmail?: string
  usageCount?: number
  maxUsage?: number
}

function getSecondsUntilMidnightUTC(): number {
  const now = new Date()
  const midnight = new Date()
  midnight.setUTCHours(24, 0, 0, 0)
  return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000))
}

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

export function RateLimit({
  isOpen,
  onClose,
  userEmail,
  usageCount,
  maxUsage,
}: RateLimitProps) {
  const [secondsLeft, setSecondsLeft] = useState(getSecondsUntilMidnightUTC)

  useEffect(() => {
    if (!isOpen) return
    setSecondsLeft(getSecondsUntilMidnightUTC())
    const interval = setInterval(() => {
      setSecondsLeft(getSecondsUntilMidnightUTC())
    }, 1000)
    return () => clearInterval(interval)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Lock icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-muted p-5">
            <Lock className="h-10 w-10 text-muted-foreground" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            You&apos;ve reached your daily limit
          </h2>
          <p className="text-muted-foreground text-sm">
            Your generations reset at midnight UTC.
          </p>
        </div>

        {/* Countdown */}
        <div className="bg-muted rounded-lg px-6 py-4">
          <p className="text-xs text-muted-foreground mb-1">Resets in</p>
          <p className="text-3xl font-mono font-semibold text-foreground tabular-nums">
            {formatCountdown(secondsLeft)}
          </p>
        </div>

        {/* Usage stat */}
        {usageCount !== undefined && maxUsage !== undefined && (
          <p className="text-sm text-muted-foreground">
            {usageCount} / {maxUsage} generations today
          </p>
        )}

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <Button asChild className="w-full">
            <Link href="/register">Sign In / Create Account</Link>
          </Button>
          {onClose && (
            <Button variant="outline" className="w-full" onClick={onClose}>
              Dismiss
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
