'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowUpRight,
  ExternalLink,
  LayoutTemplate,
  Search,
  Sparkles,
} from 'lucide-react'
import { appTemplates, templateCategories } from '@/lib/workspace-catalog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function TemplatesClient() {
  const [category, setCategory] = useState('Browse All')
  const [search, setSearch] = useState('')
  const templates = useMemo(() => {
    const query = search.trim().toLowerCase()
    return appTemplates.filter(
      (template) =>
        !!template.source &&
        (category === 'Browse All' || template.category === category) &&
        (!query ||
          template.name.toLowerCase().includes(query) ||
          template.description.toLowerCase().includes(query) ||
          template.tags.some((tag) => tag.toLowerCase().includes(query))),
    )
  }, [category, search])

  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <header className="mx-auto max-w-3xl pb-12 pt-12 text-center sm:pb-16 sm:pt-16">
        <p className="text-sm font-medium text-muted-foreground">
          The Masidy template gallery
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">
          Start with a template
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Choose a complete MIT-licensed project. Select a template to prefill
          the builder, then submit your request to start from its real source
          code.
        </p>
        <div className="mx-auto mt-7 max-w-xl">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search templates..."
              aria-label="Search templates"
              className="h-12 rounded-xl pl-11 text-left"
            />
          </label>
        </div>
      </header>

      <section aria-labelledby="gallery-heading">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 id="gallery-heading" className="text-lg font-semibold">
            Categories
          </h2>
          <span className="text-sm text-muted-foreground">
            {templates.length}{' '}
            {templates.length === 1 ? 'template' : 'templates'}
          </span>
        </div>
        <nav
          aria-label="Template categories"
          className="mb-6 flex gap-2 overflow-x-auto pb-2"
        >
          {templateCategories.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
              className={`whitespace-nowrap rounded-full border px-3.5 py-2 text-sm transition-colors ${
                category === item
                  ? 'border-foreground bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {category === 'Browse All' ? 'Browse all templates' : category}
          </h3>
        </div>

        {templates.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <LayoutTemplate className="mx-auto size-8 text-muted-foreground" />
            <h3 className="mt-3 font-medium">No matching templates</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Change the search or select a different category.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {templates.map((template, index) => (
              <article
                key={template.id}
                className="group overflow-hidden rounded-2xl border bg-card transition-colors hover:border-foreground/30"
              >
                <Link
                  href={`/?template=${encodeURIComponent(template.id)}`}
                  aria-label={`Use ${template.name} template`}
                  className="block"
                >
                  <div
                    className={`flex aspect-[16/10] flex-col items-center justify-center gap-3 ${
                      index % 3 === 0
                        ? 'bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-muted'
                        : index % 3 === 1
                          ? 'bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-muted'
                          : 'bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-muted'
                    }`}
                  >
                    <LayoutTemplate className="size-8 text-foreground/70" />
                    <span className="text-sm font-medium text-foreground/80">
                      Complete source project
                    </span>
                    <span className="absolute right-7 top-7 rounded-full border bg-background/90 px-2.5 py-1 text-xs text-muted-foreground shadow-sm">
                      MIT · GitHub
                    </span>
                  </div>
                </Link>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-semibold">{template.name}</h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {template.description}
                      </p>
                    </div>
                    <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </div>
                  {template.source && (
                    <a
                      href={template.source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="size-3" />
                      Full source · {template.source.license}
                    </a>
                  )}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {template.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-5">
                    <Button asChild className="w-full">
                      <Link
                        href={`/?template=${encodeURIComponent(template.id)}`}
                      >
                        <Sparkles className="mr-2 size-4" />
                        Use this template
                      </Link>
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
