'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  MessageSquare,
  MoreHorizontal,
  Edit2,
  Trash2,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Users,
  Lock,
  Star,
  Download,
  Share2,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { mutate } from 'swr'

interface Chat {
  id: string
  name?: string
  privacy?: 'public' | 'private' | 'team' | 'team-edit' | 'unlisted'
  favorite?: boolean
  shareable?: boolean
  projectId?: string
  latestVersion?: {
    id: string
    status: 'pending' | 'completed' | 'failed'
  }
  createdAt: string
  url?: string
}

// Helper function to get display name for a chat
const getChatDisplayName = (chat: Chat): string => {
  return chat.name || `Chat ${chat.id.slice(0, 8)}...`
}

// Helper function to get privacy icon
const getPrivacyIcon = (privacy: string) => {
  switch (privacy) {
    case 'public':
      return <Eye className="h-4 w-4" />
    case 'private':
      return <EyeOff className="h-4 w-4" />
    case 'team':
    case 'team-edit':
      return <Users className="h-4 w-4" />
    case 'unlisted':
      return <Lock className="h-4 w-4" />
    default:
      return <EyeOff className="h-4 w-4" />
  }
}

// Helper function to get privacy display name
const getPrivacyDisplayName = (privacy: string) => {
  switch (privacy) {
    case 'public':
      return 'Public'
    case 'private':
      return 'Private'
    case 'team':
      return 'Team'
    case 'team-edit':
      return 'Team Edit'
    case 'unlisted':
      return 'Unlisted'
    default:
      return 'Private'
  }
}

export function ChatSelector() {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()
  const { toast } = useToast()
  const [chats, setChats] = useState<Chat[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false)
  const [isVisibilityDialogOpen, setIsVisibilityDialogOpen] = useState(false)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [renameChatName, setRenameChatName] = useState('')
  const [selectedVisibility, setSelectedVisibility] = useState<
    'public' | 'private' | 'team' | 'team-edit' | 'unlisted'
  >('private')
  const [isRenamingChat, setIsRenamingChat] = useState(false)
  const [isDeletingChat, setIsDeletingChat] = useState(false)
  const [isDuplicatingChat, setIsDuplicatingChat] = useState(false)
  const [isChangingVisibility, setIsChangingVisibility] = useState(false)
  const [isUpdatingFavorite, setIsUpdatingFavorite] = useState(false)

  // Get current chat ID if on a chat page
  const currentChatId = pathname?.startsWith('/chats/')
    ? pathname.split('/')[2]
    : null

  // Fetch user's chats
  useEffect(() => {
    if (!session?.user?.id) return

    const fetchChats = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/chats')
        if (!response.ok) throw new Error('Failed to load chats.')
        const data = await response.json()
        setChats(data.data || [])
      } catch (error) {
        console.error('Failed to fetch chats:', error)
        toast({
          title: 'Could not load chats',
          description:
            error instanceof Error ? error.message : 'Please try again.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchChats()
  }, [session?.user?.id, toast])

  const handleValueChange = (chatId: string) => {
    router.push(`/chats/${chatId}`)
  }

  const handleRenameChat = async () => {
    if (!renameChatName.trim() || !currentChatId) return

    setIsRenamingChat(true)
    try {
      const response = await fetch(`/api/chats/${currentChatId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: renameChatName.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to rename chat')
      }

      const updatedChat = await response.json()

      // Update the chat in the list
      setChats((prev) =>
        prev.map((c) =>
          c.id === currentChatId ? { ...c, name: updatedChat.name } : c,
        ),
      )
      void mutate('/api/chats')

      // Close dialog and reset form
      setIsRenameDialogOpen(false)
      setRenameChatName('')
    } catch (error) {
      console.error('Error renaming chat:', error)
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

  const handleDeleteChat = async () => {
    if (!currentChatId) return

    setIsDeletingChat(true)
    try {
      const response = await fetch(`/api/chats/${currentChatId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete chat')
      }

      // Remove the chat from the list
      setChats((prev) => prev.filter((c) => c.id !== currentChatId))
      void mutate('/api/chats')

      // Close dialog and navigate to home
      setIsDeleteDialogOpen(false)
      router.push('/')
    } catch (error) {
      console.error('Error deleting chat:', error)
      toast({
        title: 'Could not delete chat',
        description:
          error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsDeletingChat(false)
    }
  }

  const handleDuplicateChat = async () => {
    if (!currentChatId) return

    setIsDuplicatingChat(true)
    try {
      const response = await fetch('/api/chat/fork', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chatId: currentChatId }),
      })

      if (!response.ok) {
        throw new Error('Failed to duplicate chat')
      }

      const result = await response.json()

      // Close dialog and navigate to the new forked chat
      setIsDuplicateDialogOpen(false)
      void mutate('/api/chats')
      router.push(`/chats/${result.id}`)
    } catch (error) {
      console.error('Error duplicating chat:', error)
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
    if (!currentChatId || !currentChat) return

    setIsUpdatingFavorite(true)
    try {
      const response = await fetch(`/api/chats/${currentChatId}/favorite`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !currentChat.favorite }),
      })
      if (!response.ok) throw new Error('Failed to update favorite')

      const updatedChat = await response.json()
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId
            ? { ...chat, favorite: updatedChat.favorited }
            : chat,
        ),
      )
      void mutate('/api/chats')
    } catch (error) {
      console.error('Error updating chat favorite:', error)
      toast({
        title: 'Could not update favorite',
        description: 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsUpdatingFavorite(false)
    }
  }

  const handleCopyChatLink = async () => {
    if (!currentChatId) return
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/chats/${encodeURIComponent(currentChatId)}`,
      )
      toast({ title: 'Chat link copied' })
    } catch (error) {
      console.error('Could not copy chat link:', error)
      toast({
        title: 'Could not copy chat link',
        description: 'Check clipboard permissions and try again.',
        variant: 'destructive',
      })
    }
  }

  const handleDownloadChatZip = async () => {
    if (!currentChatId) return
    try {
      const response = await fetch(
        `/api/chats/${encodeURIComponent(currentChatId)}/download`,
      )
      if (!response.ok) {
        const result: unknown = await response.json().catch(() => null)
        const message =
          result &&
          typeof result === 'object' &&
          'error' in result &&
          typeof result.error === 'string'
            ? result.error
            : 'Could not download the project ZIP.'
        throw new Error(message)
      }
      const url = URL.createObjectURL(await response.blob())
      const anchor = document.createElement('a')
      anchor.href = url
      const fileName = (currentChat?.name || currentChatId)
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

  const handleChangeVisibility = async () => {
    if (!currentChatId) return

    setIsChangingVisibility(true)
    try {
      const response = await fetch(`/api/chats/${currentChatId}/visibility`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ privacy: selectedVisibility }),
      })

      if (!response.ok) {
        throw new Error('Failed to change chat visibility')
      }

      const updatedChat = await response.json()

      // Update the chat in the list
      setChats((prev) =>
        prev.map((c) =>
          c.id === currentChatId ? { ...c, privacy: updatedChat.privacy } : c,
        ),
      )
      void mutate('/api/chats')

      // Close dialog
      setIsVisibilityDialogOpen(false)
    } catch (error) {
      console.error('Error changing chat visibility:', error)
      toast({
        title: 'Could not change visibility',
        description:
          error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsChangingVisibility(false)
    }
  }

  // Don't show if user is not authenticated
  if (!session?.user?.id) return null

  const currentChat = currentChatId
    ? chats.find((c) => c.id === currentChatId)
    : null

  return (
    <>
      <div className="flex items-center gap-1">
        <Select value={currentChatId || ''} onValueChange={handleValueChange}>
          <SelectTrigger
            className="w-fit min-w-[150px] max-w-[250px]"
            size="sm"
          >
            <SelectValue placeholder="Select chat">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="truncate">
                  {currentChat
                    ? getChatDisplayName(currentChat)
                    : 'Select chat'}
                </span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {chats.length > 0 ? (
              chats.slice(0, 15).map((chat) => (
                <SelectItem key={chat.id} value={chat.id}>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span className="truncate">{getChatDisplayName(chat)}</span>
                  </div>
                </SelectItem>
              ))
            ) : (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                No chats yet
              </div>
            )}
          </SelectContent>
        </Select>

        {/* Chat Context Menu */}
        {currentChat && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={
                  isRenamingChat ||
                  isDeletingChat ||
                  isDuplicatingChat ||
                  isChangingVisibility ||
                  isUpdatingFavorite
                }
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Project menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() => {
                  setRenameChatName(currentChat.name || '')
                  setIsRenameDialogOpen(true)
                }}
              >
                <Edit2 className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleToggleFavorite}
                disabled={isUpdatingFavorite}
              >
                <Star
                  className={`mr-2 h-4 w-4 ${currentChat.favorite ? 'fill-current' : ''}`}
                />
                {currentChat.favorite
                  ? 'Remove from Favorites'
                  : 'Add to Favorites'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleCopyChatLink()}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsInviteDialogOpen(true)}>
                <Share2 className="mr-2 h-4 w-4" />
                Invite
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedVisibility(currentChat.privacy || 'private')
                  setIsVisibilityDialogOpen(true)
                }}
                disabled={
                  isChangingVisibility ||
                  isRenamingChat ||
                  isDeletingChat ||
                  isDuplicatingChat
                }
              >
                {getPrivacyIcon(currentChat.privacy || 'private')}
                <span className="ml-2">Chat visibility</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsDuplicateDialogOpen(true)}
                disabled={
                  isRenamingChat ||
                  isDeletingChat ||
                  isDuplicatingChat ||
                  isChangingVisibility
                }
              >
                <Copy className="mr-2 h-4 w-4" />
                Duplicate…
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => void handleDownloadChatZip()}
                disabled={
                  !currentChat.latestVersion ||
                  currentChat.latestVersion.status !== 'completed'
                }
              >
                <Download className="mr-2 h-4 w-4" />
                Download ZIP
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {currentChat.projectId ? (
                <DropdownMenuItem asChild>
                  <Link
                    href={`/projects/${encodeURIComponent(currentChat.projectId)}`}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem disabled>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={
                  isRenamingChat ||
                  isDeletingChat ||
                  isDuplicatingChat ||
                  isChangingVisibility
                }
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite to chat</DialogTitle>
            <DialogDescription>
              Copy the chat link to share it. Access follows the chat’s{' '}
              {getPrivacyDisplayName(currentChat?.privacy || 'private')}{' '}
              visibility.
            </DialogDescription>
          </DialogHeader>
          <div className="truncate rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
            {typeof window === 'undefined'
              ? ''
              : `${window.location.origin}/chats/${encodeURIComponent(currentChatId || '')}`}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsInviteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                void handleCopyChatLink().then(() =>
                  setIsInviteDialogOpen(false),
                )
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Chat Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Chat</DialogTitle>
            <DialogDescription>
              Enter a new name for this chat.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Chat name"
              value={renameChatName}
              onChange={(e) => setRenameChatName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isRenamingChat) {
                  handleRenameChat()
                }
              }}
              disabled={isRenamingChat}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRenameDialogOpen(false)
                setRenameChatName('')
              }}
              disabled={isRenamingChat}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameChat}
              disabled={isRenamingChat || !renameChatName.trim()}
            >
              {isRenamingChat ? 'Renaming...' : 'Rename Chat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Chat Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Chat</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this chat? This action cannot be
              undone and will permanently remove the chat and all its messages.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeletingChat}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteChat}
              disabled={isDeletingChat}
            >
              {isDeletingChat ? 'Deleting...' : 'Delete Chat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Chat Dialog */}
      <Dialog
        open={isDuplicateDialogOpen}
        onOpenChange={setIsDuplicateDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Chat</DialogTitle>
            <DialogDescription>
              This will create a copy of the current chat. You'll be redirected
              to the new chat once it's created.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDuplicateDialogOpen(false)}
              disabled={isDuplicatingChat}
            >
              Cancel
            </Button>
            <Button onClick={handleDuplicateChat} disabled={isDuplicatingChat}>
              {isDuplicatingChat ? 'Duplicating...' : 'Duplicate Chat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Visibility Dialog */}
      <Dialog
        open={isVisibilityDialogOpen}
        onOpenChange={setIsVisibilityDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Chat Visibility</DialogTitle>
            <DialogDescription>
              Choose who can see and access this chat.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select
              value={selectedVisibility}
              onValueChange={(
                value: 'public' | 'private' | 'team' | 'team-edit' | 'unlisted',
              ) => setSelectedVisibility(value)}
            >
              <SelectTrigger>
                <SelectValue>
                  <div className="flex items-center gap-2">
                    {getPrivacyIcon(selectedVisibility)}
                    <span>{getPrivacyDisplayName(selectedVisibility)}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <EyeOff className="h-4 w-4" />
                    <div>
                      <div>Private</div>
                      <div className="text-xs text-muted-foreground">
                        Only you can see this chat
                      </div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="public">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    <div>
                      <div>Public</div>
                      <div className="text-xs text-muted-foreground">
                        Anyone can see this chat
                      </div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="team">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <div>
                      <div>Team</div>
                      <div className="text-xs text-muted-foreground">
                        Team members can see this chat
                      </div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="team-edit">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <div>
                      <div>Team Edit</div>
                      <div className="text-xs text-muted-foreground">
                        Team members can see and edit this chat
                      </div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="unlisted">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    <div>
                      <div>Unlisted</div>
                      <div className="text-xs text-muted-foreground">
                        Only people with the link can see this chat
                      </div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsVisibilityDialogOpen(false)}
              disabled={isChangingVisibility}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangeVisibility}
              disabled={isChangingVisibility}
            >
              {isChangingVisibility ? 'Changing...' : 'Change Visibility'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
