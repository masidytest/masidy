interface ChatBuildDetails {
  id: string
  demo?: string
  latestVersion?: {
    id: string
    status: 'pending' | 'completed' | 'failed'
    createdAt: string
    updatedAt?: string
    demoUrl?: string
    files?: Array<{ name: string; content: string }>
  }
}

const BUILD_POLL_INTERVAL_MS = 2000
const BUILD_TIMEOUT_MS = 10 * 60 * 1000

export async function waitForChatBuild(
  chatId: string,
  startedAt: number,
  previousVersionId?: string,
  previousVersionUpdatedAt?: string,
  signal?: AbortSignal,
): Promise<ChatBuildDetails> {
  const deadline = Date.now() + BUILD_TIMEOUT_MS

  while (Date.now() < deadline) {
    if (signal?.aborted) {
      throw signal.reason ?? new DOMException('Build wait stopped.', 'AbortError')
    }

    const response = await fetch(
      `/api/chats/${encodeURIComponent(chatId)}`,
      { cache: 'no-store', signal },
    )
    if (!response.ok) {
      const errorData = (await response.json().catch(() => null)) as
        | { error?: string; details?: string }
        | null
      const message =
        [errorData?.error, errorData?.details].filter(Boolean).join(': ') ||
        'Could not check the project build status.'
      throw new Error(message)
    }

    const chat = (await response.json()) as ChatBuildDetails
    const version = chat.latestVersion
    if (!version) {
      await waitForNextPoll(signal)
      continue
    }

    const versionUpdatedAt = Date.parse(version.updatedAt || version.createdAt)
    const previousUpdatedAt = previousVersionUpdatedAt
      ? Date.parse(previousVersionUpdatedAt)
      : Number.NaN
    const isCurrentBuild = previousVersionId
      ? version.id !== previousVersionId ||
        (Number.isFinite(versionUpdatedAt) &&
          (Number.isFinite(previousUpdatedAt)
            ? versionUpdatedAt > previousUpdatedAt
            : versionUpdatedAt >= startedAt - 5000))
      : versionUpdatedAt >= startedAt - 5000

    if (isCurrentBuild && version.status === 'failed') {
      throw new Error('The project build failed. Review the chat and try again.')
    }
    if (isCurrentBuild && version.status === 'completed') {
      return chat
    }

    await waitForNextPoll(signal)
  }

  throw new Error(
    'The project is still building. Refresh this chat shortly to check for its preview.',
  )
}

function waitForNextPoll(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException('Build wait stopped.', 'AbortError'))
      return
    }

    const timeout = setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort)
      resolve()
    }, BUILD_POLL_INTERVAL_MS)
    const handleAbort = () => {
      clearTimeout(timeout)
      reject(signal?.reason ?? new DOMException('Build wait stopped.', 'AbortError'))
    }
    signal?.addEventListener('abort', handleAbort, { once: true })
  })
}
