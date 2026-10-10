import assert from 'node:assert/strict'
import test from 'node:test'
import { waitForChatBuild } from './wait-for-chat-build'

test('recognizes a completed build when v0 updates the existing version', async () => {
  const originalFetch = globalThis.fetch
  const startedAt = Date.now()
  const previousUpdatedAt = new Date(startedAt - 1000).toISOString()
  const updatedAt = new Date(startedAt + 1000).toISOString()

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        id: 'chat-1',
        latestVersion: {
          id: 'version-1',
          status: 'completed',
          createdAt: previousUpdatedAt,
          updatedAt,
          demoUrl: 'https://preview.example',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )

  try {
    const chat = await waitForChatBuild(
      'chat-1',
      startedAt,
      'version-1',
      previousUpdatedAt,
    )

    assert.equal(chat.latestVersion?.status, 'completed')
    assert.equal(chat.latestVersion?.demoUrl, 'https://preview.example')
  } finally {
    globalThis.fetch = originalFetch
  }
})
