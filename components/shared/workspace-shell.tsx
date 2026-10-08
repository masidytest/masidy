'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useTheme } from 'next-themes'
import {
  ChevronRight,
  ChevronDown,
  FolderKanban,
  Home,
  LayoutTemplate,
  MessageSquare,
  PanelLeft,
  Palette,
  Plus,
  Search,
  Star,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { UserNav } from '@/components/user-nav'
import { useLocale } from '@/components/providers/locale-provider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface WorkspaceChat {
  id: string
  name?: string
  title?: string
  favorite?: boolean
  projectId?: string
  createdAt: string
  updatedAt?: string
  messages?: Array<{ role: string; content: string }>
}

interface WorkspaceProject {
  id: string
  name: string
}

interface WorkspaceShellProps {
  children: ReactNode
}

const getChatTitle = (chat: WorkspaceChat) =>
  chat.name ||
  chat.title ||
  chat.messages?.find((message) => message.role === 'user')?.content ||
  'Untitled chat'

export function WorkspaceShell({ children }: WorkspaceShellProps) {
  const { t } = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const { setTheme, theme } = useTheme()
  const appliedChatTheme = useRef(false)
  const {
    data: chatsResult,
    error: chatsError,
    isLoading: chatsLoading,
    mutate: refreshChats,
  } = useSWR<{ data: WorkspaceChat[] }>(session?.user?.id ? '/api/chats' : null)
  const {
    data: projectsResult,
    error: projectsError,
    mutate: refreshProjects,
  } = useSWR<{ data: WorkspaceProject[] }>(
    session?.user?.id ? '/api/projects' : null,
  )
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const isAuthPage = pathname === '/login' || pathname === '/register'
  const chats = chatsResult?.data || []
  const projects = projectsResult?.data || []
  const loading = chatsLoading
  const loadError = chatsError?.message || projectsError?.message || null

  useEffect(() => {
    if (!pathname.startsWith('/chats/') || appliedChatTheme.current) return
    appliedChatTheme.current = true
    if (theme !== 'dark') setTheme('dark')
  }, [pathname, setTheme, theme])

  useEffect(() => {
    try {
      setCollapsed(
        window.localStorage.getItem('masidy-sidebar-collapsed') === 'true',
      )
    } catch (error) {
      console.error('Could not restore sidebar preference:', error)
    }
  }, [pathname])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen((open) => !open)
      }
      if (event.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  useEffect(() => {
    if (!mobileOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [mobileOpen])

  const filteredChats = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const ordered = [...chats].sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt).getTime() -
        new Date(a.updatedAt || a.createdAt).getTime(),
    )
    if (!normalizedSearch) return ordered
    return ordered.filter(
      (chat) =>
        getChatTitle(chat).toLowerCase().includes(normalizedSearch) ||
        chat.messages?.some((message) =>
          message.content.toLowerCase().includes(normalizedSearch),
        ),
    )
  }, [chats, search])

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current
      try {
        window.localStorage.setItem('masidy-sidebar-collapsed', String(next))
      } catch (error) {
        console.error('Could not save sidebar preference:', error)
      }
      return next
    })
  }

  const closeMobile = () => setMobileOpen(false)
  const openChat = (id: string) => {
    setSearchOpen(false)
    setMobileOpen(false)
    router.push(`/chats/${id}`)
  }

  if (
    isAuthPage ||
    pathname === '/' ||
    ['/privacy', '/terms', '/cookies', '/acceptable-use'].includes(pathname)
  ) {
    return <>{children}</>
  }

  const sidebar = (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border bg-background transition-[width] duration-200',
        collapsed ? 'w-[4.25rem]' : 'w-52',
      )}
      aria-label={t('Workspace navigation')}
    >
      <div
        className={cn(
          'flex h-14 items-center border-b border-border px-3',
          collapsed ? 'justify-center' : 'justify-between',
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'h-9 min-w-0 justify-start gap-2 px-1 font-semibold',
                collapsed && 'w-9 justify-center px-0',
              )}
              aria-label={t('Select project workspace')}
              title={collapsed ? t("Masidy's projects") : undefined}
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
                M
              </span>
              {!collapsed && (
                <>
                  <span className="truncate text-left text-sm">
                    {t("Masidy's projects")}
                  </span>
                  <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuItem asChild>
              <Link href="/projects" onClick={closeMobile}>
                {t('All projects')}
              </Link>
            </DropdownMenuItem>
            {projects.length > 0 && <DropdownMenuSeparator />}
            {projects.slice(0, 8).map((project) => (
              <DropdownMenuItem key={project.id} asChild>
                <Link
                  href={`/projects/${encodeURIComponent(project.id)}`}
                  onClick={closeMobile}
                  className="min-w-0"
                >
                  <FolderKanban className="mr-2 size-4 shrink-0" />
                  <span className="truncate">{project.name}</span>
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={toggleCollapsed}
            aria-label={t('Collapse sidebar')}
            title={t('Collapse sidebar')}
          >
            <PanelLeft className="size-4" />
          </Button>
        )}
      </div>

      <div className="space-y-1 p-2">
        <div className="flex w-full">
          <Button
            asChild
            className={cn(
              'w-full justify-start gap-2',
              !collapsed && 'rounded-r-none',
              collapsed && 'justify-center px-0',
            )}
            title={collapsed ? 'New chat' : undefined}
          >
            <Link href="/" onClick={closeMobile}>
              <Plus className="size-4 shrink-0" />
              {!collapsed && <span>{t('New chat')}</span>}
            </Link>
          </Button>
          {!collapsed && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label={t('New chat options')}
                  className="shrink-0 rounded-l-none border-l border-primary-foreground/20 px-2"
                >
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/" onClick={closeMobile}>
                    <Plus className="mr-2 size-4" />
                    New chat
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/templates" onClick={closeMobile}>
                    <LayoutTemplate className="mr-2 size-4" />
                    Browse templates
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start gap-2 text-muted-foreground',
            collapsed && 'justify-center px-0',
          )}
          onClick={() => {
            setSearch('')
            setSearchOpen(true)
          }}
          title={collapsed ? 'Search chats' : undefined}
        >
          <Search className="size-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{t('Search chats')}</span>
              <kbd className="rounded border px-1 text-[10px]">Ctrl K</kbd>
            </>
          )}
        </Button>
      </div>

      <nav className="space-y-1 px-2" aria-label={t('Main navigation')}>
        <Button
          asChild
          variant={pathname === '/' ? 'secondary' : 'ghost'}
          className={cn(
            'w-full justify-start gap-2',
            collapsed && 'justify-center px-0',
          )}
          title={collapsed ? 'Home' : undefined}
        >
          <Link href="/" onClick={closeMobile}>
            <Home className="size-4 shrink-0" />
            {!collapsed && <span>{t('Home')}</span>}
          </Link>
        </Button>
        <Button
          asChild
          variant={pathname.startsWith('/projects') ? 'secondary' : 'ghost'}
          className={cn(
            'w-full justify-start gap-2',
            collapsed && 'justify-center px-0',
          )}
          title={collapsed ? 'Projects' : undefined}
        >
          <Link href="/projects" onClick={closeMobile}>
            <FolderKanban className="size-4 shrink-0" />
            {!collapsed && <span>{t('Projects')}</span>}
          </Link>
        </Button>
        <Button
          asChild
          variant={pathname === '/chats' ? 'secondary' : 'ghost'}
          className={cn(
            'w-full justify-start gap-2',
            collapsed && 'justify-center px-0',
          )}
          title={collapsed ? 'Chats' : undefined}
        >
          <Link href="/chats" onClick={closeMobile}>
            <MessageSquare className="size-4 shrink-0" />
            {!collapsed && <span>{t('Chats')}</span>}
          </Link>
        </Button>
        <Button
          asChild
          variant={
            pathname.startsWith('/design-systems') ? 'secondary' : 'ghost'
          }
          className={cn(
            'w-full justify-start gap-2',
            collapsed && 'justify-center px-0',
          )}
          title={collapsed ? 'Design Systems' : undefined}
        >
          <Link href="/design-systems" onClick={closeMobile}>
            <Palette className="size-4 shrink-0" />
            {!collapsed && <span>{t('Design Systems')}</span>}
          </Link>
        </Button>
        <Button
          asChild
          variant={pathname.startsWith('/templates') ? 'secondary' : 'ghost'}
          className={cn(
            'w-full justify-start gap-2',
            collapsed && 'justify-center px-0',
          )}
          title={collapsed ? 'Templates' : undefined}
        >
          <Link href="/templates" onClick={closeMobile}>
            <LayoutTemplate className="size-4 shrink-0" />
            {!collapsed && <span>{t('Templates')}</span>}
          </Link>
        </Button>
      </nav>

      {!collapsed && (
        <div className="mt-5 flex-1 space-y-5 overflow-y-auto px-2 pb-3">
          <section aria-labelledby="sidebar-favorites">
            <h2
              id="sidebar-favorites"
              className="px-2 pb-1 text-xs font-medium text-muted-foreground"
            >
              Favorites
            </h2>
            <div className="space-y-0.5">
              {chats
                .filter((chat) => chat.favorite)
                .slice(0, 6)
                .map((chat) => (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => openChat(chat.id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                    title={getChatTitle(chat)}
                  >
                    <Star className="size-4 shrink-0 fill-current" />
                    <span className="truncate">{getChatTitle(chat)}</span>
                  </button>
                ))}
              {chats.every((chat) => !chat.favorite) && (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">
                  No favorites yet
                </p>
              )}
            </div>
          </section>

          <section aria-labelledby="sidebar-drafts">
            <h2
              id="sidebar-drafts"
              className="px-2 pb-1 text-xs font-medium text-muted-foreground"
            >
              Drafts
            </h2>
            <div className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
              No drafts yet
            </div>
          </section>

          <section aria-labelledby="sidebar-projects">
            <div className="flex items-center justify-between px-2 pb-1">
              <h2
                id="sidebar-projects"
                className="text-xs font-medium text-muted-foreground"
              >
                Projects
              </h2>
              <Link
                href="/projects"
                onClick={closeMobile}
                aria-label={t('Manage projects')}
                title={t('Manage projects')}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Plus className="size-3.5" />
              </Link>
            </div>
            <div className="space-y-1">
              {projects.slice(0, 8).map((project) => {
                const projectChats = chats
                  .filter((chat) => chat.projectId === project.id)
                  .slice(0, 3)
                return (
                  <div key={project.id} className="space-y-0.5">
                    <Link
                      href={`/projects/${encodeURIComponent(project.id)}`}
                      onClick={closeMobile}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                      title={project.name}
                    >
                      <FolderKanban className="size-3.5 shrink-0" />
                      <span className="truncate">{project.name}</span>
                    </Link>
                    {projectChats.map((chat) => (
                      <button
                        key={chat.id}
                        type="button"
                        onClick={() => openChat(chat.id)}
                        className={cn(
                          'ml-3 flex w-[calc(100%-0.75rem)] items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm',
                          pathname === `/chats/${chat.id}`
                            ? 'bg-accent text-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                        )}
                        title={getChatTitle(chat)}
                      >
                        <span className="size-2 shrink-0 rounded-full border border-current" />
                        <span className="truncate">{getChatTitle(chat)}</span>
                      </button>
                    ))}
                  </div>
                )
              })}
              {projects.length === 0 && !loadError && (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">
                  Your projects will appear here.
                </p>
              )}
            </div>
          </section>

          <section aria-labelledby="sidebar-recent">
            <div className="flex items-center justify-between px-2 pb-1">
              <h2
                id="sidebar-recent"
                className="text-xs font-medium text-muted-foreground"
              >
                Recent chats
              </h2>
              <Link
                href="/chats"
                onClick={closeMobile}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                All
              </Link>
            </div>
            <div className="space-y-0.5">
              {loading && (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">
                  Loading chats…
                </p>
              )}
              {!loading &&
                chats
                  .filter((chat) => !chat.projectId)
                  .slice(0, 8)
                  .map((chat) => (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() => openChat(chat.id)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent',
                        pathname === `/chats/${chat.id}`
                          ? 'bg-accent text-foreground'
                          : 'text-muted-foreground',
                      )}
                      title={getChatTitle(chat)}
                    >
                      <MessageSquare className="size-4 shrink-0" />
                      <span className="truncate">{getChatTitle(chat)}</span>
                    </button>
                  ))}
              {!loading && chats.length === 0 && !loadError && (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">
                  Your chats will appear here.
                </p>
              )}
              {loadError && (
                <div className="space-y-1 px-2 py-1.5 text-xs text-destructive">
                  <p>{loadError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      void refreshChats()
                      void refreshProjects()
                    }}
                    className="underline"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {collapsed && <div className="flex-1" />}

      <div className="border-t border-border p-2">
        {collapsed ? (
          <UserNav session={session ?? null} collapsed />
        ) : (
          <UserNav session={session ?? null} />
        )}
      </div>
    </aside>
  )

  return (
    <div className="flex min-h-screen w-full">
      <div className="sticky top-0 hidden h-screen shrink-0 lg:block">
        {collapsed ? (
          <div className="relative h-screen w-0">
            <Button
              variant="outline"
              size="icon"
              className="fixed left-2 top-3 z-40 size-6 rounded-full bg-background"
              onClick={toggleCollapsed}
              aria-label={t('Expand sidebar')}
              title={t('Expand sidebar')}
            >
              <ChevronRight className="size-3" />
            </Button>
          </div>
        ) : (
          sidebar
        )}
      </div>

      <Button
        variant="outline"
        size="icon"
        className="fixed left-3 top-3 z-40 size-9 bg-background shadow lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label={t('Open workspace navigation')}
        aria-expanded={mobileOpen}
        aria-controls="workspace-mobile-navigation"
      >
        <PanelLeft className="size-4" />
      </Button>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={t('Close workspace navigation')}
            className="absolute inset-0 bg-black/50"
            onClick={closeMobile}
          />
          <div
            id="workspace-mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label={t('Workspace navigation')}
            className="absolute inset-y-0 left-0 shadow-xl"
          >
            {sidebar}
            <Button
              variant="outline"
              size="icon"
              className="absolute right-2 top-3 size-8"
              onClick={closeMobile}
              aria-label={t('Close workspace navigation')}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <main
        className={cn(
          'min-w-0 flex-1',
          pathname.startsWith('/chats/') && pathname !== '/chats'
            ? ''
            : 'pt-12 lg:pt-0',
        )}
      >
        {children}
      </main>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="top-[18%] max-w-xl translate-y-0 gap-3 p-3">
          <DialogTitle className="sr-only">{t('Search chats')}</DialogTitle>
          <DialogDescription className="sr-only">
            Search your chats by title or prompt.
          </DialogDescription>
          <div className="flex items-center gap-2 border-b pb-3">
            <Search className="size-4 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('Search your chats…')}
              aria-label={t('Search your chats')}
              className="border-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="max-h-[55vh] overflow-y-auto">
            {filteredChats.length > 0 ? (
              filteredChats.slice(0, 30).map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => openChat(chat.id)}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  {chat.favorite ? (
                    <Star className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate">{getChatTitle(chat)}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {chat.projectId
                      ? projects.find(
                          (project) => project.id === chat.projectId,
                        )?.name || 'Project'
                      : 'Chat'}
                  </span>
                </button>
              ))
            ) : (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                {loading
                  ? 'Loading chats…'
                  : search
                    ? 'No matching chats.'
                    : 'No chats yet.'}
              </p>
            )}
          </div>
          <div className="flex items-center justify-between border-t px-1 pt-2 text-xs text-muted-foreground">
            <span>{t('Search chats by title or prompt')}</span>
            <span>{t('Esc to close')}</span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
