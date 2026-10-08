import 'server-only'

import { NextResponse } from 'next/server'
import { auth } from '@/app/(auth)/auth'
import db from '@/lib/db/connection'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function DELETE() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Delete user — cascades to chat_ownerships via FK
    await db.delete(users).where(eq(users.id, session.user.id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete account:', error)
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 },
    )
  }
}
