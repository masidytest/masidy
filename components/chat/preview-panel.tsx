'use client'

import { useState, useEffect } from 'react'
import {
  WebPreview,
  WebPreviewNavigation,
  WebPreviewNavigationButton,
  WebPreviewBody,
} from '@/components/ai-elements/web-preview'
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Code,
  ExternalLink,
  Github,
  Maximize,
  Minimize,
  Monitor,
  RefreshCw,
  Share2,
  Smartphone,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { CodeView } from '@/components/chat/code-view'
import { GithubPushModal } from '@/components/chat/github-push-modal'
import { useLocale } from '@/components/providers/locale-provider'

interface Chat {
  id: string
  name?: string
  demo?: string
  url?: string
  projectId?: string
  latestVersion?: {
    id: string
    status: 'pending' | 'completed' | 'failed'
    demoUrl?: string
    files?: Array<{ name: string; content: string }>
  }
}

interface FileEntry {
  fileName: string
  source: string
}

interface VersionEntry {
  version: number
  versionId?: string
  demoUrl?: string
  createdAt?: string
  status?: 'pending' | 'completed' | 'failed'
  changedFiles: FileEntry[]
}

interface PreviewPanelProps {
  currentChat: Chat | null
  isFullscreen: boolean
  setIsFullscreen: (fullscreen: boolean) => void
  refreshKey: number
  setRefreshKey: (key: number | ((prev: number) => number)) => void
  changedFiles?: FileEntry[]
  versionHistory?: VersionEntry[]
  currentVersion?: number
  onVersionSelect?: (
    version: number,
    demoUrl: string,
    files: FileEntry[],
    versionId?: string,
  ) => void | Promise<void>
  onShareClick?: () => void
  onDeployClick?: () => void | Promise<void>
  onDeployToVercelClick?: () => void | Promise<void>
  onCodeClick?: () => void
  externalUrl?: string
  forceTab?: 'preview' | 'code'
}

export function PreviewPanel({
  currentChat,
  isFullscreen,
  setIsFullscreen,
  refreshKey,
  setRefreshKey,
  changedFiles,
  versionHistory,
  currentVersion,
  onVersionSelect,
  onShareClick,
  onDeployClick,
  onDeployToVercelClick,
  onCodeClick,
  externalUrl,
  forceTab,
}: PreviewPanelProps) {
  const { t } = useLocale()
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview')
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(false)

  // Respond to external forceTab requests
  useEffect(() => {
    if (forceTab) {
      setActiveTab(forceTab)
    }
  }, [forceTab])

  const files = changedFiles?.length
    ? changedFiles
    : (currentChat?.latestVersion?.files || []).map((file) => ({
        fileName: file.name,
        source: file.content,
      }))
  const previewUrl = currentChat?.demo || currentChat?.latestVersion?.demoUrl
  const openUrl = externalUrl || previewUrl

  return (
    <div
      className={cn(
        'flex flex-col h-full transition-all duration-300',
        isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-black' : 'flex-1',
      )}
    >
      <WebPreview
        key={previewUrl || 'no-preview'}
        defaultUrl={previewUrl || ''}
        onUrlChange={(url) => {
          console.log('Preview URL changed:', url)
        }}
      >
        <WebPreviewNavigation>
          <select
            aria-label={t('Preview version')}
            className="h-8 w-24 shrink-0 rounded-md border border-transparent bg-transparent px-2 text-xs hover:border-border"
            value={
              versionHistory?.length
                ? (currentVersion ??
                  versionHistory[versionHistory.length - 1].version)
                : 'latest'
            }
            onChange={(event) => {
              const versionNumber = Number(event.target.value)
              const version = versionHistory?.find(
                (entry) => entry.version === versionNumber,
              )
              if (!version || !version.demoUrl || !onVersionSelect) return
              void onVersionSelect(
                version.version,
                version.demoUrl,
                version.changedFiles,
                version.versionId,
              )
            }}
          >
            {versionHistory?.length ? (
              versionHistory.map((version, index) => (
                <option
                  key={version.versionId || version.version}
                  value={version.version}
                  disabled={
                    version.status === 'pending' ||
                    version.status === 'failed' ||
                    !version.demoUrl
                  }
                >
                  {index === versionHistory.length - 1
                    ? t('Latest')
                    : `${t('Version')} ${version.version}`}
                </option>
              ))
            ) : (
              <option value="latest">{t('Latest')}</option>
            )}
          </select>

          <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
            <WebPreviewNavigationButton
              aria-label={t('Go back')}
              tooltip={t('Go back')}
              disabled
            >
              <ArrowLeft className="size-4" />
            </WebPreviewNavigationButton>
            <WebPreviewNavigationButton
              aria-label={t('Go forward')}
              tooltip={t('Go forward')}
              disabled
            >
              <ArrowRight className="size-4" />
            </WebPreviewNavigationButton>
            <WebPreviewNavigationButton
              aria-label={
                isMobileViewport
                  ? t('Use desktop viewport')
                  : t('Use mobile viewport')
              }
              tooltip={
                isMobileViewport ? t('Desktop viewport') : t('Mobile viewport')
              }
              onClick={() => setIsMobileViewport((mobile) => !mobile)}
              className={cn(
                'h-8 w-8 p-0 hover:text-foreground',
                isMobileViewport && 'bg-muted text-foreground',
              )}
            >
              {isMobileViewport ? (
                <Smartphone className="size-4" />
              ) : (
                <Monitor className="size-4" />
              )}
            </WebPreviewNavigationButton>
            <div className="flex min-w-0 flex-1 items-center rounded-md border border-border px-2">
              <Input
                aria-label={t('Preview path')}
                className="h-7 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
                readOnly
                value={
                  previewUrl
                    ? previewUrl.replace(/^https?:\/\/[^/]+/, '') || '/'
                    : '/'
                }
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center">
            <WebPreviewNavigationButton
              aria-label={
                externalUrl
                  ? t('Open published project in a new tab')
                  : t('Open preview in a new tab')
              }
              tooltip={externalUrl ? t('Open published site') : t('Open preview')}
              disabled={!openUrl}
              onClick={() => {
                if (openUrl) {
                  window.open(openUrl, '_blank', 'noopener,noreferrer')
                }
              }}
            >
              <ExternalLink className="size-4" />
            </WebPreviewNavigationButton>
            <WebPreviewNavigationButton
              aria-label={t('Refresh preview')}
              tooltip={t('Refresh preview')}
              onClick={() => setRefreshKey((previous) => previous + 1)}
              disabled={!previewUrl}
            >
              <RefreshCw className="size-4" />
            </WebPreviewNavigationButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <WebPreviewNavigationButton
                  aria-label={t('Preview actions')}
                  tooltip={t('Preview actions')}
                >
                  <ChevronDown className="size-4" />
                </WebPreviewNavigationButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setActiveTab('code')
                    onCodeClick?.()
                  }}
                >
                  <Code className="mr-2 size-4" />
                  {t('View code')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  {isFullscreen ? (
                    <Minimize className="mr-2 size-4" />
                  ) : (
                    <Maximize className="mr-2 size-4" />
                  )}
                  {isFullscreen ? t('Exit fullscreen') : t('Fullscreen')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onShareClick}
                  disabled={!onShareClick}
                >
                  <Share2 className="mr-2 size-4" />
                  {previewUrl ? t('Copy preview link') : t('Copy chat link')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsGithubModalOpen(true)}>
                  <Github className="mr-2 size-4" />
                  {t('Export project')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => void onDeployClick?.()}
                  disabled={!onDeployClick}
                  title={
                    !currentChat?.projectId
                      ? t('Assign this chat to a project before deploying.')
                      : currentChat.latestVersion?.status !== 'completed'
                        ? t('A completed project version is required to deploy.')
                        : undefined
                  }
                >
                  <ExternalLink className="mr-2 size-4" />
                  {t('Publish project')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => void onDeployToVercelClick?.()}
                  disabled={!onDeployToVercelClick}
                  title={
                    !currentChat?.projectId
                      ? t('Assign this chat to a project before deploying.')
                      : currentChat.latestVersion?.status !== 'completed'
                        ? t('A completed project version is required to deploy.')
                        : undefined
                  }
                >
                  <ExternalLink className="mr-2 size-4" />
                  {t('Deploy to Vercel')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </WebPreviewNavigation>

        {/* Body: preview tab */}
        {activeTab === 'preview' &&
          (previewUrl ? (
            <WebPreviewBody
              key={refreshKey}
              src={previewUrl}
              className={cn(
                'mx-auto transition-[width] duration-200',
                isMobileViewport ? 'w-[390px] max-w-full' : 'w-full',
              )}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-black">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {t('No preview available')}
                </p>
                <p className="text-xs text-gray-700/50 dark:text-gray-200/50">
                  {t('Start a conversation to see your app here')}
                </p>
              </div>
            </div>
          ))}

        {/* Body: code tab */}
        {activeTab === 'code' && (
          <div className="flex-1 flex overflow-hidden">
            {files.length > 0 ? (
              <CodeView files={files} />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-black">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {t('No files to display')}
                  </p>
                  <p className="text-xs text-gray-700/50 dark:text-gray-200/50">
                    {t('Generate a project to see the code here')}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </WebPreview>

      {/* GitHub / ZIP export modal */}
      <GithubPushModal
        isOpen={isGithubModalOpen}
        onClose={() => setIsGithubModalOpen(false)}
        changedFiles={files}
        projectName={currentChat?.name || currentChat?.id || 'masidy-project'}
      />
    </div>
  )
}
