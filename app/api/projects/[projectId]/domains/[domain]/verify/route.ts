import { NextResponse } from 'next/server'
import { auth } from '@/app/(auth)/auth'
import { getAccessibleProjectIds } from '@/lib/project-access'
import {
  VercelPlatformError,
  verifyProjectDomain,
} from '@/lib/vercel-platform'
import { v0 } from '@/lib/v0-key-pool'

type RouteContext = {
  params: Promise<{ projectId: string; domain: string }>
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 },
      )
    }

    const { projectId, domain } = await context.params
    const accessibleProjectIds = await getAccessibleProjectIds(session.user.id)
    if (!accessibleProjectIds.has(projectId)) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
    }

    const project = await v0.projects.getById({ projectId })
    if (!project.vercelProjectId) {
      return NextResponse.json(
        { error: 'This project is not linked to Vercel.' },
        { status: 409 },
      )
    }

    const result = await verifyProjectDomain(
      project.vercelProjectId,
      decodeURIComponent(domain),
    )
    return NextResponse.json({ data: result })
  } catch (error) {
    if (error instanceof VercelPlatformError) {
      const status =
        error.status >= 400 && error.status < 500 ? error.status : 502
      return NextResponse.json({ error: error.message }, { status })
    }
    console.error('Project domain verification error:', error)
    return NextResponse.json(
      { error: 'Could not verify this domain.' },
      { status: 500 },
    )
  }
}
