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
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 },
      )
    }

    const { chatId } = await params
    const ownership = await getChatOwnership({ v0ChatId: chatId })
    if (!ownership || ownership.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Chat not found.' }, { status: 404 })
    }

    const chat = await v0.chats.getById({ chatId })
    if (!chat.latestVersion || chat.latestVersion.status !== 'completed') {
      return NextResponse.json(
        { error: 'This chat does not have a completed version to download.' },
        { status: 404 },
      )
    }

    const archive = await v0.chats.downloadVersion({
      chatId,
      versionId: chat.latestVersion.id,
      format: 'zip',
      includeDefaultFiles: true,
    })
    const fileName = `${
      (chat.name || 'masidy-project')
        .replace(/[^a-z0-9-_]+/gi, '-')
        .replace(/^-|-$/g, '') || 'masidy-project'
    }.zip`

    return new Response(archive, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('Chat ZIP download error:', error)
    return NextResponse.json(
      {
        error: 'Failed to download chat ZIP.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
