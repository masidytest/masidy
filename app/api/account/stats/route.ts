import 'server-only'

import { NextResponse } from 'next/server'
import { auth } from '@/app/(auth)/auth'
import db from '@/lib/db/connection'
import { users, chat_ownerships } from '@/lib/db/schema'
import { eq, count } from 'drizzle-orm'
import { getChatCountByUserId } from '@/lib/db/queries'

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Today's count (last 24 hours)
    const todayCount = await getChatCountByUserId({
      userId: session.user.id,
      differenceInHours: 24,
    })

    // Total count — all chat_ownerships for this user
    const [totalResult] = await db
      .select({ count: count(chat_ownerships.id) })
      .from(chat_ownerships)
      .where(eq(chat_ownerships.user_id, session.user.id))

    const totalCount = totalResult?.count ?? 0

    // User created_at
    const [userRow] = await db
      .select({ created_at: users.created_at })
      .from(users)
      .where(eq(users.id, session.user.id))

    return NextResponse.json({
      todayCount,
      totalCount,
      userType: session.user.type,
      createdAt: userRow?.created_at ?? null,
    })
  } catch (error) {
    console.error('Failed to fetch account stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch account stats' },
      { status: 500 },
    )
  }
}
