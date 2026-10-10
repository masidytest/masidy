import 'server-only'

import { v0 } from '@/lib/v0-key-pool'
import { VercelPlatformError, vercelRequest } from '@/lib/vercel-platform'

export async function getOrCreateLinkedVercelProjectId(
  projectId: string,
): Promise<string> {
  const project = await v0.projects.getById({ projectId })
  let vercelProjectId = project.vercelProjectId

  if (!vercelProjectId) {
    const projectSlug = project.name
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48)
    const projectSuffix =
      projectId.toLowerCase().replace(/[^a-z0-9]/g, '').slice(-8) || 'project'
    const createdProject = await vercelRequest<unknown>('/v11/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: `masidy-${projectSlug || 'project'}-${projectSuffix}`,
      }),
    })
    if (
      !createdProject ||
      typeof createdProject !== 'object' ||
      !('id' in createdProject) ||
      typeof createdProject.id !== 'string'
    ) {
      throw new VercelPlatformError(
        'Vercel did not return the project created for this workspace.',
        502,
      )
    }
    vercelProjectId = createdProject.id
    try {
      await v0.integrations.vercel.projects.create({
        projectId: vercelProjectId,
        name: project.name,
      })
    } catch (error) {
      try {
        await vercelRequest<unknown>(
          `/v9/projects/${encodeURIComponent(vercelProjectId)}`,
          { method: 'DELETE' },
        )
      } catch (cleanupError) {
        console.error('Failed to remove an unlinked Vercel project:', {
          vercelProjectId,
          cleanupError,
        })
      }
      throw error
    }
  }

  if (!vercelProjectId) {
    throw new VercelPlatformError(
      'This project could not be linked to a Vercel project.',
      409,
    )
  }
  return vercelProjectId
}

export async function verifyVercelProjectAccess(
  projectId: string,
): Promise<void> {
  const project = await vercelRequest<unknown>(
    `/v9/projects/${encodeURIComponent(projectId)}`,
  )
  if (
    !project ||
    typeof project !== 'object' ||
    !('id' in project) ||
    project.id !== projectId
  ) {
    throw new VercelPlatformError(
      'The linked Vercel project is not available in the configured team.',
      409,
    )
  }
}
