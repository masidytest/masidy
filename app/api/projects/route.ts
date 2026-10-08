import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/(auth)/auth'
import { createProjectOwnership, getChatIdsByUserId } from '@/lib/db/queries'
import { getAccessibleProjectIds } from '@/lib/project-access'
import { managedResourceLimits } from '@/lib/managed-resource-limits'
import { v0 } from '@/lib/v0-key-pool'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ data: [] })
    }

    const projectIds = await getAccessibleProjectIds(session.user.id)
    if (projectIds.size === 0) {
      return NextResponse.json({ data: [] })
    }

    const projects = await v0.projects.find()
    return NextResponse.json({
      data: projects.data.filter((project) => projectIds.has(project.id)),
    })
  } catch (error) {
    console.error('Projects fetch error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch projects',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required to create a project.' },
        { status: 401 },
      )
    }

    const accessibleProjectIds = await getAccessibleProjectIds(session.user.id)
    if (accessibleProjectIds.size >= managedResourceLimits.projectsPerUser) {
      return NextResponse.json(
        {
          error: `You can create up to ${managedResourceLimits.projectsPerUser} projects.`,
          limit: managedResourceLimits.projectsPerUser,
          used: accessibleProjectIds.size,
        },
        { status: 409 },
      )
    }

    const body: unknown = await request.json()
    if (
      !body ||
      typeof body !== 'object' ||
      !('name' in body) ||
      typeof body.name !== 'string' ||
      !body.name.trim() ||
      body.name.trim().length > 80
    ) {
      return NextResponse.json(
        { error: 'Project name must be between 1 and 80 characters.' },
        { status: 400 },
      )
    }

    const description =
      'description' in body && typeof body.description === 'string'
        ? body.description.trim().slice(0, 500)
        : undefined
    const instructions =
      'instructions' in body && typeof body.instructions === 'string'
        ? body.instructions.trim().slice(0, 4000)
        : undefined

    const project = await v0.projects.create({
      name: body.name.trim(),
      privacy: 'private',
      ...(description ? { description } : {}),
      ...(instructions ? { instructions } : {}),
    })
    await createProjectOwnership({
      v0ProjectId: project.id,
      userId: session.user.id,
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Project creation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to create project',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
