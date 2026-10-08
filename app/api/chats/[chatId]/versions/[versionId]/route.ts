import { NextResponse } from 'next/server'
import { auth } from '@/app/(auth)/auth'
import { getChatOwnership } from '@/lib/db/queries'
import { v0 } from '@/lib/v0-key-pool'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ chatId: string; versionId: string }> },
) {
  try {
    const session = await auth()
    const { chatId, versionId } = await params
    if (session?.user?.id) {
      const ownership = await getChatOwnership({ v0ChatId: chatId })
      if (!ownership || ownership.user_id !== session.user.id) {
        return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
      }
    }

    const version = await v0.chats.getVersion({
      chatId,
      versionId,
      includeDefaultFiles: true,
    })
    return NextResponse.json(version)
  } catch (error) {
    console.error('Chat version fetch error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch chat version',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
