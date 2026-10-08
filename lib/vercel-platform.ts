import 'server-only'

export interface VercelProjectDomain {
  name: string
  verified: boolean
  verification?: Array<{
    type: string
    domain?: string
    value?: string
    reason?: string
  }>
}

export class VercelPlatformError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'VercelPlatformError'
  }
}

function getPlatformConfig() {
  const token = process.env.VERCEL_TOKEN_KEY
  const teamId = process.env.VERCEL_TEAM_ID
  if (!token || !teamId) {
    throw new VercelPlatformError(
      'Vercel resource management is not configured.',
      503,
    )
  }
  return { token, teamId }
}

async function vercelRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { token, teamId } = getPlatformConfig()
  const url = new URL(path, 'https://api.vercel.com')
  url.searchParams.set('teamId', teamId)

  const response = await fetch(url, {
    ...init,
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      body &&
      typeof body === 'object' &&
      'error' in body &&
      body.error &&
      typeof body.error === 'object' &&
      'message' in body.error &&
      typeof body.error.message === 'string'
        ? body.error.message
        : 'Vercel could not complete this resource request.'
    throw new VercelPlatformError(message, response.status)
  }
  return body as T
}

function parseDomain(value: unknown): VercelProjectDomain {
  if (
    !value ||
    typeof value !== 'object' ||
    !('name' in value) ||
    typeof value.name !== 'string' ||
    !('verified' in value) ||
    typeof value.verified !== 'boolean'
  ) {
    throw new VercelPlatformError(
      'Vercel returned an invalid project domain.',
      502,
    )
  }

  const verification =
    'verification' in value && Array.isArray(value.verification)
      ? value.verification.flatMap((record) => {
          if (!record || typeof record !== 'object' || !('type' in record))
            return []
          return [
            {
              type: typeof record.type === 'string' ? record.type : 'DNS',
              domain:
                'domain' in record && typeof record.domain === 'string'
                  ? record.domain
                  : undefined,
              value:
                'value' in record && typeof record.value === 'string'
                  ? record.value
                  : undefined,
              reason:
                'reason' in record && typeof record.reason === 'string'
                  ? record.reason
                  : undefined,
            },
          ]
        })
      : undefined

  return {
    name: value.name,
    verified: value.verified,
    ...(verification ? { verification } : {}),
  }
}

export async function getProjectDomains(
  projectId: string,
): Promise<VercelProjectDomain[]> {
  const result = await vercelRequest<{ domains?: unknown[] }>(
    `/v9/projects/${encodeURIComponent(projectId)}/domains`,
  )
  if (!Array.isArray(result.domains)) {
    throw new VercelPlatformError(
      'Vercel returned an invalid project domain list.',
      502,
    )
  }
  return result.domains.map(parseDomain)
}

export async function addProjectDomain(
  projectId: string,
  domain: string,
): Promise<VercelProjectDomain> {
  const result = await vercelRequest<unknown>(
    `/v10/projects/${encodeURIComponent(projectId)}/domains`,
    {
      method: 'POST',
      body: JSON.stringify({ name: domain }),
    },
  )
  return parseDomain(result)
}

export async function verifyProjectDomain(
  projectId: string,
  domain: string,
): Promise<VercelProjectDomain> {
  const result = await vercelRequest<unknown>(
    `/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain)}/verify`,
    { method: 'POST' },
  )
  return parseDomain(result)
}

export async function removeProjectDomain(
  projectId: string,
  domain: string,
): Promise<void> {
  await vercelRequest<unknown>(
    `/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain)}`,
    { method: 'DELETE' },
  )
}
