import type { RateLimitConfig } from '../middleware/webhookGuard.js'

type RateLimitBucket = {
  count: number
  windowStartMs: number
}

const inMemoryBuckets = new Map<string, RateLimitBucket>()

type RedisLike = {
  incr: (key: string) => Promise<number>
  pExpire: (key: string, ms: number) => Promise<boolean>
  connect: () => Promise<void>
  on: (event: string, listener: () => void) => void
}

let redisClient: RedisLike | null = null
let redisInitAttempted = false

async function getRedisClient(): Promise<RedisLike | null> {
  const redisUrl = process.env.REDIS_URL?.trim()

  if (!redisUrl) {
    return null
  }

  if (redisInitAttempted) {
    return redisClient
  }

  redisInitAttempted = true

  try {
    const { createClient } = await import('redis')
    const client = createClient({ url: redisUrl }) as unknown as RedisLike
    client.on('error', () => {
      // Fall back to in-memory on Redis errors
    })
    await client.connect()
    redisClient = client
    return client
  } catch {
    redisClient = null
    return null
  }
}

function checkInMemoryRateLimit(
  clientKey: string,
  config: RateLimitConfig,
  now: number,
): boolean {
  const bucket = inMemoryBuckets.get(clientKey)

  if (!bucket || now - bucket.windowStartMs >= config.windowMs) {
    inMemoryBuckets.set(clientKey, { count: 1, windowStartMs: now })
    return true
  }

  if (bucket.count >= config.maxRequests) {
    return false
  }

  bucket.count += 1
  return true
}

/**
 * Fixed-window rate limiter keyed by client IP.
 * Uses Redis when REDIS_URL is set; otherwise in-memory (single instance).
 */
export async function checkRateLimitDistributed(
  clientKey: string,
  config: RateLimitConfig,
  now = Date.now(),
): Promise<boolean> {
  const redis = await getRedisClient()

  if (!redis) {
    return checkInMemoryRateLimit(clientKey, config, now)
  }

  const windowId = Math.floor(now / config.windowMs)
  const redisKey = `unischema:ratelimit:${clientKey}:${windowId}`

  try {
    const count = await redis.incr(redisKey)

    if (count === 1) {
      await redis.pExpire(redisKey, config.windowMs)
    }

    return count <= config.maxRequests
  } catch {
    return checkInMemoryRateLimit(clientKey, config, now)
  }
}

/** Test-only helper — clears in-memory rate limit counters between cases. */
export function resetRateLimitStoreForTests(): void {
  inMemoryBuckets.clear()
}
