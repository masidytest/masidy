'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Check,
  ExternalLink,
  Layers3,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react'
import {
  builtInDesignSystems,
  customDesignSystemsStorageKey,
  type DesignSystemPreset,
} from '@/lib/workspace-catalog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'

type DesignSystemTab = 'DS 2.0' | 'Legacy' | 'Custom'

export function DesignSystemsClient() {
  const { toast } = useToast()
  const [tab, setTab] = useState<DesignSystemTab>('DS 2.0')
  const [search, setSearch] = useState('')
  const [customSystems, setCustomSystems] = useState<DesignSystemPreset[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(customDesignSystemsStorageKey)
      if (!stored) return
      const parsed: unknown = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        setCustomSystems(
          parsed.filter(
            (item): item is DesignSystemPreset =>
              !!item &&
              typeof item === 'object' &&
              'id' in item &&
              typeof item.id === 'string' &&
              'name' in item &&
              typeof item.name === 'string' &&
              'instructions' in item &&
              typeof item.instructions === 'string',
          ),
        )
      }
    } catch (error) {
      console.error('Could not load custom design systems:', error)
      toast({
        title: 'Could not load saved design systems',
        description: 'Your browser storage may be unavailable or corrupted.',
        variant: 'destructive',
      })
    }
  }, [toast])

  const systems = useMemo(() => {
    const all = [...builtInDesignSystems, ...customSystems]
    const query = search.trim().toLowerCase()
    return all.filter(
      (system) =>
        system.category === tab &&
        (!query ||
          system.name.toLowerCase().includes(query) ||
          system.description.toLowerCase().includes(query)),
    )
  }, [customSystems, search, tab])

  const createSystem = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const item: DesignSystemPreset = {
      id: `custom-${crypto.randomUUID()}`,
      name: name.trim(),
      description: description.trim() || 'Custom design system',
      instructions: instructions.trim(),
      category: 'Custom',
    }
    const next = [item, ...customSystems]
    try {
      window.localStorage.setItem(
        customDesignSystemsStorageKey,
        JSON.stringify(next),
      )
      setCustomSystems(next)
      setTab('Custom')
      setCreateOpen(false)
      setName('')
      setDescription('')
      setInstructions('')
      toast({
        title: 'Design system saved',
        description: 'Ready to use in a new chat.',
      })
    } catch (error) {
      console.error('Could not save custom design system:', error)
      toast({
        title: 'Could not save design system',
        description: 'Your browser storage may be unavailable.',
        variant: 'destructive',
      })
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Workspace</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Design Systems
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Choose a visual direction for the next generation, or save your own
            reusable design instructions.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-4" />
          New
        </Button>
      </header>

      <div className="mt-7 flex flex-wrap items-center gap-2 border-b">
        {(['DS 2.0', 'Legacy', 'Custom'] as const).map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setTab(category)}
            className={`rounded-t-md px-3 py-2 text-sm transition-colors ${
              tab === category
                ? 'bg-muted font-medium text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {category}
            {category === 'Custom' && customSystems.length > 0 && (
              <span className="ml-2 rounded-full bg-background px-1.5 py-0.5 text-xs">
                {customSystems.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <label className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search design systems"
            aria-label="Search design systems"
            className="pl-9"
          />
        </label>
        <span className="text-sm text-muted-foreground">
          {systems.length} {systems.length === 1 ? 'system' : 'systems'}
        </span>
      </div>

      {systems.length > 0 ? (
        <section
          aria-label={`${tab} design systems`}
          className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {systems.map((system) => (
            <article
              key={system.id}
              className="flex min-h-56 flex-col rounded-xl border bg-card p-5"
            >
              <div className="mb-4 grid size-11 place-items-center rounded-lg bg-muted">
                <Layers3 className="size-5 text-muted-foreground" />
              </div>
              <h2 className="font-semibold">{system.name}</h2>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">
                {system.description}
              </p>
              <Button asChild variant="outline" className="mt-5 w-full">
                <Link href={`/?designSystem=${encodeURIComponent(system.id)}`}>
                  <Sparkles className="mr-2 size-4" />
                  Use in new chat
                </Link>
              </Button>
            </article>
          ))}
        </section>
      ) : (
        <div className="mt-7 rounded-xl border border-dashed p-10 text-center">
          <Layers3 className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-3 font-medium">
            {search
              ? 'No matching design systems'
              : 'No custom design systems yet'}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {search
              ? 'Try another search.'
              : 'Save your project conventions and visual direction as a reusable profile.'}
          </p>
          {!search && (
            <Button className="mt-5" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 size-4" />
              Create a design system
            </Button>
          )}
        </div>
      )}

      <p className="mt-8 flex items-start gap-2 text-xs text-muted-foreground">
        <ExternalLink className="mt-0.5 size-3.5 shrink-0" />
        Presets guide Masidy generation through project instructions; they do
        not install external component packages.
      </p>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form onSubmit={createSystem} className="space-y-4">
            <DialogHeader>
              <DialogTitle>New design system</DialogTitle>
              <DialogDescription>
                Create a reusable visual and implementation guide for future
                chats in this browser.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <label
                htmlFor="design-system-name"
                className="text-sm font-medium"
              >
                Name
              </label>
              <Input
                id="design-system-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                required
                placeholder="e.g. Masidy brand"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="design-system-description"
                className="text-sm font-medium"
              >
                Description
              </label>
              <Input
                id="design-system-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={240}
                placeholder="A short note about this design system"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="design-system-instructions"
                className="text-sm font-medium"
              >
                Design and coding instructions
              </label>
              <Textarea
                id="design-system-instructions"
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                maxLength={4000}
                rows={5}
                required
                placeholder="Describe colors, typography, spacing, components, and constraints"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!name.trim() || !instructions.trim()}
              >
                <Check className="mr-2 size-4" />
                Save system
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  )
}
