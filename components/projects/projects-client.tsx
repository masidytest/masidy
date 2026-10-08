'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import {
  FolderKanban,
  ListFilter,
  LoaderCircle,
  MessageSquare,
  Plus,
  Search,
  Shield,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { managedResourceLimits } from '@/lib/managed-resource-limits'
import { useLocale } from '@/components/providers/locale-provider'

interface Project {
  id: string
  name: string
  privacy: 'private' | 'team'
  createdAt: string
  updatedAt?: string
}

interface ProjectsResponse {
  data: Project[]
}

const fetcher = async (url: string): Promise<ProjectsResponse> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to load projects.')
  return response.json()
}

export function ProjectsClient() {
  const { locale, t } = useLocale()
  const { data, error, isLoading, mutate } = useSWR<ProjectsResponse>(
    '/api/projects',
    fetcher,
  )
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [privacyFilter, setPrivacyFilter] = useState<
    'all' | 'private' | 'team'
  >('all')
  const [updatedFilter, setUpdatedFilter] = useState<
    'any' | 'week' | 'month' | 'older'
  >('any')
  const [sortOrder, setSortOrder] = useState<
    'updated-desc' | 'updated-asc' | 'name-asc'
  >('updated-desc')
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const projects = data?.data || []
  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase()
    const now = Date.now()
    const cutoff =
      updatedFilter === 'week'
        ? now - 7 * 24 * 60 * 60 * 1000
        : updatedFilter === 'month'
          ? now - 30 * 24 * 60 * 60 * 1000
          : null
    const matches = projects.filter(
      (project) =>
        (!query || project.name.toLowerCase().includes(query)) &&
        (privacyFilter === 'all' || project.privacy === privacyFilter) &&
        (() => {
          if (updatedFilter === 'any') return true
          const updatedAt = new Date(
            project.updatedAt || project.createdAt,
          ).getTime()
          if (!Number.isFinite(updatedAt)) return false
          return updatedFilter === 'older'
            ? updatedAt < now - 30 * 24 * 60 * 60 * 1000
            : updatedAt >= cutoff!
        })(),
    )
    return matches.sort((a, b) => {
      if (sortOrder === 'name-asc') return a.name.localeCompare(b.name)
      const updatedA = new Date(a.updatedAt || a.createdAt).getTime()
      const updatedB = new Date(b.updatedAt || b.createdAt).getTime()
      return sortOrder === 'updated-desc'
        ? updatedB - updatedA
        : updatedA - updatedB
    })
  }, [projects, privacyFilter, search, sortOrder, updatedFilter])

  const activeFilterCount =
    Number(privacyFilter !== 'all') + Number(updatedFilter !== 'any')
  const hasActiveFilters = Boolean(search.trim()) || activeFilterCount > 0
  const hasReachedProjectLimit =
    projects.length >= managedResourceLimits.projectsPerUser

  const clearFilters = () => {
    setPrivacyFilter('all')
    setUpdatedFilter('any')
    setSortOrder('updated-desc')
  }

  const createProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim()) return
    setIsCreating(true)
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, instructions }),
      })
      const result = await response.json()
      if (!response.ok)
        throw new Error(result.error || 'Failed to create project.')
      await mutate()
      setCreateOpen(false)
      setName('')
      setDescription('')
      setInstructions('')
      toast({
        title: t('Project created'),
        description: `${result.name} is ready.`,
      })
    } catch (createError) {
      toast({
        title: t('Could not create project'),
        description:
          createError instanceof Error
            ? createError.message
            : t('Please try again.'),
        variant: 'destructive',
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{t('Workspace')}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {t('Projects')}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('Keep chats, project instructions, and builds together.')}
            </p>
            {hasReachedProjectLimit && (
              <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                {t('You reached your project limit.')}
              </p>
            )}
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            disabled={hasReachedProjectLimit}
          >
            <Plus className="mr-2 size-4" />
            {t('Add project')}
          </Button>
        </header>

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {projects.length} / {managedResourceLimits.projectsPerUser}{' '}
            {t('projects')}
          </span>
          <label className="relative min-w-60 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('Search projects')}
              aria-label={t('Search projects')}
              className="pl-9"
            />
          </label>
          <Button
            type="button"
            variant="outline"
            onClick={() => setFilterOpen(true)}
            aria-label={t('Filter projects')}
          >
            <ListFilter className="mr-2 size-4" />
            {t('Filters')}
            {activeFilterCount > 0 && (
              <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <label className="sr-only" htmlFor="project-sort">
            {t('Sort projects')}
          </label>
          <select
            id="project-sort"
            aria-label={t('Sort projects')}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={sortOrder}
            onChange={(event) =>
              setSortOrder(
                event.target.value as
                  | 'updated-desc'
                  | 'updated-asc'
                  | 'name-asc',
              )
            }
          >
            <option value="updated-desc">{t('Recently updated')}</option>
            <option value="updated-asc">{t('Least recently updated')}</option>
            <option value="name-asc">{t('Name A–Z')}</option>
          </select>
          <span className="text-sm text-muted-foreground">
            {filteredProjects.length}{' '}
            {t(filteredProjects.length === 1 ? 'project' : 'projects')}
          </span>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            {t('Loading projects…')}
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
          >
            <p>{error.message}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => void mutate()}
            >
              {t('Retry')}
            </Button>
          </div>
        )}
        {!isLoading && !error && filteredProjects.length === 0 && (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <FolderKanban className="mx-auto size-8 text-muted-foreground" />
            <h2 className="mt-3 font-medium">
              {hasActiveFilters
                ? t('No matching projects')
                : t('Create your first project')}
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              {hasActiveFilters
                ? t('Try a different project name or clear your search.')
                : t('Projects keep your chats and generation instructions organized in one workspace.')}
            </p>
            {hasActiveFilters ? (
              <Button
                variant="outline"
                className="mt-5"
                onClick={() => {
                  setSearch('')
                  clearFilters()
                }}
              >
                {t('Clear search and filters')}
              </Button>
            ) : (
              <Button
                className="mt-5"
                onClick={() => setCreateOpen(true)}
                disabled={hasReachedProjectLimit}
              >
                <Plus className="mr-2 size-4" />
                {t('Create project')}
              </Button>
            )}
          </div>
        )}
        {!isLoading && !error && filteredProjects.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${encodeURIComponent(project.id)}`}
                className="group rounded-xl border bg-card p-5 transition-colors hover:border-foreground/20 hover:bg-accent/30"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-muted p-2">
                    <FolderKanban className="size-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-medium group-hover:underline">
                      {project.name}
                    </h2>
                    <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted-foreground">
                      {project.updatedAt
                        ? `${t('Updated')} ${new Date(project.updatedAt).toLocaleDateString(locale === 'ar' ? 'ar' : 'en')}`
                        : t('Project workspace')}
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
                  <MessageSquare className="size-3.5" />
                  <span>{t('Open project workspace')}</span>
                  <span className="ml-auto inline-flex items-center gap-1 capitalize">
                    <Shield className="size-3.5" />
                    {project.privacy}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form onSubmit={createProject} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t('Create a project')}</DialogTitle>
              <DialogDescription>
                {t('Set up a workspace for related chats and consistent generation instructions.')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <label htmlFor="project-name" className="text-sm font-medium">
                {t('Name')}
              </label>
              <Input
                id="project-name"
                autoFocus
                maxLength={80}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('e.g. Marketing website')}
                required
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="project-description"
                className="text-sm font-medium"
              >
                {t('Description')}
              </label>
              <Input
                id="project-description"
                maxLength={500}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t('What belongs in this project?')}
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="project-instructions"
                className="text-sm font-medium"
              >
                {t('Generation instructions')}
              </label>
              <Textarea
                id="project-instructions"
                maxLength={4000}
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                placeholder={t('Shared requirements, tech choices, and visual direction')}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={isCreating}
              >
                {t('Cancel')}
              </Button>
              <Button
                type="submit"
                disabled={
                  !name.trim() || isCreating || hasReachedProjectLimit
                }
              >
                {isCreating && (
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                )}
                {t('Create project')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Filter projects')}</DialogTitle>
            <DialogDescription>
              {t('Narrow projects by visibility and when they were last updated.')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="project-visibility-filter"
                className="text-sm font-medium"
              >
                {t('Project visibility')}
              </label>
              <select
                id="project-visibility-filter"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={privacyFilter}
                onChange={(event) =>
                  setPrivacyFilter(
                    event.target.value as 'all' | 'private' | 'team',
                  )
                }
              >
                <option value="all">{t('All projects')}</option>
                <option value="private">{t('Private projects')}</option>
                <option value="team">{t('Team projects')}</option>
              </select>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="project-updated-filter"
                className="text-sm font-medium"
              >
                {t('Last updated')}
              </label>
              <select
                id="project-updated-filter"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={updatedFilter}
                onChange={(event) =>
                  setUpdatedFilter(
                    event.target.value as 'any' | 'week' | 'month' | 'older',
                  )
                }
              >
                <option value="any">{t('Any time')}</option>
                <option value="week">{t('Past 7 days')}</option>
                <option value="month">{t('Past 30 days')}</option>
                <option value="older">{t('More than 30 days ago')}</option>
              </select>
            </div>
          </div>
          <DialogFooter className="flex-row justify-between sm:justify-between">
            <Button type="button" variant="ghost" onClick={clearFilters}>
              <X className="mr-2 size-4" />
              {t('Clear filters')}
            </Button>
            <Button type="button" onClick={() => setFilterOpen(false)}>
              {t('Show')} {filteredProjects.length} {t('projects')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
