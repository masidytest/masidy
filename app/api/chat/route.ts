import { NextRequest, NextResponse } from 'next/server'
import { ChatDetail } from 'v0-sdk'
import { v0 } from '@/lib/v0-key-pool'
import { auth } from '@/app/(auth)/auth'
import {
  createChatOwnership,
  createAnonymousChatLog,
  getChatCountByUserId,
  getChatCountByIP,
  getChatOwnership,
} from '@/lib/db/queries'
import { getAccessibleProjectIds } from '@/lib/project-access'
import {
  entitlementsByUserType,
  anonymousEntitlements,
} from '@/lib/entitlements'
import { ChatSDKError } from '@/lib/errors'
import {
  getRepositoryTemplateById,
  getGenerationResourceInstructions,
  isGenerationResourceId,
} from '@/lib/workspace-catalog'

const GENERATION_SYSTEM_PROMPT = `Build complete, polished web applications from the user's request, not rough mockups.

- Implement the requested experience end-to-end, including responsive layouts and functional interactions.
- Create and populate every file needed. For non-trivial apps, split major UI sections into reusable components and supporting files; keep page and route files focused on composing the app instead of placing the entire implementation in one file.
- Use a coherent visual system, accessible semantics, thoughtful spacing, and realistic content.
- Do not leave empty files, placeholder components, TODOs, or controls that do nothing.
- Follow the user's scope, reuse the project's available dependencies, and avoid adding files that do not serve the requested experience.`

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  if (realIP) {
    return realIP
  }

  // Fallback to connection remote address or unknown
  return 'unknown'
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const {
      message,
      chatId,
      streaming,
      attachments,
      projectId,
      designSystemInstructions,
      modelConfiguration,
      resourceIds,
      templateId,
    } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 },
      )
    }

    if (chatId && session?.user?.id) {
      const ownership = await getChatOwnership({ v0ChatId: chatId })
      if (!ownership || ownership.user_id !== session.user.id) {
        return NextResponse.json({ error: 'Chat not found.' }, { status: 404 })
      }
    }

    let projectInstructions = ''
    if (projectId) {
      if (typeof projectId !== 'string' || !session?.user?.id) {
        return NextResponse.json(
          { error: 'Sign in to create a chat in this project.' },
          { status: 401 },
        )
      }
      const accessibleProjectIds = await getAccessibleProjectIds(
        session.user.id,
      )
      if (!accessibleProjectIds.has(projectId)) {
        return NextResponse.json(
          { error: 'Project not found.' },
          { status: 404 },
        )
      }
      const project = await v0.projects.getById({ projectId })
      projectInstructions = project.instructions || ''
    }

    if (
      designSystemInstructions !== undefined &&
      (typeof designSystemInstructions !== 'string' ||
        designSystemInstructions.length > 4000)
    ) {
      return NextResponse.json(
        {
          error:
            'Design system instructions must be 4,000 characters or fewer.',
        },
        { status: 400 },
      )
    }
    if (
      modelConfiguration !== undefined &&
      (!modelConfiguration ||
        typeof modelConfiguration !== 'object' ||
        !['v0-mini', 'v0-pro', 'v0-max'].includes(modelConfiguration.modelId))
    ) {
      return NextResponse.json(
        { error: 'Invalid model selection.' },
        { status: 400 },
      )
    }
    if (
      resourceIds !== undefined &&
      (!Array.isArray(resourceIds) ||
        resourceIds.length > 5 ||
        resourceIds.some(
          (id) => typeof id !== 'string' || !isGenerationResourceId(id),
        ))
    ) {
      return NextResponse.json(
        { error: 'One or more selected starter resources are invalid.' },
        { status: 400 },
      )
    }
    if (
      templateId !== undefined &&
      (typeof templateId !== 'string' ||
        !getRepositoryTemplateById(templateId) ||
        chatId)
    ) {
      return NextResponse.json(
        { error: 'The selected ready-to-import template is invalid.' },
        { status: 400 },
      )
    }
    const resourceInstructions = getGenerationResourceInstructions(
      resourceIds ?? [],
    )
    const generationSystemPrompt = [
      GENERATION_SYSTEM_PROMPT,
      projectInstructions
        ? `\n\nProject instructions:\n${projectInstructions}`
        : '',
      designSystemInstructions
        ? `\n\nDesign system instructions:\n${designSystemInstructions}`
        : '',
      resourceInstructions
        ? `\n\nSelected open-source starter and component references:\n${resourceInstructions}`
        : '',
    ].join('')

    // Rate limiting
    if (session?.user?.id) {
      // Authenticated user rate limiting
      const chatCount = await getChatCountByUserId({
        userId: session.user.id,
        differenceInHours: 24,
      })

      const userType = session.user.type
      if (chatCount >= entitlementsByUserType[userType].maxMessagesPerDay) {
        return new ChatSDKError('rate_limit:chat').toResponse()
      }

      console.log('API request:', {
        message,
        chatId,
        streaming,
        userId: session.user.id,
      })
    } else {
      // Anonymous user rate limiting
      const clientIP = getClientIP(request)
      const chatCount = await getChatCountByIP({
        ipAddress: clientIP,
        differenceInHours: 24,
      })

      if (chatCount >= anonymousEntitlements.maxMessagesPerDay) {
        return new ChatSDKError('rate_limit:chat').toResponse()
      }

      console.log('API request (anonymous):', {
        message,
        chatId,
        streaming,
        ip: clientIP,
      })
    }

    console.log('Using baseUrl:', process.env.V0_API_URL || 'default')

    let chat

    if (templateId) {
      const template = getRepositoryTemplateById(templateId)
      if (!template?.source) {
        return NextResponse.json(
          { error: 'The selected template source is unavailable.' },
          { status: 400 },
        )
      }

      const initializedChat = await v0.chats.init({
        type: 'repo',
        repo: {
          url: template.source.url,
          branch: template.source.branch,
        },
        name: template.name,
        ...(projectId && { projectId }),
      })
      if (session?.user?.id) {
        await createChatOwnership({
          v0ChatId: initializedChat.id,
          userId: session.user.id,
        })
      } else {
        await createAnonymousChatLog({
          ipAddress: getClientIP(request),
          v0ChatId: initializedChat.id,
        })
      }

      chat = await v0.chats.sendMessage({
        chatId: initializedChat.id,
        message,
        system: generationSystemPrompt,
        ...(modelConfiguration && { modelConfiguration }),
        responseMode: streaming ? 'experimental_stream' : 'sync',
        ...(attachments && attachments.length > 0 && { attachments }),
      })
      if (streaming) {
        return new Response(chat as ReadableStream<Uint8Array>, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        })
      }
    } else if (chatId) {
      // continue existing chat
      if (streaming) {
        // Return streaming response for existing chat
        console.log('Sending streaming message to existing chat:', {
          chatId,
          message,
          responseMode: 'experimental_stream',
        })
        chat = await v0.chats.sendMessage({
          chatId: chatId,
          message,
          responseMode: 'experimental_stream',
          ...(attachments && attachments.length > 0 && { attachments }),
        })
        console.log('Streaming message sent to existing chat successfully')

        // Return the stream directly
        return new Response(chat as ReadableStream<Uint8Array>, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        })
      } else {
        // Non-streaming response for existing chat
        chat = await v0.chats.sendMessage({
          chatId: chatId,
          message,
          ...(attachments && attachments.length > 0 && { attachments }),
        })
      }
    } else {
      // create new chat
      if (streaming) {
        // Return streaming response
        console.log('Creating streaming chat with params:', {
          message,
          responseMode: 'experimental_stream',
        })
        chat = await v0.chats.create({
          message,
          system: generationSystemPrompt,
          ...(projectId && { projectId }),
          ...(modelConfiguration && { modelConfiguration }),
          responseMode: 'experimental_stream',
          ...(attachments && attachments.length > 0 && { attachments }),
        })
        console.log('Streaming chat created successfully')

        // Return the stream directly
        return new Response(chat as ReadableStream<Uint8Array>, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        })
      } else {
        // Use sync mode
        console.log('Creating sync chat with params:', {
          message,
          responseMode: 'sync',
        })
        chat = await v0.chats.create({
          message,
          system: generationSystemPrompt,
          ...(projectId && { projectId }),
          ...(modelConfiguration && { modelConfiguration }),
          responseMode: 'sync',
          ...(attachments && attachments.length > 0 && { attachments }),
        })
        console.log('Sync chat created successfully')
      }
    }

    // Type guard to ensure we have a ChatDetail and not a stream
    if (chat instanceof ReadableStream) {
      throw new Error('Unexpected streaming response')
    }

    const chatDetail = chat as ChatDetail

    // Create ownership mapping or anonymous log for new chat
    if (!chatId && !templateId && chatDetail.id) {
      try {
        if (session?.user?.id) {
          // Authenticated user - create ownership mapping
          await createChatOwnership({
            v0ChatId: chatDetail.id,
            userId: session.user.id,
          })
          console.log('Chat ownership created:', chatDetail.id)
        } else {
          // Anonymous user - log for rate limiting
          const clientIP = getClientIP(request)
          await createAnonymousChatLog({
            ipAddress: clientIP,
            v0ChatId: chatDetail.id,
          })
          console.log('Anonymous chat logged:', chatDetail.id, 'IP:', clientIP)
        }
      } catch (error) {
        console.error('Failed to create chat ownership/log:', error)
        // Don't fail the request if database save fails
      }
    }

    return NextResponse.json({
      id: chatDetail.id,
      demo: chatDetail.demo,
      messages: chatDetail.messages?.map((msg) => ({
        ...msg,
        experimental_content: (msg as any).experimental_content,
      })),
    })
  } catch (error) {
    console.error('V0 API Error:', error)

    // Log more detailed error information
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }

    // Handle different types of errors with structured responses
    if (error instanceof ChatSDKError) {
      return error.toResponse()
    }

    // Handle rate limiting errors (429)
    if (
      error &&
      typeof error === 'object' &&
      'status' in error &&
      error.status === 429
    ) {
      return NextResponse.json(
        {
          error:
            'You have exceeded your maximum number of messages. Please try again later.',
          code: 'rate_limit_exceeded',
          retryable: true,
        },
        { status: 429 },
      )
    }

    // Handle authentication errors (401)
    if (
      error &&
      typeof error === 'object' &&
      'status' in error &&
      error.status === 401
    ) {
      return NextResponse.json(
        {
          error: 'Authentication failed. Please check your API key.',
          code: 'authentication_error',
          retryable: false,
        },
        { status: 401 },
      )
    }

    // Handle network errors
    if (error instanceof Error && error.message.includes('fetch failed')) {
      return NextResponse.json(
        {
          error: 'Network error. Please check your connection and try again.',
          code: 'network_error',
          retryable: true,
        },
        { status: 503 },
      )
    }

    // Generic error fallback
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred. Please try again.',
        code: 'unknown_error',
        retryable: true,
      },
      { status: 500 },
    )
  }
}
