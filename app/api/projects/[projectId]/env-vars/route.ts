import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/(auth)/auth'
import { getAccessibleProjectIds } from '@/lib/project-access'
import { v0 } from '@/lib/v0-key-pool'

type RouteContext = { params: Promise<{ projectId: string }> }
type EnvironmentVariable = {
  id: string
  key: string
  createdAt: number
  updatedAt?: number
}

async function authorizeProject(projectId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return {
      response: NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 },
      ),
    }
  }

  const projectIds = await getAccessibleProjectIds(session.user.id)
  if (!projectIds.has(projectId)) {
    return {
      response: NextResponse.json(
        { error: 'Project not found.' },
        { status: 404 },
      ),
    }
  }
  return { userId: session.user.id }
}

function withoutValues(
  variables: Array<{
    id: string
    key: string
    createdAt: number
    updatedAt?: number
  }>,
): EnvironmentVariable[] {
  return variables.map(({ id, key, createdAt, updatedAt }) => ({
    id,
    key,
    createdAt,
    updatedAt,
  }))
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { projectId } = await params
    const access = await authorizeProject(projectId)
    if ('response' in access) return access.response

    const variables = await v0.projects.findEnvVars({
      projectId,
      decrypted: false,
    })
    return NextResponse.json({ data: withoutValues(variables.data) })
  } catch (error) {
    console.error('Project environment variable list error:', error)
    return NextResponse.json(
      { error: 'Could not load environment variables.' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { projectId } = await params
    const access = await authorizeProject(projectId)
    if ('response' in access) return access.response

    const body: unknown = await request.json()
    if (
      !body ||
      typeof body !== 'object' ||
      !('key' in body) ||
      typeof body.key !== 'string' ||
      body.key.length > 128 ||
      !/^[A-Za-z_][A-Za-z0-9_]*$/.test(body.key) ||
      !('value' in body) ||
      typeof body.value !== 'string' ||
      !body.value.length ||
      body.value.length > 8192
    ) {
      return NextResponse.json(
        {
          error:
            'Use a valid variable name and a non-empty value of at most 8,192 characters.',
        },
        { status: 400 },
      )
    }

    const variables = await v0.projects.createEnvVars({
      projectId,
      environmentVariables: [{ key: body.key, value: body.value }],
      upsert: true,
      decrypted: false,
    })
    return NextResponse.json({ data: withoutValues(variables.data) })
  } catch (error) {
    console.error('Project environment variable save error:', error)
    return NextResponse.json(
      { error: 'Could not save this environment variable.' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { projectId } = await params
    const access = await authorizeProject(projectId)
    if ('response' in access) return access.response

    const body: unknown = await request.json()
    if (
      !body ||
      typeof body !== 'object' ||
      !('id' in body) ||
      typeof body.id !== 'string' ||
      !body.id
    ) {
      return NextResponse.json(
        { error: 'An environment variable ID is required.' },
        { status: 400 },
      )
    }

    const variables = await v0.projects.findEnvVars({
      projectId,
      decrypted: false,
    })
    const targetVariable = variables.data.find(
      (variable) => variable.id === body.id,
    )
    if (!targetVariable) {
      return NextResponse.json(
        { error: 'Environment variable not found.' },
        { status: 404 },
      )
    }
    await v0.projects.deleteEnvVars({
      projectId,
      environmentVariableIds: [body.id],
    })
    return NextResponse.json({ id: body.id, deleted: true })
  } catch (error) {
    console.error('Project environment variable delete error:', error)
    return NextResponse.json(
      { error: 'Could not delete this environment variable.' },
      { status: 500 },
    )
  }
}
