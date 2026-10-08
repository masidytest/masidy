import { NextRequest, NextResponse } from 'next/server'
import { v0 } from '@/lib/v0-key-pool'

export async function POST(request: NextRequest) {
  try {
    const { chatId } = await request.json()

    if (!chatId) {
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 },
      )
    }

    // Delete the chat using v0 SDK
    const result = await v0.chats.delete({
      chatId,
    })

    console.log('Chat deleted successfully:', chatId)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error deleting chat:', error)
    return NextResponse.json(
      { error: 'Failed to delete chat' },
      { status: 500 },
    )
  }
}
