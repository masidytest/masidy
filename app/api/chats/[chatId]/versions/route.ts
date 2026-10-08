import { NextResponse } from 'next/server'
import { auth } from '@/app/(auth)/auth'
import { getChatOwnership } from '@/lib/db/queries'
import { v0 } from '@/lib/v0-key-pool'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const session = await auth()
    const { chatId } = await params
    if (session?.user?.id) {
      const ownership = await getChatOwnership({ v0ChatId: chatId })
      if (!ownership || ownership.user_id !== session.user.id) {
        return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
      }
    }

    const versions = await v0.chats.findVersions({ chatId, limit: 20 })
    return NextResponse.json(versions)
  } catch (error) {
    console.error('Chat versions fetch error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch chat versions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
