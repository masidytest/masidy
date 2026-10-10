import 'server-only'

import { randomUUID } from 'node:crypto'
import {
  VercelPlatformError,
  vercelRequest,
} from '@/lib/vercel-platform'
import { runVercelCli } from '@/lib/vercel-cli'
import {
  isClearlyFreePlan,
  getMarketplaceMetadataFields,
  validateMarketplaceMetadata as validateMetadataValues,
  type MarketplaceMetadataField,
} from '@/lib/vercel-marketplace-utils'

export interface MarketplaceProduct {
  installationId: string
  integrationId: string
  integrationSlug: string
  integrationName: string
  productId: string
  productSlug: string
  productName: string
  description?: string
  iconUrl?: string
  primaryProtocol?: string
  freePlan: {
    id: string
    name: string
  } | null
  metadataFields: MarketplaceMetadataField[]
  metadataSupported: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function isMarketplaceBillingPlan(
  value: unknown,
): value is {
  id: string
  name: string
  cost?: string
  disabled?: boolean
  paymentMethodRequired: boolean
  initialCharge?: string
  minimumAmount?: string
  maximumAmount?: string
  preauthorizationAmount?: number
  quote?: Array<{ amount?: string }>
} {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.paymentMethodRequired === 'boolean'
  )
}

function parseFreePlan(value: unknown): MarketplaceProduct['freePlan'] {
  if (!Array.isArray(value)) return null
  const plan = value.find(
    (entry) =>
      isMarketplaceBillingPlan(entry) && isClearlyFreePlan(entry),
  )
  return plan ? { id: plan.id, name: plan.name } : null
}

function requireString(
  value: unknown,
  description: string,
): string {
  if (typeof value !== 'string' || !value) {
    throw new VercelPlatformError(
      `Vercel returned an invalid ${description}.`,
      502,
    )
  }
  return value
}

export async function getMarketplaceCatalog(): Promise<MarketplaceProduct[]> {
  const configurations = await vercelRequest<unknown>(
    '/v1/integrations/configurations?view=account&installationType=marketplace',
  )
  if (!Array.isArray(configurations)) {
    throw new VercelPlatformError(
      'Vercel returned an invalid Marketplace installation list.',
      502,
    )
  }

  const installedConfigurations = configurations.filter(
    (configuration) =>
      isRecord(configuration) &&
      typeof configuration.id === 'string' &&
      typeof configuration.integrationId === 'string' &&
      !(configuration.disabledAt || configuration.deletedAt),
  )

  const catalogGroups = await Promise.all(
    installedConfigurations.map(async (configuration) => {
      if (!isRecord(configuration)) return []
      const configurationId = requireString(
        configuration.id,
        'Marketplace configuration ID',
      )
      const integrationId = requireString(
        configuration.integrationId,
        'Marketplace integration ID',
      )
      const productsResult = await vercelRequest<unknown>(
        `/v1/integrations/configuration/${encodeURIComponent(configurationId)}/products`,
      )
      if (
        !isRecord(productsResult) ||
        !Array.isArray(productsResult.products) ||
        !isRecord(productsResult.integration)
      ) {
        throw new VercelPlatformError(
          'Vercel returned an invalid Marketplace product list.',
          502,
        )
      }

      const integrationSlug =
        typeof productsResult.integration.slug === 'string'
          ? productsResult.integration.slug
          : requireString(configuration.slug, 'Marketplace integration slug')
      const integrationName =
        typeof productsResult.integration.name === 'string'
          ? productsResult.integration.name
          : integrationSlug

      return Promise.all(
        productsResult.products.map(async (product): Promise<MarketplaceProduct> => {
          if (!isRecord(product)) {
            throw new VercelPlatformError(
              'Vercel returned an invalid Marketplace product.',
              502,
            )
          }
          const productId = requireString(product.id, 'Marketplace product ID')
          const productSlug = requireString(
            product.slug,
            'Marketplace product slug',
          )
          const plansResult = await vercelRequest<unknown>(
            `/v1/integrations/integration/${encodeURIComponent(integrationId)}/products/${encodeURIComponent(productId)}/plans?integrationConfigurationId=${encodeURIComponent(configurationId)}&source=cli`,
          )
          const plans = isRecord(plansResult) ? plansResult.plans : undefined
          const metadata = getMarketplaceMetadataFields(product.metadataSchema)

          return {
            installationId: configurationId,
            integrationId,
            integrationSlug,
            integrationName,
            productId,
            productSlug,
            productName:
              typeof product.name === 'string' ? product.name : productSlug,
            description:
              typeof product.shortDescription === 'string'
                ? product.shortDescription
                : undefined,
            iconUrl:
              typeof product.iconUrl === 'string' ? product.iconUrl : undefined,
            primaryProtocol:
              typeof product.primaryProtocol === 'string'
                ? product.primaryProtocol
                : undefined,
            freePlan: parseFreePlan(plans),
            metadataFields: metadata.fields,
            metadataSupported: metadata.supported,
          }
        }),
      )
    }),
  )

  return catalogGroups.flat()
}

export function validateMarketplaceMetadata(
  fields: MarketplaceProduct['metadataFields'],
  input: unknown,
) {
  try {
    return validateMetadataValues(fields, input)
  } catch (error) {
    throw new VercelPlatformError(
      error instanceof Error ? error.message : 'Invalid Marketplace metadata.',
      400,
    )
  }
}

export async function addMarketplaceResource({
  projectId,
  product,
  metadata,
}: {
  projectId: string
  product: MarketplaceProduct
  metadata: unknown
}): Promise<string> {
  if (!product.freePlan) {
    throw new VercelPlatformError(
      'This Marketplace product has no verified free plan.',
      403,
    )
  }
  if (!product.metadataSupported) {
    throw new VercelPlatformError(
      'This product requires Marketplace setup fields Masidy cannot safely provide yet.',
      422,
    )
  }
  if (
    !/^[a-z0-9-]+$/.test(product.integrationSlug) ||
    !/^[a-z0-9-]+$/.test(product.productSlug)
  ) {
    throw new VercelPlatformError(
      'Vercel returned an invalid Marketplace product identifier.',
      502,
    )
  }

  const validatedMetadata = validateMarketplaceMetadata(
    product.metadataFields,
    metadata,
  )
  const projectSuffix =
    projectId.toLowerCase().replace(/[^a-z0-9]/g, '').slice(-8) || 'project'
  const resourceName = `masidy-${projectSuffix}-${product.integrationSlug.slice(0, 16)}-${randomUUID().slice(0, 8)}`
  const args = [
    'integration',
    'add',
    `${product.integrationSlug}/${product.productSlug}`,
    '--name',
    resourceName,
    '--installation-id',
    product.installationId,
    '--plan',
    product.freePlan.id,
    '--json',
    '--no-env-pull',
    '--no-claim',
    '--environment',
    'production',
    '--environment',
    'preview',
    '--environment',
    'development',
  ]
  for (const [key, value] of Object.entries(validatedMetadata)) {
    args.push('--metadata', `${key}=${value}`)
  }

  await runVercelCli(projectId, args)
  return resourceName
}

export async function setMarketplaceResourceConnection({
  projectId,
  resourceName,
  connected,
}: {
  projectId: string
  resourceName: string
  connected: boolean
}): Promise<void> {
  if (!/^masidy-[a-z0-9-]+$/.test(resourceName)) {
    throw new VercelPlatformError(
      'The stored Marketplace resource name is invalid.',
      409,
    )
  }
  await runVercelCli(projectId, [
    'integration',
    'resource',
    connected ? 'connect' : 'disconnect',
    resourceName,
    projectId,
    '--yes',
  ])
}
