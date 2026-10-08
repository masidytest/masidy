const BRANDED_DOMAIN = 'masidy.app'

function toProjectSlug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '')
}

export function getBrandedProjectDomainCandidates(
  projectName: string,
  projectId: string,
): string[] {
  const slug = toProjectSlug(projectName)
  const projectSuffix = projectId
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(-8)
  const uniqueSlug = `${slug || 'project'}-${projectSuffix || 'app'}`.slice(
    0,
    63,
  )
  const candidates = [
    ...(slug ? [`${slug}.${BRANDED_DOMAIN}`] : []),
    `${uniqueSlug}.${BRANDED_DOMAIN}`,
  ]

  return Array.from(new Set(candidates))
}

export function isBrandedProjectDomain(domain: string): boolean {
  return domain.toLowerCase().endsWith(`.${BRANDED_DOMAIN}`)
}
