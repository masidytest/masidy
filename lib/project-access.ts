import 'server-only'

import { getChatIdsByUserId, getProjectIdsByUserId } from '@/lib/db/queries'
import { v0 } from '@/lib/v0-key-pool'

export async function getAccessibleProjectIds(userId: string) {
  const [ownedProjectIds, ownedChatIds] = await Promise.all([
    getProjectIdsByUserId({ userId }),
    getChatIdsByUserId({ userId }),
  ])
  const accessibleProjectIds = new Set(ownedProjectIds)

  if (ownedChatIds.length === 0) return accessibleProjectIds

  const chats = await v0.chats.find()
  for (const chat of chats.data) {
    if (ownedChatIds.includes(chat.id) && chat.projectId) {
      accessibleProjectIds.add(chat.projectId)
    }
  }

  return accessibleProjectIds
}
