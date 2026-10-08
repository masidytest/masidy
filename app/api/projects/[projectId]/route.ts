import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/(auth)/auth'
import { deleteProjectOwnership, getChatIdsByUserId } from '@/lib/db/queries'
import { getAccessibleProjectIds } from '@/lib/project-access'
import { v0 } from '@/lib/v0-key-pool'

type RouteContext = { params: Promise<{ projectId: string }> }

async function getAuthorizedProject({ params }: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return {
      response: NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 },
      ),
    }
  }

  const { projectId } = await params
  const projectIds = await getAccessibleProjectIds(session.user.id)
  if (!projectIds.has(projectId)) {
    return {
      response: NextResponse.json(
        { error: 'Project not found.' },
        { status: 404 },
      ),
    }
  }

  return { session, projectId }
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const access = await getAuthorizedProject(context)
    if ('response' in access) return access.response

    const project = await v0.projects.getById({ projectId: access.projectId })
    const ownedChatIds = await getChatIdsByUserId({
      userId: access.session.user.id,
    })
    return NextResponse.json({
      ...project,
      chats: project.chats.filter((chat) => ownedChatIds.includes(chat.id)),
    })
  } catch (error) {
    console.error('Project fetch error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch project',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const access = await getAuthorizedProject(context)
    if ('response' in access) return access.response

    const body: unknown = await request.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid project update.' },
        { status: 400 },
      )
    }

    const update: {
      projectId: string
      name?: string
      instructions?: string
      privacy?: 'private' | 'team'
    } = { projectId: access.projectId }

    if ('name' in body) {
      if (
        typeof body.name !== 'string' ||
        !body.name.trim() ||
        body.name.trim().length > 80
      ) {
        return NextResponse.json(
          { error: 'Project name must be between 1 and 80 characters.' },
          { status: 400 },
        )
      }
      update.name = body.name.trim()
    }
    if ('instructions' in body) {
      if (
        typeof body.instructions !== 'string' ||
        body.instructions.length > 4000
      ) {
        return NextResponse.json(
          { error: 'Project instructions must be 4,000 characters or fewer.' },
          { status: 400 },
        )
      }
      update.instructions = body.instructions.trim()
    }
    if ('privacy' in body) {
      if (body.privacy !== 'private' && body.privacy !== 'team') {
        return NextResponse.json(
          { error: 'Privacy must be private or team.' },
          { status: 400 },
        )
      }
      update.privacy = body.privacy
    }
    if (Object.keys(update).length === 1) {
      return NextResponse.json(
        {
          error: 'Provide a project name, instructions, or privacy to update.',
        },
        { status: 400 },
      )
    }

    const project = await v0.projects.update(update)
    return NextResponse.json(project)
  } catch (error) {
    console.error('Project update error:', error)
    return NextResponse.json(
      {
        error: 'Failed to update project',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const access = await getAuthorizedProject(context)
    if ('response' in access) return access.response

    await v0.projects.delete({
      projectId: access.projectId,
      deleteAllChats: false,
    })
    await deleteProjectOwnership({ v0ProjectId: access.projectId })
    return NextResponse.json({ id: access.projectId, deleted: true })
  } catch (error) {
    console.error('Project deletion error:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete project',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
