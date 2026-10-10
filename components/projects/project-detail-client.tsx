'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import {
  ArrowLeft,
  BadgeCheck,
  CircleAlert,
  CopyPlus,
  Database,
  ExternalLink,
  FolderKanban,
  Globe2,
  KeyRound,
  LoaderCircle,
  MessageSquare,
  Plus,
  Settings2,
  Trash2,
} from 'lucide-react'
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
import { useLocale } from '@/components/providers/locale-provider'
import { managedResourceLimits } from '@/lib/managed-resource-limits'
import type { MarketplaceMetadataField } from '@/lib/vercel-marketplace-utils'

interface ProjectChat {
  id: string
  name?: string
  title?: string
  createdAt: string
  updatedAt?: string
}

interface ProjectDetail {
  id: string
  name: string
  description?: string
  instructions?: string
  privacy: 'private' | 'team'
  chats: Array<
    ProjectChat & {
      latestVersion?: {
        id: string
        status: 'pending' | 'completed' | 'failed'
        demoUrl?: string
        createdAt: string
      }
    }
  >
}

interface WorkspaceChat extends ProjectChat {
  projectId?: string
}

interface ProjectEnvironmentVariable {
  id: string
  key: string
  createdAt: number
  updatedAt?: number
}

interface ProjectDeployment {
  id: string
  chatId: string
  chatName: string
  versionId: string
  webUrl: string
  inspectorUrl: string
}

interface ProjectDomain {
  name: string
  verified: boolean
  verification?: Array<{
    type: string
    domain?: string
    value?: string
    reason?: string
  }>
}

interface MarketplaceProduct {
  installationId: string
  integrationId: string
  integrationSlug: string
  integrationName: string
  productId: string
  productSlug: string
  productName: string
  description?: string
  freePlan: { id: string; name: string } | null
  metadataFields: MarketplaceMetadataField[]
  metadataSupported: boolean
}

interface MarketplaceIntegration {
  id: string
  provider: string
  productSlug: string
  productName: string
  resourceName: string
  status: 'connected' | 'disconnected'
}

interface MarketplaceResponse {
  catalog: MarketplaceProduct[]
  integrations: MarketplaceIntegration[]
  canManage: boolean
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()
  if (!response.ok) {
    throw new Error(
      data.details || data.error || 'Could not load project.',
    )
  }
  return data
}

const getChatTitle = (chat: ProjectChat) =>
  chat.name || chat.title || `Chat ${chat.id.slice(0, 8)}`

export function ProjectDetailClient() {
  const { t } = useLocale()
  const params = useParams<{ projectId: string }>()
  const projectId = params.projectId
  const router = useRouter()
  const { toast } = useToast()
  const {
    data: project,
    error,
    isLoading,
    mutate,
  } = useSWR<ProjectDetail>(
    projectId ? `/api/projects/${encodeURIComponent(projectId)}` : null,
    fetcher,
  )
  const { data: chatsResponse, mutate: refreshChats } = useSWR<{
    data: WorkspaceChat[]
  }>('/api/chats')
  const {
    data: environmentVariables,
    error: environmentVariablesError,
    isLoading: environmentVariablesLoading,
    mutate: refreshEnvironmentVariables,
  } = useSWR<{ data: ProjectEnvironmentVariable[] }>(
    projectId
      ? `/api/projects/${encodeURIComponent(projectId)}/env-vars`
      : null,
    fetcher,
  )
  const {
    data: deploymentResponse,
    error: deploymentsError,
    isLoading: deploymentsLoading,
    mutate: refreshDeployments,
  } = useSWR<{ data: ProjectDeployment[] }>(
    projectId
      ? `/api/projects/${encodeURIComponent(projectId)}/deployments`
      : null,
    fetcher,
  )
  const {
    data: domainsResponse,
    error: domainsError,
    isLoading: domainsLoading,
    mutate: refreshDomains,
  } = useSWR<{ data: ProjectDomain[]; limit: number }>(
    projectId
      ? `/api/projects/${encodeURIComponent(projectId)}/domains`
      : null,
    fetcher,
  )
  const {
    data: marketplace,
    error: marketplaceError,
    isLoading: marketplaceLoading,
    mutate: refreshMarketplace,
  } = useSWR<MarketplaceResponse>(
    projectId
      ? `/api/projects/${encodeURIComponent(projectId)}/integrations`
      : null,
    fetcher,
  )
  const [name, setName] = useState('')
  const [instructions, setInstructions] = useState('')
  const [privacy, setPrivacy] = useState<'private' | 'team'>('private')
  const [isSaving, setIsSaving] = useState(false)
  const [selectedChatId, setSelectedChatId] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [deployingChatId, setDeployingChatId] = useState<string | null>(null)
  const [forkingChatId, setForkingChatId] = useState<string | null>(null)
  const [deploymentUrls, setDeploymentUrls] = useState<Record<string, string>>(
    {},
  )
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [envKey, setEnvKey] = useState('')
  const [envValue, setEnvValue] = useState('')
  const [isSavingEnv, setIsSavingEnv] = useState(false)
  const [envToDelete, setEnvToDelete] =
    useState<ProjectEnvironmentVariable | null>(null)
  const [isDeletingEnv, setIsDeletingEnv] = useState(false)
  const [selectedMarketplaceProduct, setSelectedMarketplaceProduct] =
    useState<MarketplaceProduct | null>(null)
  const [marketplaceActionId, setMarketplaceActionId] = useState<string | null>(
    null,
  )
  const [domainName, setDomainName] = useState('')
  const [isAddingDomain, setIsAddingDomain] = useState(false)
  const [domainAction, setDomainAction] = useState<string | null>(null)
  const [domainToRemove, setDomainToRemove] = useState<ProjectDomain | null>(
    null,
  )

  useEffect(() => {
    if (!project || settingsOpen) return
    setName(project.name)
    setInstructions(project.instructions || '')
    setPrivacy(project.privacy)
  }, [project, settingsOpen])

  const availableChats = useMemo(() => {
    const inProject = new Set(project?.chats.map((chat) => chat.id) || [])
    return (chatsResponse?.data || []).filter(
      (chat) => !inProject.has(chat.id) && chat.projectId !== projectId,
    )
  }, [chatsResponse, project?.chats, projectId])

  const saveProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, instructions, privacy }),
        },
      )
      const result = await response.json()
      if (!response.ok)
        throw new Error(result.error || 'Could not save project.')
      await mutate(result)
      setSettingsOpen(false)
      toast({ title: 'Project updated' })
    } catch (saveError) {
      toast({
        title: 'Could not update project',
        description:
          saveError instanceof Error ? saveError.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const assignChat = async () => {
    if (!selectedChatId) return
    setIsAssigning(true)
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/assign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId: selectedChatId }),
        },
      )
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not add chat.')
      setSelectedChatId('')
      await Promise.all([mutate(), refreshChats()])
      toast({ title: 'Chat added to project' })
    } catch (assignError) {
      toast({
        title: 'Could not add chat',
        description:
          assignError instanceof Error
            ? assignError.message
            : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsAssigning(false)
    }
  }

  const deleteProject = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}`,
        { method: 'DELETE' },
      )
      const result = await response.json()
      if (!response.ok)
        throw new Error(result.error || 'Could not delete project.')
      toast({ title: 'Project deleted', description: 'Its chats were kept.' })
      router.push('/projects')
    } catch (deleteError) {
      toast({
        title: 'Could not delete project',
        description:
          deleteError instanceof Error
            ? deleteError.message
            : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const deployVersion = async (chatId: string, versionId: string) => {
    setDeployingChatId(chatId)
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/vercel-deployments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId, versionId }),
        },
      )
      const result = await response.json()
      if (!response.ok)
        throw new Error(result.error || 'Could not deploy version.')
      if (result.webUrl) {
        setDeploymentUrls((previous) => ({
          ...previous,
          [chatId]: result.webUrl,
        }))
      }
      await refreshDeployments()
      toast({
        title: 'Vercel deployment started',
        description: result.webUrl
          ? `Your production deployment is available at ${result.webUrl}`
          : 'The deployment request was accepted.',
      })
    } catch (deployError) {
      toast({
        title: 'Could not deploy this version',
        description:
          deployError instanceof Error
            ? deployError.message
            : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setDeployingChatId(null)
    }
  }

  const forkChat = async (chatId: string) => {
    setForkingChatId(chatId)
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/fork`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId }),
        },
      )
      const result = await response.json()
      if (!response.ok)
        throw new Error(result.error || 'Could not fork this chat.')
      toast({
        title: 'Chat forked',
        description: 'A private copy was added to this project.',
      })
      await Promise.all([mutate(), refreshChats()])
      router.push(`/chats/${encodeURIComponent(result.id)}`)
    } catch (forkError) {
      toast({
        title: 'Could not fork chat',
        description:
          forkError instanceof Error ? forkError.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setForkingChatId(null)
    }
  }

  const saveEnvironmentVariable = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()
    setIsSavingEnv(true)
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/env-vars`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: envKey, value: envValue }),
        },
      )
      const result = await response.json()
      if (!response.ok)
        throw new Error(result.error || 'Could not save the variable.')
      setEnvKey('')
      setEnvValue('')
      await refreshEnvironmentVariables()
      toast({
        title: 'Environment variable saved',
        description: 'Its value is hidden after saving.',
      })
    } catch (saveError) {
      toast({
        title: 'Could not save environment variable',
        description:
          saveError instanceof Error ? saveError.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingEnv(false)
    }
  }

  const deleteEnvironmentVariable = async () => {
    if (!envToDelete) return
    setIsDeletingEnv(true)
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/env-vars`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: envToDelete.id }),
        },
      )
      const result = await response.json()
      if (!response.ok)
        throw new Error(result.error || 'Could not delete the variable.')
      await refreshEnvironmentVariables()
      setEnvToDelete(null)
      toast({ title: 'Environment variable deleted' })
    } catch (deleteError) {
      toast({
        title: 'Could not delete environment variable',
        description:
          deleteError instanceof Error
            ? deleteError.message
            : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsDeletingEnv(false)
    }
  }

  const addMarketplaceResource = async (
    event: React.FormEvent<HTMLFormElement>,
    product: MarketplaceProduct,
  ) => {
    event.preventDefault()
    setMarketplaceActionId(product.productId)
    try {
      const formData = new FormData(event.currentTarget)
      const metadataEntries: Array<[string, string | boolean]> = []
      for (const field of product.metadataFields) {
        const value = formData.get(field.name)
        if (field.type === 'boolean') {
          metadataEntries.push([field.name, value === 'on'])
        } else if (typeof value === 'string' && value !== '') {
          metadataEntries.push([field.name, value])
        }
      }
      const metadata = Object.fromEntries(metadataEntries)
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/integrations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            installationId: product.installationId,
            productId: product.productId,
            metadata,
          }),
        },
      )
      const result = await response.json()
      if (!response.ok)
        throw new Error(result.error || 'Could not add this integration.')
      setSelectedMarketplaceProduct(null)
      await refreshMarketplace()
      toast({
        title: 'Marketplace resource added',
        description: `${product.productName} is connected to this project.`,
      })
    } catch (addError) {
      toast({
        title: 'Could not add Marketplace resource',
        description:
          addError instanceof Error ? addError.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setMarketplaceActionId(null)
    }
  }

  const toggleMarketplaceResource = async (
    integration: MarketplaceIntegration,
  ) => {
    setMarketplaceActionId(integration.id)
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/integrations`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: integration.id,
            action:
              integration.status === 'connected' ? 'disconnect' : 'connect',
          }),
        },
      )
      const result = await response.json()
      if (!response.ok)
        throw new Error(result.error || 'Could not update this resource.')
      await refreshMarketplace()
      toast({
        title:
          integration.status === 'connected'
            ? 'Marketplace resource disconnected'
            : 'Marketplace resource connected',
        description: integration.productName,
      })
    } catch (actionError) {
      toast({
        title: 'Could not update Marketplace resource',
        description:
          actionError instanceof Error ? actionError.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setMarketplaceActionId(null)
    }
  }

  const addDomain = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsAddingDomain(true)
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/domains`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain: domainName }),
        },
      )
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not add domain.')
      setDomainName('')
      await refreshDomains()
      toast({
        title: 'Domain added',
        description: result.data?.verified
          ? 'The domain is connected and verified.'
          : 'Follow the DNS verification records shown below.',
      })
    } catch (addError) {
      toast({
        title: 'Could not add domain',
        description:
          addError instanceof Error ? addError.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsAddingDomain(false)
    }
  }

  const verifyDomain = async (domain: ProjectDomain) => {
    setDomainAction(domain.name)
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain.name)}/verify`,
        { method: 'POST' },
      )
      const result = await response.json()
      if (!response.ok)
        throw new Error(result.error || 'Could not verify this domain.')
      await refreshDomains()
      toast({
        title: result.data?.verified ? 'Domain verified' : 'Verification pending',
        description: result.data?.verified
          ? 'The domain is ready to use.'
          : 'Vercel could not verify the DNS records yet.',
      })
    } catch (verifyError) {
      toast({
        title: 'Could not verify domain',
        description:
          verifyError instanceof Error
            ? verifyError.message
            : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setDomainAction(null)
    }
  }

  const removeDomain = async () => {
    if (!domainToRemove) return
    setDomainAction(domainToRemove.name)
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/domains`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain: domainToRemove.name }),
        },
      )
      const result = await response.json()
      if (!response.ok)
        throw new Error(result.error || 'Could not remove this domain.')
      await refreshDomains()
      setDomainToRemove(null)
      toast({
        title: 'Domain removed',
        description: 'The domain is no longer connected to this project.',
      })
    } catch (removeError) {
      toast({
        title: 'Could not remove domain',
        description:
          removeError instanceof Error
            ? removeError.message
            : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setDomainAction(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" />
        Loading project…
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p role="alert" className="text-sm text-destructive">
          {error?.message || 'Project not found.'}
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/projects">
            <ArrowLeft className="mr-2 size-4" />
            Back to projects
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/projects"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Projects
      </Link>

      <header className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-xl bg-muted p-3">
            <FolderKanban className="size-6 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{t('Project workspace')}</p>
            <h1 className="mt-1 truncate text-3xl font-semibold tracking-tight">
              {project.name}
            </h1>
            {project.description && (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                {project.description}
              </p>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={() => setSettingsOpen(true)}>
          <Settings2 className="mr-2 size-4" />
          Project settings
        </Button>
      </header>

      <section className="mt-8 rounded-xl border bg-card p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-lg bg-muted p-2">
            <Database className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">{t('Vercel Marketplace')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(
                'Add resources from Masidy’s installed Vercel Marketplace integrations. Only verified free plans can be provisioned. Disconnecting unlinks a resource but does not delete or cancel it.',
              )}
            </p>
          </div>
        </div>

        {marketplaceError ? (
          <p role="alert" className="mb-4 text-sm text-destructive">
            {marketplaceError instanceof Error
              ? marketplaceError.message
              : t('Could not load Marketplace integrations. Refresh to try again.')}
          </p>
        ) : marketplaceLoading || !marketplace ? (
          <div className="mb-4 flex items-center gap-2 rounded-lg border p-3 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            {t('Loading Marketplace integrations…')}
          </div>
        ) : (
          <div className="space-y-6">
            {(marketplace?.integrations.length ?? 0) > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">
                  {t('Project resources')}
                </h3>
                {marketplace?.integrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
                  >
                    <BadgeCheck
                      className={`size-4 shrink-0 ${
                        integration.status === 'connected'
                          ? 'text-emerald-600'
                          : 'text-muted-foreground'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {integration.productName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {integration.resourceName} ·{' '}
                        {integration.status === 'connected'
                          ? t('Connected')
                          : t('Disconnected')}
                      </p>
                    </div>
                    {marketplace.canManage && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => toggleMarketplaceResource(integration)}
                        disabled={marketplaceActionId === integration.id}
                      >
                        {marketplaceActionId === integration.id && (
                          <LoaderCircle className="mr-2 size-4 animate-spin" />
                        )}
                        {integration.status === 'connected'
                          ? t('Disconnect')
                          : t('Reconnect')}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {marketplace.canManage ? (
              <div className="space-y-3">
                <h3 className="text-sm font-medium">
                  {t('Available Marketplace products')}
                </h3>
                {marketplace.catalog.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                    {t('No Marketplace products are installed for Masidy yet.')}
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {marketplace.catalog.map((product) => {
                      const canProvision =
                        Boolean(product.freePlan) && product.metadataSupported
                      const isSelected =
                        selectedMarketplaceProduct?.installationId ===
                          product.installationId &&
                        selectedMarketplaceProduct.productId ===
                          product.productId
                      const alreadyConnected = marketplace.integrations.some(
                        (integration) =>
                          integration.provider === product.integrationSlug,
                      )
                      return (
                        <article
                          key={`${product.installationId}:${product.productId}`}
                          className="rounded-lg border p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium">{product.productName}</p>
                              <p className="text-xs text-muted-foreground">
                                {product.integrationName}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs">
                              {product.freePlan
                                ? product.freePlan.name
                                : t('Paid plan unavailable')}
                            </span>
                          </div>
                          {product.description && (
                            <p className="mt-2 text-sm text-muted-foreground">
                              {product.description}
                            </p>
                          )}
                          {!product.metadataSupported && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {t('This product requires unsupported setup fields.')}
                            </p>
                          )}
                          {alreadyConnected ? (
                            <p className="mt-3 text-xs text-muted-foreground">
                              {t('A resource from this integration is already added.')}
                            </p>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              className="mt-3"
                              disabled={
                                !canProvision ||
                                marketplaceActionId !== null
                              }
                              onClick={() =>
                                setSelectedMarketplaceProduct(
                                  isSelected ? null : product,
                                )
                              }
                            >
                              {canProvision
                                ? isSelected
                                  ? t('Cancel')
                                  : t('Add to project')
                                : t('Unavailable')}
                            </Button>
                          )}
                          {isSelected && canProvision && (
                            <form
                              className="mt-4 space-y-3 border-t pt-4"
                              onSubmit={(event) =>
                                addMarketplaceResource(event, product)
                              }
                            >
                              {product.metadataFields.map((field) => (
                                <label
                                  key={field.name}
                                  className="block space-y-1 text-sm"
                                >
                                  <span className="font-medium">
                                    {field.title}
                                    {field.required ? ' *' : ''}
                                  </span>
                                  {field.description && (
                                    <span className="block text-xs text-muted-foreground">
                                      {field.description}
                                    </span>
                                  )}
                                  {field.type === 'boolean' ? (
                                    <input
                                      type="checkbox"
                                      name={field.name}
                                      defaultChecked={Boolean(field.default)}
                                      className="size-4 accent-primary"
                                    />
                                  ) : field.enum?.length ? (
                                    <select
                                      name={field.name}
                                      defaultValue={
                                        field.default === undefined
                                          ? ''
                                          : String(field.default)
                                      }
                                      required={field.required}
                                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                    >
                                      <option value="">
                                        {t('Choose an option')}
                                      </option>
                                      {field.enum.map((value) => (
                                        <option
                                          key={String(value)}
                                          value={String(value)}
                                        >
                                          {String(value)}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <Input
                                      name={field.name}
                                      type={
                                        field.type === 'number' ||
                                        field.type === 'integer'
                                          ? 'number'
                                          : 'text'
                                      }
                                      step={
                                        field.type === 'integer' ? '1' : 'any'
                                      }
                                      defaultValue={
                                        field.default === undefined
                                          ? ''
                                          : String(field.default)
                                      }
                                      required={field.required}
                                    />
                                  )}
                                </label>
                              ))}
                              <Button
                                type="submit"
                                disabled={marketplaceActionId !== null}
                              >
                                {marketplaceActionId === product.productId && (
                                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                                )}
                                {t('Provision free resource')}
                              </Button>
                            </form>
                          )}
                        </article>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                {t('Only the project owner can manage integrations.')}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="mt-8 rounded-xl border bg-card p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-lg bg-muted p-2">
            <KeyRound className="size-4 text-muted-foreground" />
          </div>
          <div>
            <h2 className="font-semibold">{t('Environment variables')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Store project secrets for generated apps. Values are never shown
              again after saving.
            </p>
          </div>
        </div>

        {environmentVariablesError ? (
          <p role="alert" className="mb-4 text-sm text-destructive">
            Could not load environment variables. Refresh the page to try again.
          </p>
        ) : environmentVariablesLoading ? (
          <div className="mb-4 flex items-center gap-2 rounded-lg border p-3 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Loading environment variables…
          </div>
        ) : (
          <div className="mb-4 divide-y rounded-lg border">
            {(environmentVariables?.data || []).length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">
                No environment variables have been added.
              </p>
            ) : (
              environmentVariables?.data.map((variable) => (
                <div key={variable.id} className="flex items-center gap-3 p-3">
                  <code className="min-w-0 flex-1 truncate text-sm">
                    {variable.key}
                  </code>
                  <span className="text-xs text-muted-foreground">
                    {t('Value hidden')}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete environment variable ${variable.key}`}
                    onClick={() => setEnvToDelete(variable)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        )}

        <form
          onSubmit={saveEnvironmentVariable}
          className="grid gap-2 sm:grid-cols-[1fr_1.5fr_auto]"
        >
          <Input
            value={envKey}
            onChange={(event) => setEnvKey(event.target.value)}
            placeholder="VARIABLE_NAME"
            aria-label={t('Environment variable name')}
            autoCapitalize="off"
            autoComplete="off"
            pattern="[A-Za-z_][A-Za-z0-9_]*"
            maxLength={128}
            required
          />
          <Input
            type="password"
            value={envValue}
            onChange={(event) => setEnvValue(event.target.value)}
            placeholder={t('Secret value')}
            aria-label={t('Environment variable value')}
            autoComplete="new-password"
            maxLength={8192}
            required
          />
          <Button type="submit" disabled={isSavingEnv}>
            {isSavingEnv && (
              <LoaderCircle className="mr-2 size-4 animate-spin" />
            )}
            Save variable
          </Button>
        </form>
      </section>

      <section className="mt-8 rounded-xl border bg-card p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-lg bg-muted p-2">
            <Globe2 className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">{t('Custom domains')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Connect a domain you own. DNS changes may be needed before it
              becomes live.
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {(domainsResponse?.data || []).length} /{' '}
            {managedResourceLimits.customDomainsPerProject}
          </span>
        </div>

        {domainsError ? (
          <p role="alert" className="mb-4 text-sm text-destructive">
            {domainsError.message}
          </p>
        ) : domainsLoading ? (
          <div className="mb-4 flex items-center gap-2 rounded-lg border p-3 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Loading domains…
          </div>
        ) : (domainsResponse?.data || []).length === 0 ? (
          <p className="mb-4 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            No custom domains are connected yet.
          </p>
        ) : (
          <div className="mb-4 divide-y rounded-lg border">
            {domainsResponse?.data.map((domain) => (
              <div key={domain.name} className="space-y-3 p-3">
                <div className="flex flex-wrap items-center gap-3">
                  {domain.verified ? (
                    <BadgeCheck className="size-4 shrink-0 text-emerald-600" />
                  ) : (
                    <CircleAlert className="size-4 shrink-0 text-amber-600" />
                  )}
                  <a
                    href={`https://${domain.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                  >
                    {domain.name}
                    <ExternalLink className="ml-1 inline size-3" />
                  </a>
                  <span className="text-xs text-muted-foreground">
                    {domain.verified ? 'Verified' : 'Needs verification'}
                  </span>
                  {!domain.verified && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void verifyDomain(domain)}
                      disabled={domainAction !== null}
                    >
                      {domainAction === domain.name && (
                        <LoaderCircle className="mr-2 size-3.5 animate-spin" />
                      )}
                      Verify
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setDomainToRemove(domain)}
                    disabled={domainAction !== null}
                  >
                    Remove
                  </Button>
                </div>
                {!domain.verified && domain.verification?.length ? (
                  <div className="rounded-md bg-muted/50 p-3 text-xs">
                    <p className="font-medium">{t('DNS verification records')}</p>
                    {domain.verification.map((record, index) => (
                      <div
                        key={`${domain.name}-${record.type}-${index}`}
                        className="mt-2 grid gap-1 sm:grid-cols-[auto_1fr]"
                      >
                        <span className="text-muted-foreground">
                          {record.type}
                        </span>
                        <code className="break-all">
                          {record.domain || domain.name}
                          {record.value ? ` → ${record.value}` : ''}
                        </code>
                        {record.reason && (
                          <span className="text-muted-foreground sm:col-span-2">
                            {record.reason}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}

        <form
          onSubmit={addDomain}
          className="grid gap-2 sm:grid-cols-[1fr_auto]"
        >
          <Input
            type="text"
            value={domainName}
            onChange={(event) => setDomainName(event.target.value)}
            placeholder="app.example.com"
            aria-label={t('Custom domain')}
            autoCapitalize="off"
            autoComplete="url"
            maxLength={253}
            required
          />
          <Button
            type="submit"
            disabled={
              !domainName.trim() ||
              isAddingDomain ||
              domainsLoading ||
              (domainsResponse?.data.length ?? 0) >=
                managedResourceLimits.customDomainsPerProject
            }
          >
            {isAddingDomain && (
              <LoaderCircle className="mr-2 size-4 animate-spin" />
            )}
            Add domain
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          Domain registration and DNS provider changes are not included.
        </p>
      </section>

      <section className="mt-8">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">{t('Production deployments')}</h2>
          <p className="text-sm text-muted-foreground">
            Latest deployments for this project’s completed chats.
          </p>
        </div>
        {deploymentsError ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive"
          >
            Could not load deployments. Refresh the page to try again.
          </p>
        ) : deploymentsLoading ? (
          <div className="flex items-center gap-2 rounded-xl border p-6 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Loading deployments…
          </div>
        ) : (deploymentResponse?.data || []).length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            No production deployments found for this project yet.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {deploymentResponse?.data.map((deployment) => (
              <article
                key={deployment.id}
                className="flex min-w-0 items-center gap-3 rounded-xl border bg-card p-4"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-medium">
                    {deployment.chatName}
                  </h3>
                  <a
                    href={deployment.webUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block truncate text-xs text-primary hover:underline"
                  >
                    {deployment.webUrl}
                  </a>
                </div>
                <Button asChild variant="outline" size="sm">
                  <a
                    href={deployment.inspectorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Details
                    <ExternalLink className="ml-2 size-3.5" />
                  </a>
                </Button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-9">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t('Chats')}</h2>
            <p className="text-sm text-muted-foreground">
              {project.chats.length}{' '}
              {project.chats.length === 1 ? 'chat' : 'chats'} in this project
            </p>
          </div>
          <div className="flex items-center gap-2">
            {availableChats.length > 0 && (
              <>
                <select
                  aria-label={t('Choose a chat to add')}
                  className="h-9 max-w-56 rounded-md border border-input bg-background px-3 text-sm"
                  value={selectedChatId}
                  onChange={(event) => setSelectedChatId(event.target.value)}
                >
                  <option value="">{t('Add an existing chat…')}</option>
                  {availableChats.map((chat) => (
                    <option key={chat.id} value={chat.id}>
                      {getChatTitle(chat)}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  onClick={() => void assignChat()}
                  disabled={!selectedChatId || isAssigning}
                >
                  {isAssigning ? (
                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 size-4" />
                  )}
                  Add chat
                </Button>
              </>
            )}
            <Button asChild>
              <Link href={`/?projectId=${encodeURIComponent(project.id)}`}>
                <Plus className="mr-2 size-4" />
                New chat
              </Link>
            </Button>
          </div>
        </div>

        {project.chats.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <MessageSquare className="mx-auto size-8 text-muted-foreground" />
            <h3 className="mt-3 font-medium">{t('No chats in this project yet')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Start a new project chat or add one of your existing chats.
            </p>
            <Button asChild className="mt-5">
              <Link href={`/?projectId=${encodeURIComponent(project.id)}`}>
                <Plus className="mr-2 size-4" />
                Start a project chat
              </Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            {project.chats.map((chat) => (
              <div
                key={chat.id}
                className="flex flex-wrap items-center gap-3 border-b p-4 last:border-b-0 hover:bg-accent/30"
              >
                <Link
                  href={`/chats/${encodeURIComponent(chat.id)}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {getChatTitle(chat)}
                  </span>
                </Link>
                {chat.latestVersion?.demoUrl && (
                  <a
                    href={chat.latestVersion.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Preview
                    <ExternalLink className="size-3" />
                  </a>
                )}
                {deploymentUrls[chat.id] && (
                  <a
                    href={deploymentUrls[chat.id]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Live
                    <ExternalLink className="size-3" />
                  </a>
                )}
                {chat.latestVersion?.status === 'completed' &&
                  chat.latestVersion.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        void deployVersion(chat.id, chat.latestVersion!.id)
                      }
                      disabled={deployingChatId === chat.id}
                    >
                      {deployingChatId === chat.id ? (
                        <LoaderCircle className="mr-2 size-3.5 animate-spin" />
                      ) : (
                        <ExternalLink className="mr-2 size-3.5" />
                      )}
                      Deploy to Vercel
                    </Button>
                  )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void forkChat(chat.id)}
                  disabled={forkingChatId !== null}
                  aria-label={`Fork ${getChatTitle(chat)}`}
                >
                  {forkingChatId === chat.id ? (
                    <LoaderCircle className="mr-2 size-3.5 animate-spin" />
                  ) : (
                    <CopyPlus className="mr-2 size-3.5" />
                  )}
                  Fork
                </Button>
                <span className="text-xs text-muted-foreground">
                  Updated{' '}
                  {new Date(
                    chat.updatedAt || chat.createdAt,
                  ).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <form onSubmit={saveProject} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t('Project settings')}</DialogTitle>
              <DialogDescription>
                Project instructions are included when creating new chats here.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <label
                htmlFor="edit-project-name"
                className="text-sm font-medium"
              >
                Project name
              </label>
              <Input
                id="edit-project-name"
                value={name}
                maxLength={80}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="edit-project-instructions"
                className="text-sm font-medium"
              >
                Generation instructions
              </label>
              <Textarea
                id="edit-project-instructions"
                value={instructions}
                maxLength={4000}
                onChange={(event) => setInstructions(event.target.value)}
                placeholder={t('Visual style, framework, conventions, and shared requirements')}
                rows={5}
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="edit-project-privacy"
                className="text-sm font-medium"
              >
                Project visibility
              </label>
              <select
                id="edit-project-privacy"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={privacy}
                onChange={(event) =>
                  setPrivacy(event.target.value as 'private' | 'team')
                }
              >
                <option value="private">{t('Private')}</option>
                <option value="team">{t('Team')}</option>
              </select>
            </div>
            <DialogFooter className="flex-row justify-between sm:justify-between">
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setSettingsOpen(false)
                  setDeleteOpen(true)
                }}
              >
                <Trash2 className="mr-2 size-4" />
                Delete project
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSettingsOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!name.trim() || isSaving}>
                  {isSaving && (
                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                  )}
                  Save changes
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {project.name}?</DialogTitle>
            <DialogDescription>
              The project will be removed. Its chats will not be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void deleteProject()}
              disabled={isDeleting}
            >
              {isDeleting && (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              )}
              Delete project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={domainToRemove !== null}
        onOpenChange={(open) => {
          if (!open && domainAction === null) setDomainToRemove(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {domainToRemove?.name}?</DialogTitle>
            <DialogDescription>
              The domain will stop routing to this project. This does not cancel
              or transfer the domain registration.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDomainToRemove(null)}
              disabled={domainAction !== null}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void removeDomain()}
              disabled={domainAction !== null}
            >
              {domainAction && (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              )}
              Remove domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={envToDelete !== null}
        onOpenChange={(open) => !open && setEnvToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {envToDelete?.key}?</DialogTitle>
            <DialogDescription>
              Apps in this project may stop working if they depend on this
              variable.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEnvToDelete(null)}
              disabled={isDeletingEnv}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void deleteEnvironmentVariable()}
              disabled={isDeletingEnv}
            >
              {isDeletingEnv && (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              )}
              Delete variable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
