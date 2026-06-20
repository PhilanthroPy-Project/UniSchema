import { afterEach, describe, expect, it } from 'vitest'

import {
  checkRateLimit,
  isClientIpAllowed,
  parseIpAllowlist,
  resetWebhookGuardForTests,
  resolveClientIp,
  resolveRateLimitConfig,
} from '../src/middleware/webhookGuard.js'
import { Hono } from 'hono'

describe('webhook guard helpers', () => {
  afterEach(() => {
    resetWebhookGuardForTests()
  })

  it('parses comma-separated IP allowlists', () => {
    expect(parseIpAllowlist('203.0.113.10, 198.51.100.0/24')).toEqual([
      '203.0.113.10',
      '198.51.100.0/24',
    ])
  })

  it('allows all clients when the allowlist is empty', () => {
    expect(isClientIpAllowed('203.0.113.10', [])).toBe(true)
  })

  it('matches exact IPs and CIDR ranges', () => {
    const allowlist = ['203.0.113.10', '198.51.100.0/24']

    expect(isClientIpAllowed('203.0.113.10', allowlist)).toBe(true)
    expect(isClientIpAllowed('198.51.100.42', allowlist)).toBe(true)
    expect(isClientIpAllowed('192.0.2.1', allowlist)).toBe(false)
  })

  it('enforces fixed-window rate limits per client key', () => {
    const config = { maxRequests: 2, windowMs: 60_000 }
    const clientKey = '203.0.113.10'

    expect(checkRateLimit(clientKey, config, 1_000)).toBe(true)
    expect(checkRateLimit(clientKey, config, 1_100)).toBe(true)
    expect(checkRateLimit(clientKey, config, 1_200)).toBe(false)
    expect(checkRateLimit(clientKey, config, 61_500)).toBe(true)
  })

  it('falls back to safe defaults for invalid env overrides', () => {
    const originalMax = process.env.WEBHOOK_RATE_LIMIT_MAX
    const originalWindow = process.env.WEBHOOK_RATE_LIMIT_WINDOW_MS

    process.env.WEBHOOK_RATE_LIMIT_MAX = 'not-a-number'
    process.env.WEBHOOK_RATE_LIMIT_WINDOW_MS = '0'

    expect(resolveRateLimitConfig()).toEqual({
      maxRequests: 120,
      windowMs: 60_000,
    })

    if (originalMax === undefined) {
      delete process.env.WEBHOOK_RATE_LIMIT_MAX
    } else {
      process.env.WEBHOOK_RATE_LIMIT_MAX = originalMax
    }

    if (originalWindow === undefined) {
      delete process.env.WEBHOOK_RATE_LIMIT_WINDOW_MS
    } else {
      process.env.WEBHOOK_RATE_LIMIT_WINDOW_MS = originalWindow
    }
  })

  it('uses X-Forwarded-For only when TRUST_PROXY is enabled', async () => {
    const originalTrustProxy = process.env.TRUST_PROXY
    const app = new Hono()

    app.get('/ip', (c) => c.json({ ip: resolveClientIp(c) }))

    process.env.TRUST_PROXY = 'true'
    const trusted = await app.request('/ip', {
      headers: { 'x-forwarded-for': '203.0.113.10, 10.0.0.1' },
    })
    expect((await trusted.json()) as { ip: string }).toEqual({ ip: '203.0.113.10' })

    delete process.env.TRUST_PROXY
    const untrusted = await app.request('/ip', {
      headers: { 'x-forwarded-for': '203.0.113.10' },
    })
    expect((await untrusted.json()) as { ip: string }).toEqual({ ip: 'unknown' })

    if (originalTrustProxy === undefined) {
      delete process.env.TRUST_PROXY
    } else {
      process.env.TRUST_PROXY = originalTrustProxy
    }
  })
})

describe('webhook guard middleware', () => {
  const originalAllowlist = process.env.WEBHOOK_IP_ALLOWLIST
  const originalMax = process.env.WEBHOOK_RATE_LIMIT_MAX
  const originalTrustProxy = process.env.TRUST_PROXY

  afterEach(() => {
    resetWebhookGuardForTests()

    if (originalAllowlist === undefined) {
      delete process.env.WEBHOOK_IP_ALLOWLIST
    } else {
      process.env.WEBHOOK_IP_ALLOWLIST = originalAllowlist
    }

    if (originalMax === undefined) {
      delete process.env.WEBHOOK_RATE_LIMIT_MAX
    } else {
      process.env.WEBHOOK_RATE_LIMIT_MAX = originalMax
    }

    if (originalTrustProxy === undefined) {
      delete process.env.TRUST_PROXY
    } else {
      process.env.TRUST_PROXY = originalTrustProxy
    }
  })

  it('ignores spoofed X-Forwarded-For when TRUST_PROXY is not enabled', async () => {
    process.env.WEBHOOK_IP_ALLOWLIST = '203.0.113.10'

    const { default: app } = await import('../src/index.js')
    const response = await app.request('/webhooks/givecampus', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '203.0.113.10',
      },
      body: JSON.stringify({
        id: 'gc-guard-spoof',
        donation_type: 'donation',
        value: 10,
        currency: 'USD',
        donor_email: 'guard@school.edu',
      }),
    })

    expect(response.status).toBe(403)
  })

  it('returns 403 for clients outside the configured IP allowlist', async () => {
    process.env.WEBHOOK_IP_ALLOWLIST = '203.0.113.10'
    process.env.TRUST_PROXY = 'true'

    const { default: app } = await import('../src/index.js')
    const response = await app.request('/webhooks/givecampus', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '192.0.2.99',
      },
      body: JSON.stringify({
        id: 'gc-guard-1',
        donation_type: 'donation',
        value: 10,
        currency: 'USD',
        donor_email: 'guard@school.edu',
      }),
    })
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body).toMatchObject({ success: false, message: 'Forbidden' })
  })

  it('returns 429 when the client exceeds the configured rate limit', async () => {
    process.env.WEBHOOK_RATE_LIMIT_MAX = '1'
    process.env.TRUST_PROXY = 'true'

    const { default: app } = await import('../src/index.js')
    const payload = {
      id: 'gc-guard-2',
      donation_type: 'donation',
      value: 10,
      currency: 'USD',
      donor_email: 'guard2@school.edu',
    }
    const headers = {
      'Content-Type': 'application/json',
      'x-forwarded-for': '203.0.113.55',
    }

    const first = await app.request('/webhooks/givecampus', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
    const second = await app.request('/webhooks/givecampus', {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...payload, id: 'gc-guard-3' }),
    })
    const body = await second.json()

    expect(first.status).toBe(202)
    expect(second.status).toBe(429)
    expect(body).toMatchObject({ success: false, message: 'Too many requests' })
  })
})
