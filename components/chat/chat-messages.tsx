import React, { useRef, useEffect, Component } from 'react'
import { Message, MessageContent } from '@/components/ai-elements/message'
import {
  Conversation,
  ConversationContent,
} from '@/components/ai-elements/conversation'
import { Loader } from '@/components/ai-elements/loader'
import { MessageRenderer } from '@/components/message-renderer'
import { sharedComponents } from '@/components/shared-components'
import { StreamingMessage } from '@v0-sdk/react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FollowUpSuggestions } from '@/components/chat/follow-up-suggestions'
import { useLocale } from '@/components/providers/locale-provider'

// Error boundary to catch render crashes without killing the whole tree
class StreamErrorBoundary extends Component<
  { children: React.ReactNode; onError?: (error: string) => void },
  { error: string | null }
> {
  constructor(props: {
    children: React.ReactNode
    onError?: (error: string) => void
  }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { error: error.message }
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[StreamErrorBoundary] caught:', error, info)
    this.props.onError?.(error.message)
  }
  render() {
    if (this.state.error) {
      return (
        <div className="my-2 px-3 py-2 rounded border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30 text-xs text-yellow-800 dark:text-yellow-200">
          {this.state.error}
        </div>
      )
    }
    return this.props.children
  }
}

interface ChatMessage {
  type: 'user' | 'assistant' | 'error'
  content: string | any
  isStreaming?: boolean
  stream?: ReadableStream<Uint8Array> | null
  error?: {
    message: string
    code?: string
    retryable?: boolean
  }
}

interface Chat {
  id: string
  demo?: string
  url?: string
}

interface ChatMessagesProps {
  chatHistory: ChatMessage[]
  isLoading: boolean
  currentChat: Chat | null
  onStreamingComplete: (finalContent: any) => void
  onStreamingUpdate?: (content: any) => void
  onChatData: (chatData: any) => void
  onStreamingStarted?: () => void
  onRetry?: () => void
  onError?: (error: string) => void
  isGenerationStopped?: () => boolean
  isStreaming?: boolean
  isBuildPending?: boolean
  onFollowUpClick?: (suggestion: string) => void
}

export function ChatMessages({
  chatHistory,
  isLoading,
  currentChat,
  onStreamingComplete,
  onStreamingUpdate,
  onChatData,
  onStreamingStarted,
  onRetry,
  onError,
  isGenerationStopped,
  isStreaming,
  isBuildPending = false,
  onFollowUpClick,
}: ChatMessagesProps) {
  const { t } = useLocale()
  const streamingStartedRef = useRef(false)

  // Reset the streaming started flag when a new message starts loading
  useEffect(() => {
    if (isLoading) {
      streamingStartedRef.current = false
    }
  }, [isLoading])

  if (chatHistory.length === 0) {
    return (
      <Conversation>
        <ConversationContent>
          <div>
            {/* Empty conversation - messages will appear here when they load */}
          </div>
        </ConversationContent>
      </Conversation>
    )
  }

  return (
    <>
      <Conversation>
        <ConversationContent className="space-y-4">
          {chatHistory.map((msg, index) => {
            // Handle error messages with enhanced UI
            if (msg.type === 'error' || msg.error) {
              return (
                <div
                  key={index}
                  className="my-4 px-4 py-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-red-900 dark:text-red-100">
                        {t(msg.error?.message || String(msg.content))}
                      </p>
                      {msg.error?.code && (
                        <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                          {t('Error code')}: {msg.error.code}
                        </p>
                      )}
                      {msg.error?.retryable && onRetry && (
                        <Button
                          onClick={onRetry}
                          variant="outline"
                          size="sm"
                          className="mt-3 border-red-300 hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900"
                        >
                          {t('Try Again')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <Message from={msg.type} key={index}>
                {msg.type === 'user' ? (
                  <MessageContent>
                    {typeof msg.content === 'string'
                      ? msg.content
                      : Array.isArray(msg.content)
                        ? JSON.stringify(msg.content)
                        : String(msg.content ?? '')}
                  </MessageContent>
                ) : msg.isStreaming && msg.stream ? (
                  <StreamErrorBoundary onError={onError}>
                    <StreamingMessage
                      stream={msg.stream}
                      messageId={`msg-${index}`}
                      role={msg.type}
                      onComplete={onStreamingComplete}
                      onChatData={onChatData}
                      onChunk={(chunk) => {
                        onStreamingUpdate?.(chunk)
                        // Hide external loader once we start receiving content (only once)
                        if (
                          onStreamingStarted &&
                          !streamingStartedRef.current
                        ) {
                          streamingStartedRef.current = true
                          onStreamingStarted()
                        }
                      }}
                      onError={(error) => {
                        if (isGenerationStopped?.()) return
                        console.error('Streaming error:', error)
                        onError?.(error)
                      }}
                      components={sharedComponents}
                      showLoadingIndicator={false}
                    />
                  </StreamErrorBoundary>
                ) : (
                  <MessageRenderer
                    content={msg.content}
                    role={msg.type}
                    messageId={`msg-${index}`}
                  />
                )}
              </Message>
            )
          })}
          {isLoading && (
            <div
              className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground"
              role={isBuildPending ? 'status' : undefined}
            >
              <Loader size={16} className="text-gray-500 dark:text-gray-400" />
              {isBuildPending && <span>{t('Building your project preview...')}</span>}
            </div>
          )}
        </ConversationContent>
      </Conversation>
      {chatHistory.length > 0 && !isStreaming && !isLoading && (
        <FollowUpSuggestions
          onSuggestionClick={onFollowUpClick ?? (() => {})}
        />
      )}
    </>
  )
}
