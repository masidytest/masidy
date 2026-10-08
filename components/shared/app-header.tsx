'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ChatSelector } from './chat-selector'
import { MobileMenu } from './mobile-menu'
import { useSession } from 'next-auth/react'
import { UserNav } from '@/components/user-nav'
import { BrandMark } from '@/components/brand-mark'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'

interface AppHeaderProps {
  className?: string
  chatTitle?: string
}

// Component that uses useSearchParams - needs to be wrapped in Suspense
function SearchParamsHandler() {
  const searchParams = useSearchParams()
  const { update } = useSession()

  // Force session refresh when redirected after auth
  useEffect(() => {
    const shouldRefresh = searchParams.get('refresh') === 'session'

    if (shouldRefresh) {
      // Force session update
      update()

      // Clean up URL without causing navigation
      const url = new URL(window.location.href)
      url.searchParams.delete('refresh')
      window.history.replaceState({}, '', url.pathname)
    }
  }, [searchParams, update])

  return null
}

export function AppHeader({ className = '', chatTitle }: AppHeaderProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isHomepage = pathname === '/'

  // Handle logo click - reset UI if on homepage, otherwise navigate to homepage
  const handleLogoClick = (e: React.MouseEvent) => {
    if (isHomepage) {
      e.preventDefault()
      // Add reset parameter to trigger UI reset
      window.location.href = '/?reset=true'
    }
    // If not on homepage, let the Link component handle navigation normally
  }

  return (
    <div
      className={`${!isHomepage ? 'border-b border-border dark:border-input' : ''} ${className}`}
    >
      {/* Handle search params with Suspense boundary */}
      <Suspense fallback={null}>
        <SearchParamsHandler />
      </Suspense>

      <div className="px-4 pl-14 sm:px-6 sm:pl-16 lg:px-8">
        <div className="flex items-center justify-between h-16 relative">
          {/* Left side - Logo and Selector */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              onClick={handleLogoClick}
              className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground transition-opacity duration-200 hover:opacity-80"
            >
              <BrandMark className="size-8 rounded-full" />
              <span>Masidy</span>
            </Link>
            {/* Hide ChatSelector on mobile */}
            <div className="hidden lg:block">
              <ChatSelector />
            </div>
          </div>

          {/* Center - Chat title (only on non-homepage when chatTitle provided) */}
          {!isHomepage && chatTitle && (
            <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2">
              <span className="text-sm font-medium text-muted-foreground truncate max-w-xs">
                {chatTitle}
              </span>
            </div>
          )}

          {/* Desktop right side - What's This, GitHub, Deploy, and User */}
          <div className="hidden lg:flex items-center gap-4">
            <ThemeToggle />
            <UserNav session={session} />
          </div>

          {/* Mobile right side - Only menu button and user avatar */}
          <div className="flex lg:hidden items-center gap-2">
            <ThemeToggle />
            <UserNav session={session} />
            <MobileMenu />
          </div>
        </div>
      </div>
    </div>
  )
}
