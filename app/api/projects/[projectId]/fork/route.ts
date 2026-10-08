import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/(auth)/auth'
import { createChatOwnership, getChatOwnership } from '@/lib/db/queries'
import { getAccessibleProjectIds } from '@/lib/project-access'
import { v0 } from '@/lib/v0-key-pool'

type RouteContext = { params: Promise<{ projectId: string }> }

export async function POST(request: NextRequest, { params }: RouteContext) {
  let forkedChatId: string | undefined

  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 },
      )
    }

    const { projectId } = await params
    const projectIds = await getAccessibleProjectIds(session.user.id)
    if (!projectIds.has(projectId)) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
    }

    const body: unknown = await request.json()
    if (
      !body ||
      typeof body !== 'object' ||
      !('chatId' in body) ||
      typeof body.chatId !== 'string' ||
      !body.chatId
    ) {
      return NextResponse.json(
        { error: 'A source chat is required.' },
        { status: 400 },
      )
    }

    const sourceChatId = body.chatId
    const ownership = await getChatOwnership({ v0ChatId: sourceChatId })
    if (!ownership || ownership.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Source chat not found.' },
        { status: 404 },
      )
    }

    const project = await v0.projects.getById({ projectId })
    if (!project.chats.some((chat) => chat.id === sourceChatId)) {
      return NextResponse.json(
        { error: 'Source chat is not in this project.' },
        { status: 404 },
      )
    }

    const forkedChat = await v0.chats.fork({
      chatId: sourceChatId,
      privacy: 'private',
    })
    forkedChatId = forkedChat.id

    await v0.projects.assign({ projectId, chatId: forkedChat.id })
    await createChatOwnership({
      v0ChatId: forkedChat.id,
      userId: session.user.id,
    })

    return NextResponse.json(forkedChat, { status: 201 })
  } catch (error) {
    console.error('Project chat fork error:', error)
    if (forkedChatId) {
      try {
        await v0.chats.delete({ chatId: forkedChatId })
      } catch (cleanupError) {
        console.error(
          `Could not remove incomplete fork ${forkedChatId}:`,
          cleanupError,
        )
      }
    }
    return NextResponse.json(
      {
        error: 'Could not fork this chat into the project.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
