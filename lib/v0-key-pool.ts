import { createClient } from 'v0-sdk'

type V0Client = ReturnType<typeof createClient>

interface PoolOptions {
  baseUrl?: string
  maxInflightPerKey?: number
  maxWaitMs?: number
}

interface KeyState {
  id: string
  key: string
  client: V0Client
  weight: number
  inflight: number
  used: number
  cooldownUntil: number
  disabled: boolean
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000

  const date = Date.parse(value)
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now())
}

function getApiErrorDetails(
  error: unknown,
): { status: number; retryAfter: string | null } | null {
  if (!(error instanceof Error)) return null

  const statusFromMessage = error.message.match(/^HTTP (\d{3}):/)
  const status =
    'status' in error && typeof error.status === 'number'
      ? error.status
      : statusFromMessage
        ? Number(statusFromMessage[1])
        : undefined

  if (status === undefined) return null

  return {
    status,
    retryAfter:
      'retryAfter' in error && typeof error.retryAfter === 'string'
        ? error.retryAfter
        : null,
  }
}

export class V0KeyPool {
  private readonly keys: KeyState[] = []
  private readonly rawKeys: string[]
  private readonly baseUrl?: string
  private readonly maxInflightPerKey: number
  private readonly maxWaitMs: number
  private cursor = 0

  constructor(rawKeys: string[], options: PoolOptions = {}) {
    this.rawKeys = rawKeys
    this.baseUrl = options.baseUrl || process.env.V0_API_URL
    this.maxInflightPerKey = options.maxInflightPerKey ?? 4
    this.maxWaitMs = options.maxWaitMs ?? 10_000
  }

  private ensureKeys() {
    if (this.keys.length > 0) return

    const entries = this.rawKeys
      .map((entry) => {
        const match = entry.trim().match(/^(.+?)(?:\*(\d+))?$/)
        if (!match) return null
        return { key: match[1].trim(), weight: Number(match[2]) || 1 }
      })
      .filter(
        (entry): entry is { key: string; weight: number } =>
          !!entry?.key &&
          Number.isSafeInteger(entry.weight) &&
          entry.weight > 0,
      )

    const uniqueKeys = new Map<string, number>()
    for (const entry of entries) {
      uniqueKeys.set(entry.key, (uniqueKeys.get(entry.key) || 0) + entry.weight)
    }
    if (uniqueKeys.size === 0) {
      throw new Error('V0KeyPool: set V0_API_KEYS, V0_API_KEY0, or V0_API_KEY')
    }

    this.keys.push(
      ...Array.from(uniqueKeys, ([key, weight]) => ({
        id: `…${key.slice(-4)}`,
        key,
        client: createClient({
          apiKey: key,
          ...(this.baseUrl ? { baseUrl: this.baseUrl } : {}),
        }),
        weight,
        inflight: 0,
        used: 0,
        cooldownUntil: 0,
        disabled: false,
      })),
    )
  }

  stats() {
    this.ensureKeys()
    const now = Date.now()
    return this.keys.map(({ client: _client, key: _key, ...state }) => ({
      ...state,
      cooldownMs: Math.max(0, state.cooldownUntil - now),
    }))
  }

  private pick(excluded: Set<KeyState>): KeyState | null {
    const ready = this.keys.filter(
      (key) =>
        !key.disabled &&
        !excluded.has(key) &&
        key.cooldownUntil <= Date.now() &&
        key.inflight < this.maxInflightPerKey,
    )
    if (ready.length === 0) return null

    let best: KeyState | null = null
    let bestScore = Infinity
    for (let offset = 0; offset < this.keys.length; offset++) {
      const key = this.keys[(this.cursor + offset) % this.keys.length]
      if (!ready.includes(key)) continue
      const score = key.inflight / key.weight
      if (score < bestScore) {
        best = key
        bestScore = score
      }
    }
    this.cursor = (this.cursor + 1) % this.keys.length
    return best
  }

  private async acquire(excluded: Set<KeyState>): Promise<KeyState | null> {
    const deadline = Date.now() + this.maxWaitMs
    while (Date.now() < deadline) {
      const key = this.pick(excluded)
      if (key) return key

      const candidates = this.keys.filter(
        (candidate) => !candidate.disabled && !excluded.has(candidate),
      )
      if (candidates.length === 0) return null

      const now = Date.now()
      const cooldowns = candidates
        .map((candidate) => candidate.cooldownUntil - now)
        .filter((remaining) => remaining > 0)
      const waitMs =
        cooldowns.length > 0
          ? Math.min(...cooldowns)
          : Math.min(50, deadline - now)
      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(1, Math.min(waitMs, deadline - now))),
      )
    }
    throw new Error('V0KeyPool: timed out waiting for an available key')
  }

  private async call(path: PropertyKey[], args: unknown[]): Promise<unknown> {
    this.ensureKeys()
    const tried = new Set<KeyState>()
    let lastRateLimitError: Error | undefined

    while (tried.size < this.keys.length) {
      const key = await this.acquire(tried)
      if (!key) break
      key.inflight++
      key.used++
      let released = false
      const release = () => {
        if (released) return
        released = true
        key.inflight--
      }

      try {
        let owner: unknown = key.client
        for (const part of path.slice(0, -1)) {
          owner = Reflect.get(owner as object, part)
        }
        const method = Reflect.get(owner as object, path[path.length - 1])
        const result = await Reflect.apply(method, owner, args)
        if (result instanceof ReadableStream) {
          return this.trackStream(result, release)
        }
        release()
        return result
      } catch (error) {
        release()
        const apiError = getApiErrorDetails(error)
        if (apiError && (apiError.status === 401 || apiError.status === 403)) {
          key.disabled = true
          tried.add(key)
          continue
        }
        if (apiError?.status === 429) {
          key.cooldownUntil =
            Date.now() + (parseRetryAfter(apiError.retryAfter) ?? 2_000)
          lastRateLimitError =
            error instanceof Error ? error : new Error(String(error))
          tried.add(key)
          continue
        }
        throw error
      }
    }

    if (lastRateLimitError) throw lastRateLimitError
    if (this.keys.every((key) => key.disabled)) {
      throw new Error('V0KeyPool: all configured API keys were rejected')
    }
    throw new Error('V0KeyPool: no eligible API key is currently available')
  }

  private trackStream(
    stream: ReadableStream<Uint8Array>,
    release: () => void,
  ): ReadableStream<Uint8Array> {
    const reader = stream.getReader()
    return new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const { done, value } = await reader.read()
          if (done) {
            release()
            controller.close()
          } else {
            controller.enqueue(value)
          }
        } catch (error) {
          release()
          controller.error(error)
        }
      },
      async cancel(reason) {
        release()
        await reader.cancel(reason)
      },
    })
  }

  client(): V0Client & { stats: () => ReturnType<V0KeyPool['stats']> } {
    const target = createClient({
      ...(this.baseUrl ? { baseUrl: this.baseUrl } : {}),
    })
    const pool = this
    const proxy = new Proxy(target, {
      get(client, property, receiver) {
        if (property === 'stats') return () => pool.stats()
        const value = Reflect.get(client, property, receiver)
        const path = [property]
        if (typeof value === 'function') {
          return (...args: unknown[]) => pool.call(path, args)
        }
        if (value && typeof value === 'object') {
          return pool.nestedProxy(value, path)
        }
        return value
      },
    })
    return proxy as V0Client & { stats: () => ReturnType<V0KeyPool['stats']> }
  }

  private nestedProxy<T extends object>(target: T, path: PropertyKey[]): T {
    const pool = this
    return new Proxy(target, {
      get(object, property, receiver) {
        const value = Reflect.get(object, property, receiver)
        const nextPath = [...path, property]
        if (typeof value === 'function') {
          return (...args: unknown[]) => pool.call(nextPath, args)
        }
        if (value && typeof value === 'object') {
          return pool.nestedProxy(value, nextPath)
        }
        return value
      },
    })
  }
}

const configuredKeys =
  process.env.V0_API_KEYS ||
  [process.env.V0_API_KEY0, process.env.V0_API_KEY1, process.env.V0_API_KEY]
    .filter((key): key is string => !!key?.trim())
    .join(',')

export const keyPool = new V0KeyPool(configuredKeys.split(',').filter(Boolean))
export const v0 = keyPool.client()
