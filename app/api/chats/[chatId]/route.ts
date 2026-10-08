import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/(auth)/auth'
import { deleteChatOwnership, getChatOwnership } from '@/lib/db/queries'
import { v0 } from '@/lib/v0-key-pool'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const session = await auth()
    const { chatId } = await params

    console.log('Fetching chat details for ID:', chatId)

    if (!chatId) {
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 },
      )
    }

    if (session?.user?.id) {
      // Authenticated user - check ownership
      const ownership = await getChatOwnership({ v0ChatId: chatId })

      if (!ownership) {
        return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
      }

      if (ownership.user_id !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      // Anonymous user - allow access to any chat (they can only access via direct URL)
      console.log('Anonymous access to chat:', chatId)
    }

    // Fetch chat details using v0 SDK
    const chatDetails = await v0.chats.getById({ chatId })

    console.log('Chat details fetched:', chatDetails)

    return NextResponse.json(chatDetails)
  } catch (error) {
    console.error('Error fetching chat details:', error)

    // Log more detailed error information
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch chat details',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const session = await auth()
    const { chatId } = await params
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 },
      )
    }

    const ownership = await getChatOwnership({ v0ChatId: chatId })
    if (!ownership || ownership.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Chat not found.' }, { status: 404 })
    }

    const body: unknown = await request.json()
    if (
      !body ||
      typeof body !== 'object' ||
      !('name' in body) ||
      typeof body.name !== 'string' ||
      !body.name.trim() ||
      body.name.trim().length > 100
    ) {
      return NextResponse.json(
        { error: 'Chat name must be between 1 and 100 characters.' },
        { status: 400 },
      )
    }

    const chat = await v0.chats.update({
      chatId,
      name: body.name.trim(),
    })
    return NextResponse.json(chat)
  } catch (error) {
    console.error('Chat rename error:', error)
    return NextResponse.json(
      {
        error: 'Failed to rename chat',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const session = await auth()
    const { chatId } = await params
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 },
      )
    }

    const ownership = await getChatOwnership({ v0ChatId: chatId })
    if (!ownership || ownership.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Chat not found.' }, { status: 404 })
    }

    const result = await v0.chats.delete({ chatId })
    await deleteChatOwnership({ v0ChatId: chatId })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Chat deletion error:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete chat',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
