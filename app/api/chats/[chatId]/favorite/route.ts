import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/(auth)/auth'
import { getChatOwnership } from '@/lib/db/queries'
import { v0 } from '@/lib/v0-key-pool'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }

    const { chatId } = await params
    const ownership = await getChatOwnership({ v0ChatId: chatId })
    if (!ownership || ownership.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    const body: unknown = await request.json()
    if (
      !body ||
      typeof body !== 'object' ||
      !('isFavorite' in body) ||
      typeof body.isFavorite !== 'boolean'
    ) {
      return NextResponse.json(
        { error: 'isFavorite must be a boolean' },
        { status: 400 },
      )
    }

    const chat = await v0.chats.favorite({
      chatId,
      isFavorite: body.isFavorite,
    })
    return NextResponse.json(chat)
  } catch (error) {
    console.error('Chat favorite update error:', error)
    return NextResponse.json(
      {
        error: 'Failed to update chat favorite',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
