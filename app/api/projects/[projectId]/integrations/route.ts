import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/(auth)/auth'
import {
  createProjectIntegration,
  getProjectIntegrationById,
  getProjectIntegrations,
  getProjectOwnership,
  updateProjectIntegrationStatus,
} from '@/lib/db/queries'
import { getAccessibleProjectIds } from '@/lib/project-access'
import {
  addMarketplaceResource,
  getMarketplaceCatalog,
  setMarketplaceResourceConnection,
  validateMarketplaceMetadata,
  type MarketplaceProduct,
} from '@/lib/vercel-marketplace'
import { VercelPlatformError } from '@/lib/vercel-platform'
import {
  getOrCreateLinkedVercelProjectId,
  verifyVercelProjectAccess,
} from '@/lib/vercel-projects'

type RouteContext = { params: Promise<{ projectId: string }> }

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

  const ownership = await getProjectOwnership({ v0ProjectId: projectId })
  return {
    userId: session.user.id,
    canManage: ownership?.user_id === session.user.id,
  }
}

function getErrorResponse(error: unknown, fallback: string) {
  if (error instanceof VercelPlatformError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    )
  }
  console.error(fallback, error)
  return NextResponse.json({ error: fallback }, { status: 500 })
}

function parseProductRequest(body: unknown): {
  installationId: string
  productId: string
  metadata: unknown
} | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const record = body as Record<string, unknown>
  if (
    typeof record.installationId !== 'string' ||
    !record.installationId ||
    typeof record.productId !== 'string' ||
    !record.productId
  ) {
    return null
  }
  return {
    installationId: record.installationId,
    productId: record.productId,
    metadata: record.metadata ?? {},
  }
}

function findRequestedProduct(
  catalog: MarketplaceProduct[],
  installationId: string,
  productId: string,
) {
  return catalog.find(
    (product) =>
      product.installationId === installationId &&
      product.productId === productId,
  )
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { projectId } = await params
    const access = await authorizeProject(projectId)
    if ('response' in access) return access.response

    const [catalog, integrations] = await Promise.all([
      getMarketplaceCatalog(),
      getProjectIntegrations({ v0ProjectId: projectId }),
    ])

    return NextResponse.json({
      catalog,
      integrations: integrations.map((integration) => ({
        id: integration.id,
        provider: integration.provider,
        productSlug: integration.product_slug,
        productName: integration.product_name,
        resourceName: integration.resource_name,
        status: integration.status,
      })),
      canManage: access.canManage,
    })
  } catch (error) {
    return getErrorResponse(error, 'Could not load Vercel Marketplace integrations.')
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  let resourceName: string | undefined
  let vercelProjectId: string | undefined
  try {
    const { projectId } = await params
    const access = await authorizeProject(projectId)
    if ('response' in access) return access.response
    if (!access.canManage) {
      return NextResponse.json(
        { error: 'Only the project owner can manage integrations.' },
        { status: 403 },
      )
    }

    let payload: unknown
    try {
      payload = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Request body must be valid JSON.' },
        { status: 400 },
      )
    }
    const selection = parseProductRequest(payload)
    if (!selection) {
      return NextResponse.json(
        { error: 'Choose a valid Marketplace product.' },
        { status: 400 },
      )
    }

    const catalog = await getMarketplaceCatalog()
    const product = findRequestedProduct(
      catalog,
      selection.installationId,
      selection.productId,
    )
    if (!product) {
      return NextResponse.json(
        { error: 'This Marketplace product is not installed for Masidy.' },
        { status: 404 },
      )
    }
    if (!product.freePlan) {
      return NextResponse.json(
        { error: 'This product has no verified free plan. Paid provisioning is disabled.' },
        { status: 403 },
      )
    }
    if (!product.metadataSupported) {
      return NextResponse.json(
        {
          error:
            'This product requires Marketplace setup fields Masidy cannot safely provide yet.',
        },
        { status: 422 },
      )
    }
    validateMarketplaceMetadata(product.metadataFields, selection.metadata)

    const existingIntegrations = await getProjectIntegrations({
      v0ProjectId: projectId,
    })
    if (existingIntegrations.some(({ provider }) => provider === product.integrationSlug)) {
      return NextResponse.json(
        {
          error:
            'This project already has a resource from this integration. Reconnect or disconnect the existing resource instead.',
        },
        { status: 409 },
      )
    }

    vercelProjectId =
      existingIntegrations[0]?.vercel_project_id ??
      (await getOrCreateLinkedVercelProjectId(projectId))
    await verifyVercelProjectAccess(vercelProjectId)
    resourceName = await addMarketplaceResource({
      projectId: vercelProjectId,
      product,
      metadata: selection.metadata,
    })

    try {
      const [integration] = await createProjectIntegration({
        v0ProjectId: projectId,
        vercelProjectId,
        provider: product.integrationSlug,
        installationId: product.installationId,
        integrationId: product.integrationId,
        productId: product.productId,
        productSlug: product.productSlug,
        productName: product.productName,
        resourceName,
        userId: access.userId,
      })
      return NextResponse.json(
        {
          id: integration.id,
          provider: integration.provider,
          productSlug: integration.product_slug,
          productName: integration.product_name,
          resourceName: integration.resource_name,
          status: integration.status,
        },
        { status: 201 },
      )
    } catch (error) {
      console.error('Failed to save Marketplace resource metadata:', {
        resourceName,
        error,
      })
      let disconnected = false
      try {
        await setMarketplaceResourceConnection({
          projectId: vercelProjectId,
          resourceName,
          connected: false,
        })
        disconnected = true
      } catch (cleanupError) {
        console.error('Failed to disconnect an unrecorded Marketplace resource:', {
          resourceName,
          cleanupError,
        })
      }
      throw new VercelPlatformError(
        disconnected
          ? 'Vercel created this resource, but Masidy could not save its record. It is disconnected and remains in the Vercel team; contact support before retrying.'
          : 'Vercel created this resource, but Masidy could not save its record or disconnect it. Contact support before retrying.',
        500,
      )
    }
  } catch (error) {
    return getErrorResponse(error, 'Could not provision the free Marketplace resource.')
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { projectId } = await params
    const access = await authorizeProject(projectId)
    if ('response' in access) return access.response
    if (!access.canManage) {
      return NextResponse.json(
        { error: 'Only the project owner can manage integrations.' },
        { status: 403 },
      )
    }

    let payload: unknown
    try {
      payload = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Request body must be valid JSON.' },
        { status: 400 },
      )
    }
    if (
      !payload ||
      typeof payload !== 'object' ||
      Array.isArray(payload) ||
      !('id' in payload) ||
      typeof payload.id !== 'string' ||
      !('action' in payload) ||
      (payload.action !== 'connect' && payload.action !== 'disconnect')
    ) {
      return NextResponse.json(
        { error: 'Choose an integration and a valid connect or disconnect action.' },
        { status: 400 },
      )
    }

    const integration = await getProjectIntegrationById({
      v0ProjectId: projectId,
      integrationId: payload.id,
    })
    if (!integration) {
      return NextResponse.json(
        { error: 'Marketplace integration not found.' },
        { status: 404 },
      )
    }

    const connected = payload.action === 'connect'
    const nextStatus = connected ? 'connected' : 'disconnected'
    if (integration.status === nextStatus) {
      return NextResponse.json({
        id: integration.id,
        status: integration.status,
      })
    }

    await verifyVercelProjectAccess(integration.vercel_project_id)
    await setMarketplaceResourceConnection({
      projectId: integration.vercel_project_id,
      resourceName: integration.resource_name,
      connected,
    })
    try {
      await updateProjectIntegrationStatus({
        v0ProjectId: projectId,
        integrationId: integration.id,
        status: nextStatus,
      })
    } catch (error) {
      console.error('Failed to save Marketplace connection status:', {
        integrationId: integration.id,
        error,
      })
      let restored = false
      try {
        await setMarketplaceResourceConnection({
          projectId: integration.vercel_project_id,
          resourceName: integration.resource_name,
          connected: integration.status === 'connected',
        })
        restored = true
      } catch (restoreError) {
        console.error('Failed to restore Marketplace connection status:', {
          integrationId: integration.id,
          restoreError,
        })
      }
      throw new VercelPlatformError(
        restored
          ? 'Vercel changed the connection, but Masidy could not save it. The previous connection was restored.'
          : 'Vercel changed the connection, but Masidy could not save or restore it. Refresh and contact support.',
        500,
      )
    }

    return NextResponse.json({
      id: integration.id,
      status: nextStatus,
    })
  } catch (error) {
    return getErrorResponse(error, 'Could not update the Marketplace connection.')
  }
}
