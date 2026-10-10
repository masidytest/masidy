import 'server-only'

import { and, count, desc, eq, gte } from 'drizzle-orm'

import {
  users,
  chat_ownerships,
  project_ownerships,
  project_integrations,
  anonymous_chat_logs,
  type User,
  type ChatOwnership,
  type ProjectOwnership,
  type ProjectIntegration,
  type AnonymousChatLog,
} from './schema'
import { generateUUID } from '../utils'
import { generateHashedPassword } from './utils'
import db from './connection'

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(users).where(eq(users.email, email))
  } catch (error) {
    console.error('Failed to get user from database')
    throw error
  }
}

export async function createUser(
  email: string,
  password: string,
): Promise<User[]> {
  try {
    const hashedPassword = generateHashedPassword(password)
    return await db
      .insert(users)
      .values({
        id: generateUUID(),
        email,
        password: hashedPassword,
      })
      .returning()
  } catch (error) {
    console.error('Failed to create user in database')
    throw error
  }
}

export async function createGuestUser(): Promise<User[]> {
  try {
    const guestId = generateUUID()
    const guestEmail = `guest-${guestId}@example.com`

    return await db
      .insert(users)
      .values({
        id: generateUUID(),
        email: guestEmail,
        password: null,
      })
      .returning()
  } catch (error) {
    console.error('Failed to create guest user in database')
    throw error
  }
}

// Chat ownership functions
export async function createChatOwnership({
  v0ChatId,
  userId,
}: {
  v0ChatId: string
  userId: string
}) {
  try {
    return await db
      .insert(chat_ownerships)
      .values({
        id: generateUUID(),
        v0_chat_id: v0ChatId,
        user_id: userId,
      })
      .onConflictDoNothing({ target: chat_ownerships.v0_chat_id })
  } catch (error) {
    console.error('Failed to create chat ownership in database')
    throw error
  }
}

export async function getChatOwnership({ v0ChatId }: { v0ChatId: string }) {
  try {
    const [ownership] = await db
      .select()
      .from(chat_ownerships)
      .where(eq(chat_ownerships.v0_chat_id, v0ChatId))
    return ownership
  } catch (error) {
    console.error('Failed to get chat ownership from database')
    throw error
  }
}

export async function getChatIdsByUserId({
  userId,
}: {
  userId: string
}): Promise<string[]> {
  try {
    const ownerships = await db
      .select({ v0ChatId: chat_ownerships.v0_chat_id })
      .from(chat_ownerships)
      .where(eq(chat_ownerships.user_id, userId))
      .orderBy(desc(chat_ownerships.created_at))

    return ownerships.map((o: { v0ChatId: string }) => o.v0ChatId)
  } catch (error) {
    console.error('Failed to get chat IDs by user from database')
    throw error
  }
}

export async function deleteChatOwnership({ v0ChatId }: { v0ChatId: string }) {
  try {
    return await db
      .delete(chat_ownerships)
      .where(eq(chat_ownerships.v0_chat_id, v0ChatId))
  } catch (error) {
    console.error('Failed to delete chat ownership from database')
    throw error
  }
}

export async function createProjectOwnership({
  v0ProjectId,
  userId,
}: {
  v0ProjectId: string
  userId: string
}): Promise<ProjectOwnership[]> {
  try {
    return await db
      .insert(project_ownerships)
      .values({
        id: generateUUID(),
        v0_project_id: v0ProjectId,
        user_id: userId,
      })
      .onConflictDoNothing({ target: project_ownerships.v0_project_id })
      .returning()
  } catch (error) {
    console.error('Failed to create project ownership in database')
    throw error
  }
}

export async function getProjectOwnership({
  v0ProjectId,
}: {
  v0ProjectId: string
}): Promise<ProjectOwnership | undefined> {
  try {
    const [ownership] = await db
      .select()
      .from(project_ownerships)
      .where(eq(project_ownerships.v0_project_id, v0ProjectId))
    return ownership
  } catch (error) {
    console.error('Failed to get project ownership from database')
    throw error
  }
}

export async function getProjectIdsByUserId({
  userId,
}: {
  userId: string
}): Promise<string[]> {
  try {
    const ownerships = await db
      .select({ v0ProjectId: project_ownerships.v0_project_id })
      .from(project_ownerships)
      .where(eq(project_ownerships.user_id, userId))
      .orderBy(desc(project_ownerships.created_at))
    return ownerships.map((ownership) => ownership.v0ProjectId)
  } catch (error) {
    console.error('Failed to get project IDs by user from database')
    throw error
  }
}

export async function deleteProjectOwnership({
  v0ProjectId,
}: {
  v0ProjectId: string
}) {
  try {
    return await db
      .delete(project_ownerships)
      .where(eq(project_ownerships.v0_project_id, v0ProjectId))
  } catch (error) {
    console.error('Failed to delete project ownership from database')
    throw error
  }
}

export async function getProjectIntegrations({
  v0ProjectId,
}: {
  v0ProjectId: string
}): Promise<ProjectIntegration[]> {
  try {
    return await db
      .select()
      .from(project_integrations)
      .where(eq(project_integrations.v0_project_id, v0ProjectId))
      .orderBy(desc(project_integrations.created_at))
  } catch (error) {
    console.error('Failed to get project integrations')
    throw error
  }
}

export async function createProjectIntegration({
  v0ProjectId,
  vercelProjectId,
  provider,
  installationId,
  integrationId,
  productId,
  productSlug,
  productName,
  resourceName,
  userId,
}: {
  v0ProjectId: string
  vercelProjectId: string
  provider: string
  installationId: string
  integrationId: string
  productId: string
  productSlug: string
  productName: string
  resourceName: string
  userId: string
}): Promise<ProjectIntegration[]> {
  try {
    return await db
      .insert(project_integrations)
      .values({
        id: generateUUID(),
        v0_project_id: v0ProjectId,
        vercel_project_id: vercelProjectId,
        provider,
        installation_id: installationId,
        integration_id: integrationId,
        product_id: productId,
        product_slug: productSlug,
        product_name: productName,
        resource_name: resourceName,
        status: 'connected',
        connected_by_user_id: userId,
      })
      .returning()
  } catch (error) {
    console.error('Failed to save project integration')
    throw error
  }
}

export async function getProjectIntegrationById({
  v0ProjectId,
  integrationId,
}: {
  v0ProjectId: string
  integrationId: string
}): Promise<ProjectIntegration | undefined> {
  try {
    const [integration] = await db
      .select()
      .from(project_integrations)
      .where(
        and(
          eq(project_integrations.v0_project_id, v0ProjectId),
          eq(project_integrations.id, integrationId),
        ),
      )
    return integration
  } catch (error) {
    console.error('Failed to get project integration by ID')
    throw error
  }
}

export async function updateProjectIntegrationStatus({
  v0ProjectId,
  integrationId,
  status,
}: {
  v0ProjectId: string
  integrationId: string
  status: 'connected' | 'disconnected'
}) {
  try {
    return await db
      .update(project_integrations)
      .set({ status })
      .where(
        and(
          eq(project_integrations.v0_project_id, v0ProjectId),
          eq(project_integrations.id, integrationId),
        ),
      )
  } catch (error) {
    console.error('Failed to update project integration status')
    throw error
  }
}

export async function deleteProjectIntegrations({
  v0ProjectId,
}: {
  v0ProjectId: string
}) {
  try {
    return await db
      .delete(project_integrations)
      .where(eq(project_integrations.v0_project_id, v0ProjectId))
  } catch (error) {
    console.error('Failed to delete project integrations')
    throw error
  }
}

// Rate limiting functions
export async function getChatCountByUserId({
  userId,
  differenceInHours,
}: {
  userId: string
  differenceInHours: number
}): Promise<number> {
  try {
    const hoursAgo = new Date(Date.now() - differenceInHours * 60 * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .slice(0, 19)

    const [stats] = await db
      .select({ count: count(chat_ownerships.id) })
      .from(chat_ownerships)
      .where(
        and(
          eq(chat_ownerships.user_id, userId),
          gte(chat_ownerships.created_at, hoursAgo),
        ),
      )

    return stats?.count || 0
  } catch (error) {
    console.error('Failed to get chat count by user from database')
    throw error
  }
}

export async function getChatCountByIP({
  ipAddress,
  differenceInHours,
}: {
  ipAddress: string
  differenceInHours: number
}): Promise<number> {
  try {
    const hoursAgo = new Date(Date.now() - differenceInHours * 60 * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .slice(0, 19)

    const [stats] = await db
      .select({ count: count(anonymous_chat_logs.id) })
      .from(anonymous_chat_logs)
      .where(
        and(
          eq(anonymous_chat_logs.ip_address, ipAddress),
          gte(anonymous_chat_logs.created_at, hoursAgo),
        ),
      )

    return stats?.count || 0
  } catch (error) {
    console.error('Failed to get chat count by IP from database')
    throw error
  }
}

export async function createAnonymousChatLog({
  ipAddress,
  v0ChatId,
}: {
  ipAddress: string
  v0ChatId: string
}) {
  try {
    return await db.insert(anonymous_chat_logs).values({
      id: generateUUID(),
      ip_address: ipAddress,
      v0_chat_id: v0ChatId,
    })
  } catch (error) {
    console.error('Failed to create anonymous chat log in database')
    throw error
  }
}
