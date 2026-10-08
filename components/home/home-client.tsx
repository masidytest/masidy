'use client'

import { useState, useEffect, useRef, Suspense, useCallback } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import useSWR from 'swr'
import { useStreaming } from '@/contexts/streaming-context'
import { guestRegex } from '@/lib/constants'
import {
  Activity,
  ArrowRight,
  Blocks,
  ChevronDown,
  CircleHelp,
  FolderKanban,
  Gamepad2,
  Layers3,
  Mail,
  PanelsTopLeft,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserNav } from '@/components/user-nav'
import { MobileMenu } from '@/components/shared/mobile-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  PromptInput,
  PromptInputImageButton,
  PromptInputImagePreview,
  PromptInputMicButton,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  createImageAttachment,
  createImageAttachmentFromStored,
  savePromptToStorage,
  loadPromptFromStorage,
  clearPromptFromStorage,
  type ImageAttachment,
} from '@/components/ai-elements/prompt-input'
import { ChatMessages } from '@/components/chat/chat-messages'
import { ChatInput } from '@/components/chat/chat-input'
import { PreviewPanel } from '@/components/chat/preview-panel'
import { BrandMark } from '@/components/brand-mark'
import { LegalFooter } from '@/components/legal/legal-footer'
import { ResizableLayout } from '@/components/shared/resizable-layout'
import { BottomToolbar } from '@/components/shared/bottom-toolbar'
import { RateLimit } from '@/components/rate-limit'
import { extractCodeFiles } from '@/lib/code-files'
import {
  appTemplates,
  builtInDesignSystems,
  getComponentKitById,
  customDesignSystemsStorageKey,
  getTemplateById,
  templateCategories,
  type DesignSystemPreset,
} from '@/lib/workspace-catalog'

// Component that uses useSearchParams - needs to be wrapped in Suspense
function SearchParamsHandler({
  onReset,
  onTemplateSelect,
  onComponentSelect,
  onProjectSelect,
  onDesignSystemSelect,
}: {
  onReset: () => void
  onTemplateSelect: (prompt: string, resourceIds: string[]) => void
  onComponentSelect: (prompt: string, resourceIds: string[]) => void
  onProjectSelect: (projectId: string) => void
  onDesignSystemSelect: (designSystemId: string) => void
}) {
  const searchParams = useSearchParams()

  useEffect(() => {
    const url = new URL(window.location.href)
    let changed = false

    if (url.searchParams.get('reset') === 'true') {
      onReset()
      url.searchParams.delete('reset')
      changed = true
    }
    const templateId = url.searchParams.get('template')
    const template = templateId ? getTemplateById(templateId) : undefined
    if (template) {
      onTemplateSelect(template.prompt, template.source ? [template.id] : [])
      url.searchParams.delete('template')
      changed = true
    }
    const componentIds = (url.searchParams.get('components') || '')
      .split(',')
      .map((id) => id.trim())
      .filter((id) => getComponentKitById(id))
      .slice(0, 5)
    if (componentIds.length > 0) {
      const componentKit = getComponentKitById(componentIds[0])
      if (componentKit) {
        onComponentSelect(componentKit.prompt, componentIds)
      }
      url.searchParams.delete('components')
      changed = true
    }
    const projectId = url.searchParams.get('projectId')
    if (projectId) {
      onProjectSelect(projectId)
      url.searchParams.delete('projectId')
      changed = true
    }
    const designSystemId = url.searchParams.get('designSystem')
    if (designSystemId) {
      onDesignSystemSelect(designSystemId)
      url.searchParams.delete('designSystem')
      changed = true
    }
    if (changed) {
      const query = url.searchParams.toString()
      window.history.replaceState(
        {},
        '',
        `${url.pathname}${query ? `?${query}` : ''}${url.hash}`,
      )
    }
  }, [
    searchParams,
    onReset,
    onTemplateSelect,
    onComponentSelect,
    onProjectSelect,
    onDesignSystemSelect,
  ])

  return null
}

const modelLabels = {
  default: 'Default',
  'v0-mini': 'Fast',
  'v0-pro': 'Balanced',
  'v0-max': 'Advanced',
} as const

export function HomeClient() {
  const { toast } = useToast()
  const [message, setMessage] = useState('')
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [landingTemplateCategory, setLandingTemplateCategory] =
    useState('Browse All')
  const [isLoading, setIsLoading] = useState(false)
  const [showChatInterface, setShowChatInterface] = useState(false)
  const [attachments, setAttachments] = useState<ImageAttachment[]>([])
  const [isPromptStorageReady, setIsPromptStorageReady] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [chatHistory, setChatHistory] = useState<
    Array<{
      type: 'user' | 'assistant' | 'error'
      content: string | any
      isStreaming?: boolean
      stream?: ReadableStream<Uint8Array> | null
      error?: {
        message: string
        code?: string
        retryable?: boolean
      }
    }>
  >([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [currentChat, setCurrentChat] = useState<{
    id: string
    demo?: string
  } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [activePanel, setActivePanel] = useState<'chat' | 'preview' | 'code'>(
    'chat',
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [showRateLimit, setShowRateLimit] = useState(false)
  const [changedFiles, setChangedFiles] = useState<
    Array<{ fileName: string; source: string }>
  >([])
  const [versionHistory, setVersionHistory] = useState<
    Array<{
      version: number
      demoUrl: string
      changedFiles: Array<{ fileName: string; source: string }>
    }>
  >([])
  const [currentVersion, setCurrentVersion] = useState(1)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedModel, setSelectedModel] = useState<
    'default' | 'v0-mini' | 'v0-pro' | 'v0-max'
  >('default')
  const [selectedDesignSystem, setSelectedDesignSystem] =
    useState<DesignSystemPreset | null>(null)
  const [customDesignSystems, setCustomDesignSystems] = useState<
    DesignSystemPreset[]
  >([])
  const versionCountRef = useRef(0)
  const pendingHandoffStreamRef = useRef<ReadableStream<Uint8Array> | null>(
    null,
  )
  const pendingHandoffMessageRef = useRef('')
  const router = useRouter()
  const { startHandoff } = useStreaming()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auth session for Recent Chats
  const { data: session } = useSession()
  const { data: chatsResult } = useSWR<{
    data: Array<{
      id: string
      name?: string
      title?: string
      messages?: Array<{ role: string; content: string }>
      createdAt: string
      updatedAt?: string
    }>
  }>(session?.user?.id ? '/api/chats' : null)
  const { data: projectsResult } = useSWR<{
    data: Array<{ id: string; name: string }>
  }>(session?.user?.id ? '/api/projects' : null)
  const projects = projectsResult?.data || []
  const selectedProject = projects.find(
    (project) => project.id === selectedProjectId,
  )
  const recentChats =
    chatsResult?.data.slice(0, 5).map((chat) => ({
      id: chat.id,
      firstMessage:
        chat.name ||
        chat.title ||
        chat.messages?.find((message) => message.role === 'user')?.content ||
        'Chat',
      updatedAt: chat.updatedAt || chat.createdAt || '',
    })) ?? null
  const landingTemplates = appTemplates
    .filter(
      (template) =>
        !!template.source &&
        (landingTemplateCategory === 'Browse All' ||
          template.category === landingTemplateCategory),
    )
    .slice(0, 3)

  const handleReset = () => {
    // Reset all chat-related state
    setShowChatInterface(false)
    setChatHistory([])
    setCurrentChatId(null)
    setCurrentChat(null)
    currentChatIdRef.current = null
    setMessage('')
    setSelectedResourceIds([])
    setSelectedTemplateId('')
    setAttachments([])
    setIsLoading(false)
    setIsFullscreen(false)
    setIsGenerating(false)
    setShowRateLimit(false)
    setRefreshKey((prev) => prev + 1)
    setChangedFiles([])
    setVersionHistory([])
    setCurrentVersion(1)
    setSelectedProjectId('')
    setSelectedModel('default')
    setSelectedDesignSystem(null)
    versionCountRef.current = 0

    // Clear any stored data
    clearPromptFromStorage()

    // Focus textarea after reset
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }, 0)
  }

  const handleTemplateSelect = useCallback(
    (prompt: string, resourceIds: string[]) => {
      setMessage(prompt)
      setSelectedResourceIds(resourceIds)
      setSelectedTemplateId(
        resourceIds.find((id) => getTemplateById(id)?.source) || '',
      )
    },
    [],
  )
  const handleComponentSelect = useCallback(
    (prompt: string, resourceIds: string[]) => {
      setMessage(prompt)
      setSelectedResourceIds(resourceIds)
      setSelectedTemplateId('')
    },
    [],
  )
  const handleProjectSelect = useCallback((projectId: string) => {
    setSelectedProjectId(projectId)
  }, [])
  const handleDesignSystemSelect = useCallback(
    (designSystemId: string) => {
      const builtIn = builtInDesignSystems.find(
        (system) => system.id === designSystemId,
      )
      if (builtIn) {
        setSelectedDesignSystem(builtIn)
        return
      }
      try {
        const stored = window.localStorage.getItem(
          customDesignSystemsStorageKey,
        )
        const systems: unknown = stored ? JSON.parse(stored) : []
        if (Array.isArray(systems)) {
          const custom = systems.find(
            (item): item is DesignSystemPreset =>
              !!item &&
              typeof item === 'object' &&
              'id' in item &&
              item.id === designSystemId &&
              'name' in item &&
              typeof item.name === 'string' &&
              'instructions' in item &&
              typeof item.instructions === 'string',
          )
          if (custom) {
            setSelectedDesignSystem(custom)
            return
          }
        }
        throw new Error(
          'This saved design system is not available in this browser.',
        )
      } catch (error) {
        console.error('Could not load selected design system:', error)
        toast({
          title: 'Could not load design system',
          description:
            error instanceof Error
              ? error.message
              : 'Please choose another system.',
          variant: 'destructive',
        })
      }
    },
    [toast],
  )

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(customDesignSystemsStorageKey)
      if (!stored) return
      const parsed: unknown = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        setCustomDesignSystems(
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
    }
  }, [])

  // Auto-focus the textarea on page load and restore from sessionStorage
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }

    // Restore prompt data from sessionStorage
    const storedData = loadPromptFromStorage()
    if (storedData) {
      setMessage((current) => current || storedData.message)
      setSelectedResourceIds(storedData.resourceIds ?? [])
      setSelectedTemplateId(storedData.templateId ?? '')
      if (storedData.attachments.length > 0) {
        const restoredAttachments = storedData.attachments.map(
          createImageAttachmentFromStored,
        )
        setAttachments(restoredAttachments)
      }
    }
    setIsPromptStorageReady(true)
  }, [])

  // Save prompt data to sessionStorage whenever message or attachments change
  useEffect(() => {
    if (!isPromptStorageReady) return

    if (message.trim() || attachments.length > 0) {
      savePromptToStorage(message, attachments, {
        resourceIds: selectedResourceIds,
        templateId: selectedTemplateId,
      })
    } else {
      // Clear sessionStorage if both message and attachments are empty
      clearPromptFromStorage()
    }
  }, [
    isPromptStorageReady,
    message,
    attachments,
    selectedResourceIds,
    selectedTemplateId,
  ])

  // Image attachment handlers
  const handleImageFiles = async (files: File[]) => {
    try {
      const newAttachments = await Promise.all(
        files.map((file) => createImageAttachment(file)),
      )
      setAttachments((prev) => [...prev, ...newAttachments])
    } catch (error) {
      console.error('Error processing image files:', error)
    }
  }

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id))
  }

  const handleDragOver = () => {
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = () => {
    setIsDragOver(false)
  }

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!message.trim() || isLoading) return

    const userMessage = message.trim()
    const currentAttachments = [...attachments]

    if (
      !session?.user?.id ||
      guestRegex.test(session.user.email ?? '')
    ) {
      savePromptToStorage(userMessage, currentAttachments, {
        resourceIds: selectedResourceIds,
        templateId: selectedTemplateId,
      })
      router.push(`/login?returnTo=${encodeURIComponent('/?resumePrompt=1')}`)
      return
    }

    // Clear sessionStorage immediately upon submission
    clearPromptFromStorage()

    setMessage('')
    setAttachments([])

    // Immediately show chat interface and add user message
    setShowChatInterface(true)
    setChatHistory([
      {
        type: 'user',
        content: userMessage,
      },
    ])
    setIsLoading(true)
    setIsGenerating(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          streaming: true,
          attachments: currentAttachments.map((att) => ({ url: att.dataUrl })),
          projectId: selectedProjectId || undefined,
          resourceIds:
            selectedResourceIds.length > 0 ? selectedResourceIds : undefined,
          templateId: selectedTemplateId || undefined,
          modelConfiguration:
            selectedModel === 'default'
              ? undefined
              : { modelId: selectedModel },
          designSystemInstructions:
            selectedDesignSystem?.instructions || undefined,
        }),
      })

      if (!response.ok) {
        // Try to get the specific error message from the response
        let errorMessage =
          'Sorry, there was an error processing your message. Please try again.'
        let isRateLimit = response.status === 429
        try {
          const errorData = await response.json()
          if (errorData.message) {
            errorMessage = errorData.message
          } else if (isRateLimit) {
            errorMessage =
              'You have exceeded your maximum number of messages for the day. Please try again later.'
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError)
          if (isRateLimit) {
            errorMessage =
              'You have exceeded your maximum number of messages for the day. Please try again later.'
          }
        }
        if (isRateLimit) {
          setIsLoading(false)
          setIsGenerating(false)
          setShowRateLimit(true)
          return
        }
        throw new Error(errorMessage)
      }

      if (!response.body) {
        throw new Error('No response body for streaming')
      }

      const [displayStream, handoffStream] = response.body.tee()
      pendingHandoffStreamRef.current = handoffStream
      pendingHandoffMessageRef.current = userMessage
      setIsLoading(false)

      // Add streaming assistant response
      setChatHistory((prev) => [
        ...prev,
        {
          type: 'assistant',
          content: [],
          isStreaming: true,
          stream: displayStream,
        },
      ])
    } catch (error) {
      console.error('Error creating chat:', error)
      setIsLoading(false)
      setIsGenerating(false)
      let errorData = {
        message:
          'Sorry, there was an error processing your message. Please try again.',
        code: 'unknown_error',
        retryable: true,
      }

      if (error instanceof Error) {
        try {
          const parsed = JSON.parse(error.message)
          if (parsed.error) {
            errorData = {
              message: parsed.error,
              code: parsed.code || 'unknown_error',
              retryable: parsed.retryable !== false,
            }
          } else {
            errorData.message = error.message
          }
        } catch {
          errorData.message = error.message
        }
      }

      setChatHistory((prev) => [
        ...prev,
        {
          type: 'error',
          content: errorData.message,
          error: errorData,
        },
      ])
    }
  }

  // Use a ref so handleStreamingComplete always has the latest chat ID
  const currentChatIdRef = useRef<string | null>(null)

  const handleChatData = async (chatData: any) => {
    if (chatData.id) {
      const isNewChat = !currentChatIdRef.current
      const shouldNavigate =
        isNewChat && pendingHandoffStreamRef.current !== null

      // Only set currentChat if it's not already set or if this is the main chat object
      if (isNewChat || chatData.object === 'chat') {
        currentChatIdRef.current = chatData.id
        setCurrentChatId(chatData.id)
        setCurrentChat({ id: chatData.id })

        if (shouldNavigate) {
          const handoffStream = pendingHandoffStreamRef.current
          if (handoffStream) {
            startHandoff(
              chatData.id,
              handoffStream,
              pendingHandoffMessageRef.current,
            )
            pendingHandoffStreamRef.current = null
          }
        }
      }

      // Create ownership record only for brand-new chats
      if (isNewChat) {
        try {
          await fetch('/api/chat/ownership', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chatId: chatData.id,
            }),
          })
        } catch (error) {
          console.error('Failed to create chat ownership:', error)
        }
      }

      if (shouldNavigate) {
        router.push(`/chats/${encodeURIComponent(chatData.id)}`)
      }
    }
  }

  const handleStreamingComplete = async (finalContent: any) => {
    setIsLoading(false)
    setIsGenerating(false)

    // The v0 API stores ALL file code in code-project.source as a concatenated string
    // with [V0_FILE]<lang>:file="<filename>" markers between each file.
    // Parse that string to extract individual files.
    const parseV0Source = (
      source: string,
    ): Array<{ fileName: string; source: string }> => {
      if (!source) return []
      const markerRegex = /\[V0_FILE\][^:]*:file="([^"]+)"[^\n]*\n/g
      const files: Array<{ fileName: string; source: string }> = []
      let match: RegExpExecArray | null
      const matches: Array<{
        fileName: string
        index: number
        headerEnd: number
      }> = []

      while ((match = markerRegex.exec(source)) !== null) {
        matches.push({
          fileName: match[1],
          index: match.index,
          headerEnd: match.index + match[0].length,
        })
      }

      for (let i = 0; i < matches.length; i++) {
        const start = matches[i].headerEnd
        const end =
          i + 1 < matches.length ? matches[i + 1].index : source.length
        const code = source.slice(start, end).trim()
        files.push({ fileName: matches[i].fileName, source: code })
      }

      return files
    }

    // Extract by walking the tree and parsing each code-project.source
    const extractFiles = (
      node: any,
    ): Array<{ fileName: string; source: string }> => {
      if (!node || typeof node !== 'object') return []
      if (Array.isArray(node)) return node.flatMap(extractFiles)
      // code-project part with a source string
      if (node.type === 'code-project' && typeof node.source === 'string') {
        return parseV0Source(node.source)
      }
      // task-coding-v1 part — look inside its parts array
      if (node.type === 'task-coding-v1' && Array.isArray(node.parts)) {
        return node.parts.flatMap(extractFiles)
      }
      // AssistantMessageContentPart — look inside part
      if (node.part) return extractFiles(node.part)
      // Recurse into all values
      return Object.values(node).flatMap(extractFiles)
    }

    const allFiles = [
      ...(Array.isArray(finalContent) ? extractFiles(finalContent) : []),
      ...extractCodeFiles(finalContent),
    ]
    // Log first file to see exact field names from API
    if (allFiles.length > 0)
      console.log(
        '[Masidy] changedFile sample:',
        JSON.stringify(allFiles[0]).slice(0, 600),
      )
    // Deduplicate — keep last occurrence of each fileName (latest coding pass wins)
    const fileMap = new Map<string, { fileName: string; source: string }>()
    for (const f of allFiles) {
      if (f.fileName) fileMap.set(f.fileName, f)
    }
    let dedupedFiles = Array.from(fileMap.values())
    if (dedupedFiles.length > 0) setChangedFiles(dedupedFiles)

    // Update chat history with final content
    setChatHistory((prev) => {
      const updated = [...prev]
      const lastIndex = updated.length - 1
      if (lastIndex >= 0 && updated[lastIndex].isStreaming) {
        updated[lastIndex] = {
          ...updated[lastIndex],
          content: finalContent,
          isStreaming: false,
          stream: undefined,
        }
      }
      return updated
    })

    // Use the ref (not state) to avoid the async closure race condition
    const chatId = currentChatIdRef.current
    if (!chatId) {
      console.warn('No chat ID available when streaming completed')
      const pendingHandoffStream = pendingHandoffStreamRef.current
      pendingHandoffStreamRef.current = null
      if (pendingHandoffStream) {
        await pendingHandoffStream.cancel()
      }
      return
    }

    try {
      const response = await fetch(`/api/chats/${chatId}`)
      if (!response.ok) {
        console.warn('Failed to fetch chat details:', response.status)
        return
      }
      const chatDetails = await response.json()
      const latestFiles = extractCodeFiles(chatDetails)
      if (latestFiles.length > 0) {
        dedupedFiles = latestFiles
        setChangedFiles(latestFiles)
      }
      const demoUrl = chatDetails?.latestVersion?.demoUrl || chatDetails?.demo

      if (demoUrl) {
        setCurrentChat((prev) =>
          prev ? { ...prev, demo: demoUrl } : { id: chatId, demo: demoUrl },
        )
        if (window.innerWidth < 768) {
          setActivePanel('preview')
        }
        // Version tracking using ref to avoid stale closure
        versionCountRef.current += 1
        const nextVersion = versionCountRef.current
        setCurrentVersion(nextVersion)
        setVersionHistory((prev) => [
          ...prev,
          { version: nextVersion, demoUrl, changedFiles: dedupedFiles },
        ])
      }
    } catch (error) {
      console.error('Error fetching demo URL after streaming:', error)
    }
  }

  const handleStreamingUpdate = (content: unknown) => {
    const files = extractCodeFiles(content)
    if (files.length > 0) setChangedFiles(files)
  }

  const handleChatSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!message.trim() || isLoading || !currentChatId) return

    const userMessage = message.trim()
    setMessage('')
    setIsLoading(true)
    setIsGenerating(true)
    setChatHistory((prev) => [...prev, { type: 'user', content: userMessage }])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          chatId: currentChatId,
          streaming: true,
        }),
      })

      if (!response.ok) {
        // Try to parse structured error response
        let errorData = {
          error:
            'Sorry, there was an error processing your message. Please try again.',
          code: 'unknown_error',
          retryable: true,
        }

        const isRateLimit = response.status === 429

        try {
          const parsedError = await response.json()
          if (parsedError.error) {
            errorData = {
              error: parsedError.error,
              code: parsedError.code || 'unknown_error',
              retryable: parsedError.retryable !== false,
            }
          } else if (isRateLimit) {
            errorData = {
              error:
                'You have exceeded your maximum number of messages for the day. Please try again later.',
              code: 'rate_limit_exceeded',
              retryable: true,
            }
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError)
          if (isRateLimit) {
            errorData = {
              error:
                'You have exceeded your maximum number of messages for the day. Please try again later.',
              code: 'rate_limit_exceeded',
              retryable: true,
            }
          }
        }

        if (isRateLimit) {
          setIsLoading(false)
          setIsGenerating(false)
          setShowRateLimit(true)
          return
        }

        throw new Error(JSON.stringify(errorData))
      }

      if (!response.body) {
        throw new Error('No response body for streaming')
      }

      setIsLoading(false)

      // Add streaming response
      setChatHistory((prev) => [
        ...prev,
        {
          type: 'assistant',
          content: [],
          isStreaming: true,
          stream: response.body,
        },
      ])
    } catch (error) {
      console.error('Error:', error)

      // Parse structured error response
      let errorData = {
        message:
          'Sorry, there was an error processing your message. Please try again.',
        code: 'unknown_error',
        retryable: true,
      }

      if (error instanceof Error) {
        try {
          const parsed = JSON.parse(error.message)
          if (parsed.error) {
            errorData = {
              message: parsed.error,
              code: parsed.code || 'unknown_error',
              retryable: parsed.retryable !== false,
            }
          } else {
            errorData.message = error.message
          }
        } catch {
          errorData.message = error.message
        }
      }

      setChatHistory((prev) => [
        ...prev,
        {
          type: 'error',
          content: errorData.message,
          error: errorData,
        },
      ])
      setIsLoading(false)
      setIsGenerating(false)
    }
  }

  if (showChatInterface) {
    return (
      <div className="min-h-screen bg-black text-white">
        {/* Handle search params with Suspense boundary */}
        <Suspense fallback={null}>
          <SearchParamsHandler
            onReset={handleReset}
            onTemplateSelect={handleTemplateSelect}
            onComponentSelect={handleComponentSelect}
            onProjectSelect={handleProjectSelect}
            onDesignSystemSelect={handleDesignSystemSelect}
          />
        </Suspense>

        {/* Rate limit overlay */}
        <RateLimit
          isOpen={showRateLimit}
          onClose={() => setShowRateLimit(false)}
        />

        <div className="flex h-[calc(100vh-40px)] flex-col md:h-screen">
          <ResizableLayout
            className="flex-1 min-h-0"
            singlePanelMode={false}
            activePanel={activePanel === 'chat' ? 'left' : 'right'} // 'code' and 'preview' both show right panel
            leftPanel={
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto">
                  <ChatMessages
                    chatHistory={chatHistory}
                    isLoading={isLoading}
                    currentChat={currentChat}
                    onStreamingComplete={handleStreamingComplete}
                    onStreamingUpdate={handleStreamingUpdate}
                    onChatData={handleChatData}
                    onStreamingStarted={() => setIsLoading(false)}
                    isStreaming={isGenerating}
                    onError={() => setIsGenerating(false)}
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
                  onSubmit={handleChatSendMessage}
                  isLoading={isLoading}
                  isGenerating={isGenerating}
                  showSuggestions={false}
                />
              </div>
            }
            rightPanel={
              <PreviewPanel
                currentChat={currentChat}
                isFullscreen={isFullscreen}
                setIsFullscreen={setIsFullscreen}
                refreshKey={refreshKey}
                setRefreshKey={setRefreshKey}
                changedFiles={changedFiles}
                versionHistory={versionHistory}
                currentVersion={currentVersion}
                forceTab={
                  activePanel === 'code'
                    ? 'code'
                    : activePanel === 'preview'
                      ? 'preview'
                      : undefined
                }
                onVersionSelect={(version, demoUrl, files) => {
                  setCurrentChat((prev) =>
                    prev
                      ? { ...prev, demo: demoUrl }
                      : { id: currentChatId || '', demo: demoUrl },
                  )
                  setChangedFiles(files)
                  setCurrentVersion(version)
                }}
                onShareClick={() => {
                  if (currentChat?.demo) {
                    navigator.clipboard
                      .writeText(currentChat.demo)
                      .then(() =>
                        toast({
                          title: 'Link copied!',
                          description:
                            'The preview link has been copied to your clipboard.',
                        }),
                      )
                      .catch(() =>
                        toast({
                          title: 'Copy failed',
                          description:
                            'Could not copy link. Please copy the URL manually.',
                          variant: 'destructive',
                        }),
                      )
                  }
                }}
              />
            }
          />

          <div className="md:hidden">
            <BottomToolbar
              activePanel={activePanel}
              onPanelChange={setActivePanel}
              hasPreview={!!currentChat}
              hasCode={changedFiles.length > 0}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-black dark:to-gray-900 flex flex-col">
      {/* Handle search params with Suspense boundary */}
      <Suspense fallback={null}>
        <SearchParamsHandler
          onReset={handleReset}
          onTemplateSelect={handleTemplateSelect}
          onComponentSelect={handleComponentSelect}
          onProjectSelect={handleProjectSelect}
          onDesignSystemSelect={handleDesignSystemSelect}
        />
      </Suspense>

      <header className="sticky top-0 z-30 border-b border-border bg-background/90 text-foreground backdrop-blur">
        <div className="mx-auto grid h-14 max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6">
          <Link
            href="/"
            aria-label="Masidy home"
            title="Masidy"
            className="w-fit rounded-full transition-opacity hover:opacity-80"
          >
            <BrandMark className="size-8 rounded-full" />
          </Link>
          <nav
            aria-label="Landing page navigation"
            className="hidden items-center gap-7 text-sm text-muted-foreground lg:flex"
          >
            <a href="#templates" className="transition-colors hover:text-foreground">
              Templates
            </a>
            <Link
              href="/projects"
              className="transition-colors hover:text-foreground"
            >
              Projects
            </Link>
            <Link
              href="/design-systems"
              className="transition-colors hover:text-foreground"
            >
              Design systems
            </Link>
            <a href="#faq" className="transition-colors hover:text-foreground">
              FAQ
            </a>
          </nav>
          <div className="flex items-center justify-self-end gap-1 sm:gap-2">
            {session?.user ? (
              <UserNav session={session} collapsed />
            ) : (
              <>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="hidden border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground sm:inline-flex"
                >
                  <Link href="/login">Log in</Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Link href="/register">Sign up</Link>
                </Button>
              </>
            )}
            <MobileMenu />
          </div>
        </div>
      </header>

      <main>
        <section className="px-4 pb-20 pt-16 sm:px-6 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
              What do you want to create?
            </h1>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Describe an idea and watch it become a working app.
            </p>

            <div id="builder" className="mx-auto mt-6 max-w-3xl scroll-mt-20">
              <PromptInput
                onSubmit={handleSendMessage}
                className="w-full border-border bg-card text-card-foreground shadow-2xl"
                onImageDrop={handleImageFiles}
                isDragOver={isDragOver}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <PromptInputImagePreview
                  attachments={attachments}
                  onRemove={handleRemoveAttachment}
                />
                <PromptInputTextarea
                  ref={textareaRef}
                  onChange={(e) => setMessage(e.target.value)}
                  value={message}
                  placeholder="Describe what you want to build..."
                  className="min-h-[88px] px-4 py-4 text-base text-foreground placeholder:text-muted-foreground"
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (
                      (e.metaKey || e.ctrlKey) &&
                      e.key === 'Enter' &&
                      !isLoading
                    ) {
                      const form = (e.target as HTMLTextAreaElement).form
                      if (form) form.requestSubmit()
                    }
                  }}
                />
                <PromptInputToolbar className="border-t border-border px-2 py-1.5">
                  <PromptInputTools>
                    <PromptInputImageButton
                      onImageSelect={handleImageFiles}
                      disabled={isLoading}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isLoading}
                          className="text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          aria-label={`Select model, current model: ${modelLabels[selectedModel]}`}
                        >
                          <Sparkles className="size-4" />
                          {modelLabels[selectedModel]}
                          <ChevronDown className="size-3.5 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuLabel>Choose a model</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuRadioGroup
                          value={selectedModel}
                          onValueChange={(value) =>
                            setSelectedModel(
                              value as
                                | 'default'
                                | 'v0-mini'
                                | 'v0-pro'
                                | 'v0-max',
                            )
                          }
                        >
                          <DropdownMenuRadioItem value="default">
                            Default model
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="v0-mini">
                            Fast
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="v0-pro">
                            Balanced
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="v0-max">
                            Advanced
                          </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {session?.user && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isLoading}
                            className="text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            aria-label={`Select project, current project: ${
                              selectedProject?.name || 'No project'
                            }`}
                          >
                            <FolderKanban className="size-4" />
                            <span className="max-w-36 truncate">
                              {selectedProject?.name || 'Project'}
                            </span>
                            <ChevronDown className="size-3.5 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-64">
                          <DropdownMenuLabel>Add to project</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuRadioGroup
                            value={selectedProjectId || '__none'}
                            onValueChange={(value) =>
                              setSelectedProjectId(
                                value === '__none' ? '' : value,
                              )
                            }
                          >
                            <DropdownMenuRadioItem value="__none">
                              No project
                            </DropdownMenuRadioItem>
                            {projects.map((project) => (
                              <DropdownMenuRadioItem
                                key={project.id}
                                value={project.id}
                              >
                                <span className="truncate">{project.name}</span>
                              </DropdownMenuRadioItem>
                            ))}
                          </DropdownMenuRadioGroup>
                          {projects.length === 0 && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="font-normal text-muted-foreground">
                                Create a project from the Projects page first.
                              </DropdownMenuLabel>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isLoading}
                          className="text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          aria-label={`Select design system, current design system: ${
                            selectedDesignSystem?.name || 'Default'
                          }`}
                        >
                          <Layers3 className="size-4" />
                          <span className="max-w-32 truncate">
                            {selectedDesignSystem?.name || 'Design'}
                          </span>
                          <ChevronDown className="size-3.5 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuLabel>Design system</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuRadioGroup
                          value={selectedDesignSystem?.id || '__default'}
                          onValueChange={(value) => {
                            if (value === '__default') {
                              setSelectedDesignSystem(null)
                            } else {
                              handleDesignSystemSelect(value)
                            }
                          }}
                        >
                          <DropdownMenuRadioItem value="__default">
                            Default design
                          </DropdownMenuRadioItem>
                          {builtInDesignSystems.map((system) => (
                            <DropdownMenuRadioItem
                              key={system.id}
                              value={system.id}
                            >
                              {system.name}
                            </DropdownMenuRadioItem>
                          ))}
                          {customDesignSystems.map((system) => (
                            <DropdownMenuRadioItem
                              key={system.id}
                              value={system.id}
                            >
                              {system.name}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </PromptInputTools>
                  <PromptInputTools>
                    <PromptInputMicButton
                      onTranscript={(transcript) => {
                        setMessage(
                          (prev) => prev + (prev ? ' ' : '') + transcript,
                        )
                      }}
                      onError={(error) => {
                        toast({
                          title: 'Microphone unavailable',
                          description: error,
                          variant: 'destructive',
                        })
                      }}
                      disabled={isLoading}
                    />
                    <PromptInputSubmit
                      disabled={!message.trim() || isLoading}
                      status={isLoading ? 'streaming' : 'ready'}
                    />
                  </PromptInputTools>
                </PromptInputToolbar>
              </PromptInput>
              {(selectedProjectId || selectedDesignSystem) && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Selected project and design system apply to this new chat.
                </p>
              )}
              <p className="mt-2 text-right text-xs text-muted-foreground">
                Press ⌘↵ or Ctrl+Enter to send
              </p>
            </div>

            <div className="mx-auto mt-4 flex max-w-3xl flex-wrap justify-center gap-2">
              {[
                { label: 'Contact form', icon: Mail },
                { label: 'Image editor', icon: PanelsTopLeft },
                { label: 'Mini game', icon: Gamepad2 },
                { label: 'Finance calculator', icon: Activity },
              ].map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-card-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  onClick={() => {
                    setMessage(label)
                    setTimeout(() => {
                      const form = textareaRef.current?.form
                      if (form) form.requestSubmit()
                    }, 0)
                  }}
                >
                  <Icon className="size-4 text-muted-foreground" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section
          id="templates"
          className="mx-auto max-w-7xl scroll-mt-20 px-4 pb-16 sm:px-6"
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Start with a template
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {templateCategories.slice(1).map((category) => (
                <button
                  key={category}
                  type="button"
                  aria-pressed={landingTemplateCategory === category}
                  onClick={() => setLandingTemplateCategory(category)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors sm:text-sm ${
                    landingTemplateCategory === category
                      ? 'border-primary/25 bg-accent text-accent-foreground'
                      : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {category}
                </button>
              ))}
              <Link
                href="/templates"
                className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-foreground hover:text-primary sm:text-sm"
              >
                Browse all
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {landingTemplates.map((template, index) => {
              const TemplateIcon =
                index === 0 ? PanelsTopLeft : index === 1 ? Blocks : Activity
              return (
                <article
                  key={template.id}
                  className="group overflow-hidden rounded-xl border border-border bg-card text-card-foreground transition-colors hover:border-primary/30"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMessage(template.prompt)
                      setSelectedResourceIds(
                        template.source ? [template.id] : [],
                      )
                      setSelectedTemplateId(template.source ? template.id : '')
                      document
                        .getElementById('builder')
                        ?.scrollIntoView({ behavior: 'smooth' })
                      textareaRef.current?.focus()
                    }}
                    className="block w-full text-left"
                    aria-label={`Use ${template.name} template`}
                  >
                    <div
                      className={`relative aspect-[16/9] overflow-hidden p-5 ${
                        index % 3 === 0
                          ? 'bg-gradient-to-br from-violet-950 via-zinc-900 to-black'
                          : index % 3 === 1
                            ? 'bg-gradient-to-br from-sky-950 via-zinc-900 to-black'
                            : 'bg-gradient-to-br from-amber-950 via-zinc-900 to-black'
                      }`}
                    >
                      <div className="absolute inset-4 rounded-lg border border-white/10 bg-black/60 p-3 shadow-2xl">
                        <div className="flex items-center gap-1.5 border-b border-white/10 pb-2">
                          <span className="size-1.5 rounded-full bg-rose-400/80" />
                          <span className="size-1.5 rounded-full bg-amber-300/80" />
                          <span className="size-1.5 rounded-full bg-emerald-400/80" />
                          <span className="ml-2 h-1.5 w-1/3 rounded-full bg-white/10" />
                        </div>
                        <div className="mt-3 grid h-[calc(100%-2rem)] grid-cols-[1fr_2fr] gap-2">
                          <div className="space-y-1.5 rounded bg-white/[0.04] p-2">
                            <span className="block h-1.5 w-2/3 rounded-full bg-white/20" />
                            <span className="block h-1.5 w-full rounded-full bg-white/10" />
                            <span className="block h-1.5 w-4/5 rounded-full bg-white/10" />
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <span className="rounded border border-white/10 bg-white/[0.06]" />
                            <span className="rounded border border-white/10 bg-white/[0.04]" />
                            <span className="col-span-2 flex items-center justify-center rounded border border-white/10 bg-white/[0.04]">
                              <TemplateIcon className="size-7 text-white/50" />
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="absolute bottom-7 right-7 rounded-full border border-white/10 bg-black/75 px-2.5 py-1 text-[11px] text-zinc-300">
                        {template.category}
                      </span>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-medium text-card-foreground">
                          {template.name}
                        </h3>
                        <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {template.description}
                      </p>
                    </div>
                  </button>
                </article>
              )
            })}
          </div>
        </section>

        {session?.user && recentChats && recentChats.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent chats</h2>
              <Link
                href="/chats"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                View all
              </Link>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {recentChats.slice(0, 3).map((chat) => (
                <Link
                  key={chat.id}
                  href={`/chats/${chat.id}`}
                  className="truncate rounded-lg border border-border bg-card p-3 text-sm text-card-foreground hover:border-primary/30 hover:bg-accent"
                >
                  {chat.firstMessage}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section
          id="faq"
          className="mx-auto max-w-7xl scroll-mt-20 border-t border-border px-4 py-12 sm:px-6"
        >
          <div className="mx-auto max-w-3xl">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <CircleHelp className="size-5 text-muted-foreground" />
              Frequently asked questions
            </h2>
            <div className="mt-5 divide-y divide-white/10">
              <details className="py-4">
                <summary className="cursor-pointer text-sm font-medium text-foreground">
                  What can I build?
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">
                  Describe websites, dashboards, tools, and app ideas. Masidy
                  creates a live preview and editable project files.
                </p>
              </details>
              <details className="py-4">
                <summary className="cursor-pointer text-sm font-medium text-foreground">
                  Can I start from a template?
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">
                  Yes. Choose a starter above or browse the full template
                  library, then customize the prompt before building.
                </p>
              </details>
            </div>
          </div>
        </section>
      </main>
      <LegalFooter className="mt-auto" />
    </div>
  )
}
