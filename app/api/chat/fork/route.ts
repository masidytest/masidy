import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/(auth)/auth'
import { createChatOwnership, getChatOwnership } from '@/lib/db/queries'
import { v0 } from '@/lib/v0-key-pool'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 },
      )
    }
    const { chatId } = await request.json()

    if (typeof chatId !== 'string' || !chatId) {
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 },
      )
    }

    const ownership = await getChatOwnership({ v0ChatId: chatId })
    if (!ownership || ownership.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Chat not found.' }, { status: 404 })
    }

    // Fork the chat using v0 SDK
    const forkedChat = await v0.chats.fork({
      chatId,
      privacy: 'private', // Default to private
    })
    await createChatOwnership({
      v0ChatId: forkedChat.id,
      userId: session.user.id,
    })

    console.log('Chat forked successfully:', forkedChat.id)

    return NextResponse.json(forkedChat)
  } catch (error) {
    console.error('Error forking chat:', error)
    return NextResponse.json({ error: 'Failed to fork chat' }, { status: 500 })
  }
}
