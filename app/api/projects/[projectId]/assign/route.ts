import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/(auth)/auth'
import { getChatOwnership } from '@/lib/db/queries'
import { getAccessibleProjectIds } from '@/lib/project-access'
import { v0 } from '@/lib/v0-key-pool'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 },
      )
    }

    const { projectId } = await params
    const body: unknown = await request.json()
    if (
      !body ||
      typeof body !== 'object' ||
      !('chatId' in body) ||
      typeof body.chatId !== 'string'
    ) {
      return NextResponse.json(
        { error: 'A chat ID is required.' },
        { status: 400 },
      )
    }

    const [projectIds, ownership] = await Promise.all([
      getAccessibleProjectIds(session.user.id),
      getChatOwnership({ v0ChatId: body.chatId }),
    ])
    if (!projectIds.has(projectId)) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
    }
    if (!ownership || ownership.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Chat not found.' }, { status: 404 })
    }

    const result = await v0.projects.assign({
      projectId,
      chatId: body.chatId,
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Project chat assignment error:', error)
    return NextResponse.json(
      {
        error: 'Failed to add chat to project',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
