import type { Context, Next } from 'hono'

export type RateLimitConfig = {
  maxRequests: number
  windowMs: number
}

type RateLimitBucket = {
  count: number
  windowStartMs: number
}

const rateLimitBuckets = new Map<string, RateLimitBucket>()

const DEFAULT_RATE_LIMIT_MAX = 120
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000

export function resolveRateLimitConfig(): RateLimitConfig {
  const maxRequests = Number.parseInt(process.env.WEBHOOK_RATE_LIMIT_MAX ?? '', 10)
  const windowMs = Number.parseInt(process.env.WEBHOOK_RATE_LIMIT_WINDOW_MS ?? '', 10)

  return {
    maxRequests:
      Number.isFinite(maxRequests) && maxRequests > 0
        ? maxRequests
        : DEFAULT_RATE_LIMIT_MAX,
    windowMs:
      Number.isFinite(windowMs) && windowMs > 0 ? windowMs : DEFAULT_RATE_LIMIT_WINDOW_MS,
  }
}

export function parseIpAllowlist(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return []
  }

  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function isClientIpAllowed(clientIp: string, allowlist: string[]): boolean {
  if (allowlist.length === 0) {
    return true
  }

  const normalizedClientIp = normalizeIp(clientIp)

  return allowlist.some((entry) => {
    if (entry.includes('/')) {
      return ipMatchesCidr(normalizedClientIp, entry)
    }

    return normalizeIp(entry) === normalizedClientIp
  })
}

export function resolveClientIp(c: Context): string {
  const trustProxy = process.env.TRUST_PROXY === 'true'

  if (trustProxy) {
    const forwarded = c.req.header('x-forwarded-for')

    if (forwarded) {
      const firstHop = forwarded.split(',')[0]?.trim()
      if (firstHop) {
        return firstHop
      }
    }
  }

  return c.req.header('x-real-ip')?.trim() ?? 'unknown'
}

/**
 * Fixed-window rate limiter keyed by client IP.
 * Returns true when the request is within the configured limit.
 */
export function checkRateLimit(
  clientKey: string,
  config: RateLimitConfig,
  now = Date.now(),
): boolean {
  const bucket = rateLimitBuckets.get(clientKey)

  if (!bucket || now - bucket.windowStartMs >= config.windowMs) {
    rateLimitBuckets.set(clientKey, { count: 1, windowStartMs: now })
    return true
  }

  if (bucket.count >= config.maxRequests) {
    return false
  }

  bucket.count += 1
  return true
}

export function createWebhookGuardMiddleware() {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const clientIp = resolveClientIp(c)
    const allowlist = parseIpAllowlist(process.env.WEBHOOK_IP_ALLOWLIST)

    if (!isClientIpAllowed(clientIp, allowlist)) {
      return c.json({ success: false, message: 'Forbidden' }, 403)
    }

    const rateLimitConfig = resolveRateLimitConfig()

    if (!checkRateLimit(clientIp, rateLimitConfig)) {
      return c.json({ success: false, message: 'Too many requests' }, 429)
    }

    await next()
  }
}

function normalizeIp(ip: string): string {
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip
}

function ipMatchesCidr(ip: string, cidr: string): boolean {
  const [network, prefixLengthRaw] = cidr.split('/')
  const prefixLength = Number.parseInt(prefixLengthRaw ?? '', 10)

  if (!network || !Number.isFinite(prefixLength) || prefixLength < 0 || prefixLength > 32) {
    return false
  }

  const ipValue = ipv4ToInt(normalizeIp(ip))
  const networkValue = ipv4ToInt(normalizeIp(network))

  if (ipValue === null || networkValue === null) {
    return false
  }

  const mask = prefixLength === 0 ? 0 : (~0 << (32 - prefixLength)) >>> 0

  return (ipValue & mask) === (networkValue & mask)
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.')

  if (parts.length !== 4) {
    return null
  }

  let value = 0

  for (const part of parts) {
    const octet = Number.parseInt(part, 10)

    if (!Number.isFinite(octet) || octet < 0 || octet > 255) {
      return null
    }

    value = (value << 8) + octet
  }

  return value >>> 0
}

/** Test-only helper — clears in-memory rate limit counters between cases. */
export function resetWebhookGuardForTests(): void {
  rateLimitBuckets.clear()
}
