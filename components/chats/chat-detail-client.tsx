'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import useSWR, { mutate } from 'swr'
import { ChatMessages } from '@/components/chat/chat-messages'
import { ChatInput } from '@/components/chat/chat-input'
import { PreviewPanel } from '@/components/chat/preview-panel'
import { ResizableLayout } from '@/components/shared/resizable-layout'
import { useChat } from '@/hooks/use-chat'
import { cn } from '@/lib/utils'
import {
  type ImageAttachment,
  clearPromptFromStorage,
} from '@/components/ai-elements/prompt-input'
import { useToast } from '@/components/ui/use-toast'
import { useLocale } from '@/components/providers/locale-provider'
import { RateLimit } from '@/components/rate-limit'
import { extractCodeFiles } from '@/lib/code-files'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Archive,
  ArrowLeftRight,
  ChevronDown,
  Code,
  Copy,
  Download,
  Eye,
  GitBranch,
  Globe2,
  LockKeyhole,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings,
  Share2,
  Star,
  Users,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { zipSync, strToU8 } from 'fflate'
import { isBrandedProjectDomain } from '@/lib/branded-domain'
import { waitForChatBuild } from '@/lib/wait-for-chat-build'

type ChatPrivacy = 'public' | 'private' | 'team' | 'team-edit' | 'unlisted'

interface FileEntry {
  fileName: string
  source: string
}

interface VersionSummary {
  id: string
  status: 'pending' | 'completed' | 'failed'
  demoUrl?: string
  createdAt: string
  updatedAt?: string
}

interface VersionEntry {
  version: number
  versionId: string
  demoUrl?: string
  createdAt: string
  status: VersionSummary['status']
  changedFiles: FileEntry[]
}

export function ChatDetailClient() {
  const { t } = useLocale()
  const params = useParams()
  const chatId = params.chatId as string
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [attachments, setAttachments] = useState<ImageAttachment[]>([])
  const [activePanel, setActivePanel] = useState<'chat' | 'preview' | 'code'>(
    'preview',
  )
  const [changedFiles, setChangedFiles] = useState<FileEntry[]>([])
  const [versionHistory, setVersionHistory] = useState<VersionEntry[]>([])
  const [currentVersion, setCurrentVersion] = useState(1)
  const [selectedDemo, setSelectedDemo] = useState<string>()
  const [isGenerating, setIsGenerating] = useState(false)
  const generationStoppedRef = useRef(false)
  const [showRateLimit, setShowRateLimit] = useState(false)
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [isAssigningProject, setIsAssigningProject] = useState(false)
  const [isDuplicatingChat, setIsDuplicatingChat] = useState(false)
  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [renameChatName, setRenameChatName] = useState('')
  const [isRenamingChat, setIsRenamingChat] = useState(false)
  const [isChangingVisibility, setIsChangingVisibility] = useState(false)
  const [isFavorite, setIsFavorite] = useState<boolean | undefined>()
  const [isPublishing, setIsPublishing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()
  const router = useRouter()
  const { data: session } = useSession()
  const { data: projectsResult } = useSWR<{
    data: Array<{ id: string; name: string }>
  }>(session?.user?.id ? '/api/projects' : null)
  const { data: chatsResult } = useSWR<{
    data: Array<{
      id: string
      name?: string
      title?: string
      projectId?: string
    }>
  }>(session?.user?.id ? '/api/chats' : null)
  const {
    message,
    setMessage,
    currentChat,
    chatLoadError,
    refreshCurrentChat,
    isLoading,
    setIsLoading,
    isStreaming,
    chatHistory,
    isLoadingChat,
    handleSendMessage,
    stopActiveGeneration,
    clearGenerationController,
    getGenerationSignal,
    handleStreamingComplete: baseHandleStreamingComplete,
    handleChatData,
  } = useChat(chatId)
  const currentProject = projectsResult?.data.find(
    (project) =>
      project.id ===
      (currentChat?.projectId ||
        chatsResult?.data.find((chat) => chat.id === chatId)?.projectId),
  )
  const sidebarChat = chatsResult?.data.find((chat) => chat.id === chatId)
  const assignedProjectId =
    currentChat?.projectId || sidebarChat?.projectId
  const { data: projectDomainsResult } = useSWR<{
    data: Array<{ name: string; verified: boolean }>
  }>(
    session?.user?.id && assignedProjectId
      ? `/api/projects/${encodeURIComponent(assignedProjectId)}/domains`
      : null,
  )
  const verifiedBrandedDomain = projectDomainsResult?.data.find(
    (domain) => domain.verified && isBrandedProjectDomain(domain.name),
  )
  const brandedPreviewUrl = verifiedBrandedDomain
    ? `https://${verifiedBrandedDomain.name}`
    : undefined
  const {
    data: versionsResponse,
    error: versionsError,
    mutate: refreshVersions,
  } = useSWR<{ data: VersionSummary[] }>(
    chatId ? `/api/chats/${chatId}/versions` : null,
  )
  const latestFilesRef = useRef(changedFiles)
  const reportedVersionsErrorRef = useRef<unknown>(null)
  const generationStartRef = useRef<{
    startedAt: number
    previousVersionId?: string
    previousVersionUpdatedAt?: string
  } | null>(null)
  latestFilesRef.current = changedFiles

  useEffect(() => {
    setChangedFiles([])
    setVersionHistory([])
    setCurrentVersion(1)
    setSelectedDemo(undefined)
    setIsFavorite(undefined)
    setActivePanel('preview')
  }, [chatId])

  useEffect(() => {
    if (!isLoadingChat && currentChat?.demo) {
      setActivePanel('preview')
    }
  }, [currentChat?.demo, isLoadingChat])

  useEffect(() => {
    if (!versionsResponse?.data) return
    const orderedVersions = [...versionsResponse.data].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
    setVersionHistory(
      orderedVersions.map((version, index) => ({
        version: index + 1,
        versionId: version.id,
        demoUrl: version.demoUrl,
        createdAt: version.createdAt,
        status: version.status,
        changedFiles:
          index === orderedVersions.length - 1 ? latestFilesRef.current : [],
      })),
    )
    setCurrentVersion(orderedVersions.length || 1)
    setSelectedDemo(undefined)
  }, [versionsResponse, chatId])

  useEffect(() => {
    if (!versionsError) {
      reportedVersionsErrorRef.current = null
      return
    }
    if (reportedVersionsErrorRef.current === versionsError) return
    reportedVersionsErrorRef.current = versionsError
    toast({
      title: 'Could not load version history',
      description: 'Refresh the chat to try again.',
      variant: 'destructive',
    })
  }, [versionsError, toast])

  useEffect(() => {
    if (isLoadingChat) return
    const files = extractCodeFiles([
      chatHistory
        .filter((item) => item.type === 'assistant')
        .map((item) => item.content),
      currentChat,
    ])
    if (files.length > 0) setChangedFiles(files)
  }, [chatHistory, currentChat, isLoadingChat])

  // Derive chat title from first user message
  const chatTitle = (() => {
    const firstUserMsg = chatHistory.find((m) => m.type === 'user')
    if (!firstUserMsg) return undefined
    // Only use string content — never try to stringify binary format arrays
    if (typeof firstUserMsg.content !== 'string') return undefined
    const content = firstUserMsg.content.trim()
    if (!content) return undefined
    return content.length > 40 ? content.slice(0, 40) + '...' : content
  })()
  const chatDisplayName =
    sidebarChat?.name ||
    sidebarChat?.title ||
    currentChat?.name ||
    currentChat?.title ||
    currentProject?.name ||
    chatTitle ||
    `Chat ${chatId.slice(0, 8)}`
  const projectInitials =
    chatDisplayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'P'

  const handleStreamingUpdate = (content: unknown) => {
    const files = extractCodeFiles(content)
    if (files.length > 0) setChangedFiles(files)
  }

  // Keep generation active while v0 turns the finished response into a preview.
  const handleStreamingComplete = async (finalContent: any) => {
    if (generationStoppedRef.current) return
    handleStreamingUpdate(finalContent)
    setIsLoading(true)
    try {
      await baseHandleStreamingComplete(finalContent, true)
      const generationStart = generationStartRef.current
      const chatDetails = await waitForChatBuild(
        chatId,
        generationStart?.startedAt ?? Date.now(),
        generationStart?.previousVersionId,
        generationStart?.previousVersionUpdatedAt,
        getGenerationSignal(),
      )
      const previewUrl =
        chatDetails.latestVersion?.demoUrl || chatDetails.demo
      await mutate(
        `/api/chats/${encodeURIComponent(chatId)}`,
        { ...chatDetails, demo: previewUrl || chatDetails.demo },
        false,
      )
      await refreshVersions()

      if (!previewUrl) {
        setActivePanel('code')
        toast({
          title: t('Project build completed'),
          description: t(
            'The project files are ready, but v0 did not provide a preview URL.',
          ),
        })
      }
    } catch (error) {
      if (generationStoppedRef.current) return
      console.error('Error waiting for project build:', error)
      void refreshCurrentChat()
      toast({
        title: t('Project build did not finish'),
        description:
          error instanceof Error ? error.message : t('Please try again.'),
        variant: 'destructive',
      })
    } finally {
      clearGenerationController()
      generationStartRef.current = null
      setIsLoading(false)
      setIsGenerating(false)
    }
  }

  const handleStreamingError = async (streamError: string) => {
    if (generationStoppedRef.current) return
    setIsLoading(true)
    try {
      const generationStart = generationStartRef.current
      const chatDetails = await waitForChatBuild(
        chatId,
        generationStart?.startedAt ?? Date.now(),
        generationStart?.previousVersionId,
        generationStart?.previousVersionUpdatedAt,
        getGenerationSignal(),
      )
      const previewUrl =
        chatDetails.latestVersion?.demoUrl || chatDetails.demo
      await mutate(
        `/api/chats/${encodeURIComponent(chatId)}`,
        { ...chatDetails, demo: previewUrl || chatDetails.demo },
        false,
      )
      await refreshVersions()
      if (!previewUrl) setActivePanel('code')
    } catch (error) {
      if (generationStoppedRef.current) return
      console.error('Streaming failed before the project build completed:', {
        streamError,
        error,
      })
      toast({
        title: t('Project build did not finish'),
        description:
          error instanceof Error ? error.message : t('Please try again.'),
        variant: 'destructive',
      })
    } finally {
      clearGenerationController()
      generationStartRef.current = null
      setIsLoading(false)
      setIsGenerating(false)
    }
  }

  const handleVersionSelect = async (
    version: number,
    demoUrl: string,
    files: FileEntry[],
    versionId?: string,
  ) => {
    if (!versionId) return
    try {
      const response = await fetch(`/api/chats/${chatId}/versions/${versionId}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || 'Failed to load selected version.')
      }
      const versionData = await response.json()
      const sourceFiles = Array.isArray(versionData.files)
        ? versionData.files
            .filter(
              (file: unknown): file is { name: string; content: string } =>
                !!file &&
                typeof file === 'object' &&
                'name' in file &&
                typeof file.name === 'string' &&
                'content' in file &&
                typeof file.content === 'string',
            )
            .map((file: { name: string; content: string }) => ({
              fileName: file.name,
              source: file.content,
            }))
        : files
      setChangedFiles(sourceFiles)
      setCurrentVersion(version)
      setSelectedDemo(demoUrl)
    } catch (error) {
      console.error('Failed to load selected chat version:', error)
      toast({
        title: 'Could not load version',
        description:
          error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handlePublish = async () => {
    if (
      !currentChat?.projectId ||
      !currentChat.latestVersion?.id ||
      currentChat.latestVersion.status !== 'completed'
    ) {
      toast({
        title: 'This chat is not ready to publish',
        description: 'Assign it to a project and wait for a completed version.',
        variant: 'destructive',
      })
      return
    }

    setIsPublishing(true)
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(currentChat.projectId)}/deployments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId,
            versionId: currentChat.latestVersion.id,
          }),
        },
      )
      const result: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        const message =
          result &&
          typeof result === 'object' &&
          'error' in result &&
          typeof result.error === 'string'
            ? result.error
            : 'Could not publish this project.'
        throw new Error(message)
      }
      if (
        !result ||
        typeof result !== 'object' ||
        !('webUrl' in result) ||
        typeof result.webUrl !== 'string'
      ) {
        throw new Error('The deployment response did not include a URL.')
      }
      toast({
        title: 'Project published',
        description:
          result &&
          typeof result === 'object' &&
          'brandedUrl' in result &&
          typeof result.brandedUrl === 'string'
            ? `Your project is available at ${result.brandedUrl}`
            : result &&
                typeof result === 'object' &&
                'brandingError' in result &&
                typeof result.brandingError === 'string'
              ? `Deployment succeeded, but the branded URL could not be set up: ${result.brandingError}`
              : 'The deployed version is ready to open.',
      })
      const destination =
        'brandedUrl' in result && typeof result.brandedUrl === 'string'
          ? result.brandedUrl
          : result.webUrl
      if (currentChat.projectId) {
        void mutate(
          `/api/projects/${encodeURIComponent(currentChat.projectId)}/domains`,
        )
      }
      window.open(destination, '_blank', 'noopener,noreferrer')
    } catch (error) {
      console.error('Could not publish project:', error)
      toast({
        title: 'Could not publish project',
        description:
          error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsPublishing(false)
    }
  }

  const handleDeployToVercel = async () => {
    if (
      !currentChat?.projectId ||
      !currentChat.latestVersion?.id ||
      currentChat.latestVersion.status !== 'completed'
    ) {
      toast({
        title: 'This chat is not ready to deploy',
        description: 'Assign it to a project and wait for a completed version.',
        variant: 'destructive',
      })
      return
    }

    setIsPublishing(true)
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(currentChat.projectId)}/vercel-deployments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId,
            versionId: currentChat.latestVersion.id,
          }),
        },
      )
      const result: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        const message =
          result &&
          typeof result === 'object' &&
          'error' in result &&
          typeof result.error === 'string'
            ? result.error
            : 'Could not deploy this project to Vercel.'
        throw new Error(message)
      }
      if (
        !result ||
        typeof result !== 'object' ||
        !('webUrl' in result) ||
        typeof result.webUrl !== 'string'
      ) {
        throw new Error('Vercel did not return a deployment URL.')
      }
      toast({
        title: 'Vercel deployment started',
        description: `Your production deployment is available at ${result.webUrl}`,
      })
      window.open(result.webUrl, '_blank', 'noopener,noreferrer')
      void mutate(
        `/api/projects/${encodeURIComponent(currentChat.projectId)}/deployments`,
      )
    } catch (error) {
      console.error('Could not deploy project to Vercel:', error)
      toast({
        title: 'Could not deploy to Vercel',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsPublishing(false)
    }
  }

  // Wrapper function to handle attachments
  const handleSubmitWithAttachments = (
    e: React.FormEvent<HTMLFormElement>,
    attachmentUrls?: Array<{ url: string }>,
  ) => {
    clearPromptFromStorage()
    generationStoppedRef.current = false
    setAttachments([])
    setSelectedDemo(undefined)
    generationStartRef.current = {
      startedAt: Date.now(),
      previousVersionId: currentChat?.latestVersion?.id,
      previousVersionUpdatedAt: currentChat?.latestVersion?.updatedAt,
    }

    setIsGenerating(true)
    const result = handleSendMessage(e, attachmentUrls)
    // Catch errors and reset isGenerating; show rate-limit overlay when applicable
    if (result && typeof (result as any).catch === 'function') {
      ;(result as Promise<void>).catch((err: unknown) => {
        setIsGenerating(false)
        if (
          err instanceof Error &&
          (err as Error & { code?: string }).code === 'rate_limit'
        ) {
          setShowRateLimit(true)
        }
      })
    }
    return result
  }

  const stopCurrentGeneration = () => {
    generationStoppedRef.current = true
    generationStartRef.current = null
    stopActiveGeneration(
      t('Generation stopped. Send a follow-up message to continue.'),
    )
    setIsGenerating(false)
  }

  // Share handler
  const handleShare = async () => {
    const previewUrl = currentChat?.demo || currentChat?.latestVersion?.demoUrl
    const shareUrl =
      previewUrl ||
      `${window.location.origin}/chats/${encodeURIComponent(chatId)}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast({
        title: previewUrl ? 'Preview link copied' : 'Chat link copied',
        description: previewUrl
          ? 'Preview URL copied to clipboard.'
          : 'No preview exists yet, so the chat link was copied instead.',
      })
    } catch (error) {
      console.error('Could not copy preview link:', error)
      toast({
        title: 'Could not copy link',
        description: 'Check clipboard permissions and try again.',
        variant: 'destructive',
      })
    }
  }

  const handleCopyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast({
        title: 'Chat link copied',
        description: 'Share this link with people who can access the chat.',
      })
      setIsInviteOpen(false)
    } catch (error) {
      console.error('Could not copy chat link:', error)
      toast({
        title: 'Could not copy chat link',
        description: 'Check clipboard permissions and try again.',
        variant: 'destructive',
      })
    }
  }

  const handleRenameChat = async () => {
    const name = renameChatName.trim()
    if (!name || name.length > 100) return

    setIsRenamingChat(true)
    try {
      const response = await fetch(`/api/chats/${encodeURIComponent(chatId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const result: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        const errorMessage =
          result &&
          typeof result === 'object' &&
          'error' in result &&
          typeof result.error === 'string'
            ? result.error
            : 'Could not rename this chat.'
        throw new Error(errorMessage)
      }

      setIsRenameOpen(false)
      void mutate('/api/chats')
      await refreshCurrentChat()
      toast({ title: 'Chat renamed' })
    } catch (error) {
      console.error('Could not rename chat:', error)
      toast({
        title: 'Could not rename chat',
        description:
          error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsRenamingChat(false)
    }
  }

  const handleChangeVisibility = async (privacy: ChatPrivacy) => {
    setIsChangingVisibility(true)
    try {
      const response = await fetch(
        `/api/chats/${encodeURIComponent(chatId)}/visibility`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ privacy }),
        },
      )
      const result: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        const errorMessage =
          result &&
          typeof result === 'object' &&
          'error' in result &&
          typeof result.error === 'string'
            ? result.error
            : 'Could not change chat visibility.'
        throw new Error(errorMessage)
      }

      await refreshCurrentChat()
      void mutate('/api/chats')
      toast({ title: 'Chat visibility updated' })
    } catch (error) {
      console.error('Could not change chat visibility:', error)
      toast({
        title: 'Could not change chat visibility',
        description:
          error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsChangingVisibility(false)
    }
  }

  const handleDownloadChatZip = async () => {
    try {
      const hasCompletedVersion =
        currentChat?.latestVersion?.status === 'completed'
      let blob: Blob

      if (hasCompletedVersion) {
        const response = await fetch(
          `/api/chats/${encodeURIComponent(chatId)}/download`,
        )
        if (!response.ok) {
          const result: unknown = await response.json().catch(() => null)
          const errorMessage =
            result &&
            typeof result === 'object' &&
            'error' in result &&
            typeof result.error === 'string'
              ? result.error
              : 'Could not download the project ZIP.'
          throw new Error(errorMessage)
        }
        blob = await response.blob()
      } else {
        if (changedFiles.length === 0) {
          throw new Error(
            'There are no generated files to download yet. Generate some code first.',
          )
        }

        const files: Record<string, Uint8Array> = {}
        for (const file of changedFiles) {
          const fileName = file.fileName.replace(/\\/g, '/').trim()
          if (
            !fileName ||
            fileName.startsWith('/') ||
            fileName.includes('\0') ||
            fileName.split('/').some((part) => !part || part === '.' || part === '..')
          ) {
            throw new Error('A generated file has an invalid path.')
          }
          files[fileName] = strToU8(file.source)
        }
        blob = new Blob([zipSync(files, { level: 6 })], {
          type: 'application/zip',
        })
      }

      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      const fileName = (currentChat?.name || chatId)
        .replace(/[^a-z0-9-_]+/gi, '-')
        .replace(/^-|-$/g, '')
      anchor.download = `${fileName || 'chat'}.zip`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      console.error('Could not download chat ZIP:', error)
      toast({
        title: 'Could not download project',
        description:
          error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  const assignChatToProject = async (projectId: string) => {
    const response = await fetch(
      `/api/projects/${encodeURIComponent(projectId)}/assign`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId }),
      },
    )
    const result: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      const message =
        result &&
        typeof result === 'object' &&
        'error' in result &&
        typeof result.error === 'string'
          ? result.error
          : 'Could not add this chat to the project.'
      throw new Error(message)
    }

    await refreshCurrentChat()
    void mutate('/api/chats')
    setIsProjectSettingsOpen(false)
    router.push(`/projects/${encodeURIComponent(projectId)}`)
  }

  const handleAssignChatToProject = async () => {
    if (!selectedProjectId) return
    setIsAssigningProject(true)
    try {
      await assignChatToProject(selectedProjectId)
    } catch (error) {
      console.error('Could not open project settings:', error)
      toast({
        title: 'Could not open project settings',
        description:
          error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsAssigningProject(false)
    }
  }

  const handleCreateProjectForChat = async () => {
    setIsAssigningProject(true)
    try {
      const nameSource =
        currentChat?.name ||
        currentChat?.title ||
        chatHistory.find((item) => item.type === 'user')?.content
      const name =
        typeof nameSource === 'string' && nameSource.trim()
          ? nameSource.trim().slice(0, 80)
          : 'New project'
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const result: unknown = await response.json().catch(() => null)
      if (
        !response.ok ||
        !result ||
        typeof result !== 'object' ||
        !('id' in result) ||
        typeof result.id !== 'string'
      ) {
        const message =
          result &&
          typeof result === 'object' &&
          'error' in result &&
          typeof result.error === 'string'
            ? result.error
            : 'Could not create a project for this chat.'
        throw new Error(message)
      }
      await assignChatToProject(result.id)
    } catch (error) {
      console.error('Could not create project for chat:', error)
      toast({
        title: 'Could not create project',
        description:
          error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsAssigningProject(false)
    }
  }

  const handleDuplicateChat = async () => {
    setIsDuplicatingChat(true)
    try {
      const response = await fetch('/api/chat/fork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId }),
      })
      const result: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        const errorMessage =
          result &&
          typeof result === 'object' &&
          'error' in result &&
          typeof result.error === 'string'
            ? result.error
            : 'Could not duplicate this chat.'
        throw new Error(errorMessage)
      }
      if (
        !result ||
        typeof result !== 'object' ||
        !('id' in result) ||
        typeof result.id !== 'string'
      ) {
        throw new Error('The duplicated chat did not include an ID.')
      }
      router.push(`/chats/${encodeURIComponent(result.id)}`)
    } catch (error) {
      console.error('Could not duplicate chat:', error)
      toast({
        title: 'Could not duplicate chat',
        description:
          error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsDuplicatingChat(false)
    }
  }

  const handleToggleFavorite = async () => {
    const nextFavorite = !(isFavorite ?? currentChat?.favorite ?? false)
    try {
      const response = await fetch(
        `/api/chats/${encodeURIComponent(chatId)}/favorite`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isFavorite: nextFavorite }),
        },
      )
      const result: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        const errorMessage =
          result &&
          typeof result === 'object' &&
          'error' in result &&
          typeof result.error === 'string'
            ? result.error
            : 'Could not update this chat.'
        throw new Error(errorMessage)
      }

      setIsFavorite(nextFavorite)
      void mutate('/api/chats')
      toast({
        title: nextFavorite ? 'Added to favorites' : 'Removed from favorites',
      })
    } catch (error) {
      console.error('Could not update chat favorite:', error)
      toast({
        title: 'Could not update favorite',
        description:
          error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  // Reset isGenerating whenever an error message lands in chat history
  const prevChatLengthRef = useRef(0)
  useEffect(() => {
    if (chatHistory.length > prevChatLengthRef.current) {
      prevChatLengthRef.current = chatHistory.length
      // If the last message is from assistant and not streaming, generation ended
      const last = chatHistory[chatHistory.length - 1]
      if (last && last.type === 'assistant' && !last.isStreaming) {
        setIsGenerating(false)
      }
    }
  }, [chatHistory])

  // Handle fullscreen keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen])

  // Auto-focus the textarea on page load
  useEffect(() => {
    if (textareaRef.current && !isLoadingChat) {
      textareaRef.current.focus()
    }
  }, [isLoadingChat])

  return (
    <div
      className={cn(
        'flex h-dvh min-h-0 flex-col overflow-hidden bg-gray-50 dark:bg-black',
        isFullscreen && 'fixed inset-0 z-50',
      )}
    >
      <header className="grid h-[52px] shrink-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1 border-b border-border px-2 pl-14 sm:gap-2 sm:px-3 lg:grid-cols-[minmax(0,30%)_minmax(0,1fr)_auto] lg:pl-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            aria-hidden="true"
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background"
          >
            {projectInitials}
          </span>
          <h1 className="truncate text-sm font-semibold">{chatDisplayName}</h1>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={() => void handleToggleFavorite()}
            disabled={!session?.user?.id}
            aria-label={
              (isFavorite ?? currentChat?.favorite)
                ? 'Remove from favorites'
                : 'Add to favorites'
            }
          >
            <Star
              className={`size-4 ${
                (isFavorite ?? currentChat?.favorite)
                  ? 'fill-current text-amber-400'
                  : ''
              }`}
            />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                aria-label={`Chat visibility: ${currentChat?.privacy || 'private'}`}
                title={`Chat visibility: ${currentChat?.privacy || 'private'}`}
              >
                <LockKeyhole className="size-3.5" />
                <ChevronDown className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem disabled>
                <LockKeyhole className="mr-2 size-4" />
                {currentChat?.privacy || 'Private'} visibility
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex min-w-0 items-center gap-1">
          <Button
            type="button"
            variant={activePanel === 'chat' ? 'secondary' : 'ghost'}
            size="icon"
            className="size-8 shrink-0 lg:hidden"
            aria-label={t('Show chat')}
            aria-pressed={activePanel === 'chat'}
            onClick={() => setActivePanel('chat')}
          >
            <MessageSquare className="size-4" />
          </Button>
          <div
            role="group"
            aria-label={t('Project view')}
            className="flex h-8 shrink-0 items-center rounded-md border border-border bg-muted/50 p-0.5"
          >
            <Button
              type="button"
              variant={activePanel === 'preview' ? 'secondary' : 'ghost'}
              size="icon"
              className="size-7 rounded"
              aria-label={t('Show preview')}
              title={t('Preview')}
              aria-pressed={activePanel === 'preview'}
              onClick={() => setActivePanel('preview')}
            >
              <Eye className="size-4" />
            </Button>
            <Button
              type="button"
              variant={activePanel === 'code' ? 'secondary' : 'ghost'}
              size="icon"
              className="size-7 rounded"
              aria-label={t('Show code')}
              title={t('Code')}
              aria-pressed={activePanel === 'code'}
              onClick={() => setActivePanel('code')}
            >
              <Code className="size-4" />
            </Button>
          </div>
          <Button
            asChild
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label={t('New chat')}
            title={t('New chat')}
          >
            <Link
              href={
                currentChat?.projectId
                  ? `/?projectId=${encodeURIComponent(currentChat.projectId)}`
                  : '/'
              }
            >
              <Plus className="size-4" />
            </Link>
          </Button>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="hidden size-8 sm:inline-flex"
                aria-label={t('Chat and project actions')}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuItem
                onClick={() => {
                  setRenameChatName(
                    currentChat?.name ||
                      currentChat?.title ||
                      sidebarChat?.name ||
                      sidebarChat?.title ||
                      '',
                  )
                  setIsRenameOpen(true)
                }}
                disabled={!session?.user?.id}
              >
                <Pencil className="mr-2 size-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => void handleToggleFavorite()}
                disabled={!session?.user?.id}
              >
                <Star
                  className={`mr-2 size-4 ${
                    (isFavorite ?? currentChat?.favorite)
                      ? 'fill-current text-amber-400'
                      : ''
                  }`}
                />
                {(isFavorite ?? currentChat?.favorite)
                  ? 'Remove from Favorites'
                  : 'Add to Favorites'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleCopyInviteLink()}>
                <Share2 className="mr-2 size-4" />
                Copy Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsInviteOpen(true)}>
                <Users className="mr-2 size-4" />
                Invite
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <LockKeyhole className="mr-2 size-4" />
                  Chat visibility
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    onSelect={() => void handleChangeVisibility('private')}
                    disabled={isChangingVisibility || !session?.user?.id}
                  >
                    <LockKeyhole className="mr-2 size-4" />
                    Private
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => void handleChangeVisibility('public')}
                    disabled={isChangingVisibility || !session?.user?.id}
                  >
                    <Globe2 className="mr-2 size-4" />
                    Public
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => void handleChangeVisibility('team')}
                    disabled={isChangingVisibility || !session?.user?.id}
                  >
                    <Users className="mr-2 size-4" />
                    Team
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => void handleChangeVisibility('team-edit')}
                    disabled={isChangingVisibility || !session?.user?.id}
                  >
                    <Users className="mr-2 size-4" />
                    Team Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => void handleChangeVisibility('unlisted')}
                    disabled={isChangingVisibility || !session?.user?.id}
                  >
                    <LockKeyhole className="mr-2 size-4" />
                    Unlisted
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem
                onClick={() => void handleDuplicateChat()}
                disabled={isDuplicatingChat || !session?.user?.id}
              >
                <Copy className="mr-2 size-4" />
                {isDuplicatingChat ? 'Duplicating…' : 'Duplicate...'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => void handleDownloadChatZip()}
                disabled={
                  currentChat?.latestVersion?.status !== 'completed' &&
                  changedFiles.length === 0
                }
                title={
                  currentChat?.latestVersion?.status !== 'completed' &&
                  changedFiles.length === 0
                    ? 'Generate code before downloading'
                    : undefined
                }
              >
                <Download className="mr-2 size-4" />
                Download ZIP
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {currentChat?.projectId ? (
                <DropdownMenuItem asChild>
                  <Link
                    href={`/projects/${encodeURIComponent(currentChat.projectId)}`}
                  >
                    <Settings className="mr-2 size-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onSelect={() => {
                    setSelectedProjectId(projectsResult?.data[0]?.id || '')
                    setIsProjectSettingsOpen(true)
                  }}
                  disabled={!session?.user?.id}
                >
                  <Settings className="mr-2 size-4" />
                  Settings
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled title={t('Transfer is not available yet')}>
                <ArrowLeftRight className="mr-2 size-4" />
                Transfer...
              </DropdownMenuItem>
              <DropdownMenuItem disabled title={t('Archive is not available yet')}>
                <Archive className="mr-2 size-4" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsInviteOpen(true)}
            aria-label={t('Invite people to this chat')}
          >
            <Share2 className="size-4" />
            <span className="hidden sm:inline">{t('Invite')}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="hidden gap-1.5 sm:inline-flex"
            disabled
            title={t('Git branch controls are not connected yet')}
            aria-label={t('Current Git branch unavailable')}
          >
            <GitBranch className="size-4" />
            <span>main</span>
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            className="bg-white text-black hover:bg-neutral-200 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            onClick={() => void handlePublish()}
            disabled={isPublishing}
            aria-label={t(isPublishing ? 'Publishing project' : 'Publish project')}
          >
            <Globe2 className="size-4" />
            <span className="hidden md:inline">
              {t(isPublishing ? 'Publishing…' : 'Publish')}
            </span>
          </Button>
        </div>
      </header>

      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Rename chat')}</DialogTitle>
            <DialogDescription>
              {t('Enter a new name for this chat.')}
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            maxLength={100}
            value={renameChatName}
            onChange={(event) => setRenameChatName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !isRenamingChat) {
                void handleRenameChat()
              }
            }}
            disabled={isRenamingChat}
            aria-label={t('Chat name')}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRenameOpen(false)}
              disabled={isRenamingChat}
            >
              {t('Cancel')}
            </Button>
            <Button
              type="button"
              onClick={() => void handleRenameChat()}
              disabled={
                isRenamingChat ||
                !renameChatName.trim() ||
                renameChatName.trim().length > 100
              }
            >
              {t(isRenamingChat ? 'Renaming...' : 'Rename')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isProjectSettingsOpen}
        onOpenChange={setIsProjectSettingsOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Set up project settings')}</DialogTitle>
            <DialogDescription>
              {t('Project settings belong to a project. Add this chat to an existing project or create a new project to open its settings.')}
            </DialogDescription>
          </DialogHeader>
          {projectsResult?.data.length ? (
            <div className="space-y-2">
              <label
                htmlFor="chat-settings-project"
                className="text-sm font-medium"
              >
                {t('Existing project')}
              </label>
              <select
                id="chat-settings-project"
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
                disabled={isAssigningProject}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {projectsResult.data.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('You do not have a project yet. Create one for this chat to manage its settings.')}
            </p>
          )}
          <DialogFooter className="flex-col sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleCreateProjectForChat()}
              disabled={isAssigningProject}
            >
              {t(isAssigningProject ? 'Creating…' : 'Create project')}
            </Button>
            {projectsResult?.data.length ? (
              <Button
                type="button"
                onClick={() => void handleAssignChatToProject()}
                disabled={isAssigningProject || !selectedProjectId}
              >
                {t(isAssigningProject ? 'Opening…' : 'Add chat and open settings')}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Invite to this chat')}</DialogTitle>
            <DialogDescription>
              {t('Copy the chat link to share it. Access follows this chat visibility.')}
            </DialogDescription>
          </DialogHeader>
          <div className="truncate rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
            {typeof window === 'undefined' ? '' : window.location.href}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsInviteOpen(false)}
            >
              {t('Cancel')}
            </Button>
            <Button type="button" onClick={() => void handleCopyInviteLink()}>
              <Copy className="mr-2 size-4" />
              {t('Copy link')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rate limit overlay */}
      <RateLimit
        isOpen={showRateLimit}
        onClose={() => setShowRateLimit(false)}
      />

      <div className="flex h-[calc(100dvh-52px)] flex-col overflow-hidden">
        <ResizableLayout
          className="min-h-0 flex-1"
          defaultLeftWidth={36}
          minLeftWidth={25}
          maxLeftWidth={55}
          activePanel={activePanel === 'chat' ? 'left' : 'right'}
          leftPanel={
            <div className="flex h-full min-h-0 min-w-0 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto">
                {chatLoadError && (
                  <div
                    role="alert"
                    className="m-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4"
                  >
                    <p className="text-sm font-medium text-destructive">
                      {t('Could not load this chat')}
                    </p>
                    <p className="mt-1 break-words text-sm text-muted-foreground">
                      {chatLoadError.message}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void refreshCurrentChat()}
                      >
                        {t('Retry')}
                      </Button>
                      <Button asChild size="sm" variant="ghost">
                        <Link href="/chats">{t('Back to chats')}</Link>
                      </Button>
                    </div>
                  </div>
                )}
                <ChatMessages
                  chatHistory={chatHistory}
                  isLoading={isLoading}
                  currentChat={currentChat || null}
                  onStreamingComplete={handleStreamingComplete}
                  onStreamingUpdate={handleStreamingUpdate}
                  onChatData={handleChatData}
                  onStreamingStarted={() => setIsLoading(false)}
                  isStreaming={isGenerating}
                  isBuildPending={isLoading && isGenerating}
                  isGenerationStopped={() => generationStoppedRef.current}
                  onError={(error) => void handleStreamingError(error)}
                  onFollowUpClick={(s) => {
                    setMessage(s)
                    setTimeout(() => {
                      const form = textareaRef.current?.form
                      if (form) form.requestSubmit()
                    }, 50)
                  }}
                />
              </div>

              <ChatInput
                message={message}
                setMessage={setMessage}
                onSubmit={handleSubmitWithAttachments}
                onStopGeneration={stopCurrentGeneration}
                isLoading={isLoading || isLoadingChat || !!chatLoadError}
                isGenerating={isGenerating}
                showSuggestions={false}
                attachments={attachments}
                onAttachmentsChange={setAttachments}
                textareaRef={textareaRef}
              />
            </div>
          }
          rightPanel={
            <PreviewPanel
              currentChat={
                currentChat
                  ? { ...currentChat, demo: selectedDemo ?? currentChat.demo }
                  : null
              }
              isFullscreen={isFullscreen}
              setIsFullscreen={setIsFullscreen}
              refreshKey={refreshKey}
              setRefreshKey={setRefreshKey}
              changedFiles={changedFiles}
              versionHistory={versionHistory}
              currentVersion={currentVersion}
              externalUrl={brandedPreviewUrl}
              onVersionSelect={handleVersionSelect}
              onShareClick={handleShare}
              onDeployClick={handlePublish}
              onDeployToVercelClick={handleDeployToVercel}
              onCodeClick={() => setActivePanel('code')}
              forceTab={
                activePanel === 'code'
                  ? 'code'
                  : activePanel === 'preview'
                    ? 'preview'
                    : undefined
              }
            />
          }
        />
      </div>
    </div>
  )
}
