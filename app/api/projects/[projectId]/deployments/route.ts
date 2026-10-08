import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/(auth)/auth'
import { getChatIdsByUserId, getChatOwnership } from '@/lib/db/queries'
import { getAccessibleProjectIds } from '@/lib/project-access'
import { v0 } from '@/lib/v0-key-pool'

export async function GET(
  _request: NextRequest,
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
    const projectIds = await getAccessibleProjectIds(session.user.id)
    if (!projectIds.has(projectId)) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
    }

    const [ownedChatIds, project] = await Promise.all([
      getChatIdsByUserId({ userId: session.user.id }),
      v0.projects.getById({ projectId }),
    ])

    const ownedChats = project.chats
      .filter(
        (chat) =>
          ownedChatIds.includes(chat.id) &&
          chat.latestVersion?.status === 'completed' &&
          chat.latestVersion.id,
      )
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt).getTime() -
          new Date(a.updatedAt || a.createdAt).getTime(),
      )
      .slice(0, 12)

    const deployments = await Promise.all(
      ownedChats.map(async (chat) => {
        const result = await v0.deployments.find({
          projectId,
          chatId: chat.id,
          versionId: chat.latestVersion!.id,
        })
        return result.data.map((deployment) => ({
          id: deployment.id,
          chatId: chat.id,
          chatName: chat.name || chat.title || `Chat ${chat.id.slice(0, 8)}`,
          versionId: deployment.versionId,
          webUrl: deployment.webUrl,
          inspectorUrl: deployment.inspectorUrl,
        }))
      }),
    )

    return NextResponse.json({ data: deployments.flat() })
  } catch (error) {
    console.error('Project deployments fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to load project deployments.' },
      { status: 500 },
    )
  }
}

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
      typeof body.chatId !== 'string' ||
      !('versionId' in body) ||
      typeof body.versionId !== 'string'
    ) {
      return NextResponse.json(
        { error: 'A chat ID and completed version ID are required.' },
        { status: 400 },
      )
    }

    const [projectIds, ownership, ownedChatIds] = await Promise.all([
      getAccessibleProjectIds(session.user.id),
      getChatOwnership({ v0ChatId: body.chatId }),
      getChatIdsByUserId({ userId: session.user.id }),
    ])
    if (!projectIds.has(projectId)) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
    }
    if (!ownership || ownership.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Chat not found.' }, { status: 404 })
    }
    if (!ownedChatIds.includes(body.chatId)) {
      return NextResponse.json({ error: 'Chat not found.' }, { status: 404 })
    }

    const [chat, version] = await Promise.all([
      v0.chats.getById({ chatId: body.chatId }),
      v0.chats.getVersion({
        chatId: body.chatId,
        versionId: body.versionId,
      }),
    ])
    if (chat.projectId !== projectId) {
      return NextResponse.json(
        { error: 'This chat is not assigned to the selected project.' },
        { status: 409 },
      )
    }
    if (version.status !== 'completed') {
      return NextResponse.json(
        { error: 'Only completed versions can be deployed.' },
        { status: 409 },
      )
    }

    const deployment = await v0.deployments.create({
      projectId,
      chatId: body.chatId,
      versionId: body.versionId,
    })
    return NextResponse.json(deployment, { status: 201 })
  } catch (error) {
    console.error('Project deployment creation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to deploy project version',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
