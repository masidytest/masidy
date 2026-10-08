import { NextRequest, NextResponse } from 'next/server'
import { domainToASCII } from 'node:url'
import { auth } from '@/app/(auth)/auth'
import { getAccessibleProjectIds } from '@/lib/project-access'
import { managedResourceLimits } from '@/lib/managed-resource-limits'
import {
  addProjectDomain,
  getProjectDomains,
  removeProjectDomain,
  VercelPlatformError,
} from '@/lib/vercel-platform'
import { v0 } from '@/lib/v0-key-pool'

type RouteContext = { params: Promise<{ projectId: string }> }

async function getAuthorizedVercelProject(context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return {
      response: NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 },
      ),
    }
  }

  const { projectId } = await context.params
  const accessibleProjectIds = await getAccessibleProjectIds(session.user.id)
  if (!accessibleProjectIds.has(projectId)) {
    return {
      response: NextResponse.json({ error: 'Project not found.' }, {
        status: 404,
      }),
    }
  }

  const project = await v0.projects.getById({ projectId })
  if (!project.vercelProjectId) {
    return {
      response: NextResponse.json(
        {
          error:
            'This project is not linked to a Vercel project yet. Create a new Masidy project to enable managed domains.',
        },
        { status: 409 },
      ),
    }
  }

  return { vercelProjectId: project.vercelProjectId }
}

function platformErrorResponse(error: unknown, fallback: string) {
  if (error instanceof VercelPlatformError) {
    const status =
      error.status >= 400 && error.status < 500 ? error.status : 502
    return NextResponse.json({ error: error.message }, { status })
  }
  console.error(fallback, error)
  return NextResponse.json({ error: fallback }, { status: 500 })
}

function normalizeDomain(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const input = value.trim().replace(/\.$/, '').toLowerCase()
  if (
    !input ||
    input.length > 253 ||
    input.includes('*') ||
    input.includes('/') ||
    input.includes(':')
  ) {
    return null
  }

  const domain = domainToASCII(input)
  if (
    !domain ||
    domain.split('.').length < 2 ||
    domain.split('.').some(
      (label) =>
        label.length < 1 ||
        label.length > 63 ||
        !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
    )
  ) {
    return null
  }
  return domain
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const access = await getAuthorizedVercelProject(context)
    if ('response' in access) return access.response

    const domains = await getProjectDomains(access.vercelProjectId)
    const customDomains = domains.filter(
      (domain) => !domain.name.endsWith('.vercel.app'),
    )
    return NextResponse.json({
      data: customDomains,
      limit: managedResourceLimits.customDomainsPerProject,
    })
  } catch (error) {
    return platformErrorResponse(error, 'Could not load project domains.')
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const access = await getAuthorizedVercelProject(context)
    if ('response' in access) return access.response

    const body: unknown = await request.json()
    const domain =
      body && typeof body === 'object' && 'domain' in body
        ? normalizeDomain(body.domain)
        : null
    if (!domain) {
      return NextResponse.json(
        { error: 'Enter a valid domain name, such as app.example.com.' },
        { status: 400 },
      )
    }

    const existingDomains = await getProjectDomains(access.vercelProjectId)
    const customDomains = existingDomains.filter(
      (item) => !item.name.endsWith('.vercel.app'),
    )
    if (customDomains.length >= managedResourceLimits.customDomainsPerProject) {
      return NextResponse.json(
        {
          error: `A project can have up to ${managedResourceLimits.customDomainsPerProject} custom domains.`,
          limit: managedResourceLimits.customDomainsPerProject,
          used: customDomains.length,
        },
        { status: 409 },
      )
    }

    const result = await addProjectDomain(access.vercelProjectId, domain)
    return NextResponse.json({ data: result }, { status: 201 })
  } catch (error) {
    return platformErrorResponse(error, 'Could not add this domain.')
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const access = await getAuthorizedVercelProject(context)
    if ('response' in access) return access.response

    const body: unknown = await request.json()
    const domain =
      body && typeof body === 'object' && 'domain' in body
        ? normalizeDomain(body.domain)
        : null
    if (!domain) {
      return NextResponse.json(
        { error: 'A valid domain name is required.' },
        { status: 400 },
      )
    }

    const existingDomains = await getProjectDomains(access.vercelProjectId)
    if (
      !existingDomains.some(
        (item) => item.name.toLowerCase() === domain.toLowerCase(),
      )
    ) {
      return NextResponse.json(
        { error: 'This domain is not connected to the project.' },
        { status: 404 },
      )
    }

    await removeProjectDomain(access.vercelProjectId, domain)
    return NextResponse.json({ domain, deleted: true })
  } catch (error) {
    return platformErrorResponse(error, 'Could not remove this domain.')
  }
}
