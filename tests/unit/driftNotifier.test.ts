import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { notifyDriftDetected } from '../../src/egress/driftNotifier.js'
import { resolveEgressConfig, type EgressConfig } from '../../src/egress/config.js'
import type { DriftEventRecord } from '../../src/store/driftQueue.js'

const event = {
  id: 'evt-1',
  vendor: 'cvent',
  rawPayload: { a: 1 },
  validationErrors: { formErrors: [], fieldErrors: {} },
  capturedAt: '2026-01-01T00:00:00.000Z',
  status: 'pending',
  mapperKind: 'builtin',
  signature: 'abc123',
} as unknown as DriftEventRecord

function config(overrides: Partial<EgressConfig>): EgressConfig {
  return { ...resolveEgressConfig(), ...overrides }
}

describe('notifyDriftDetected', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('is a no-op when no drift webhook URL is configured', async () => {
    const result = await notifyDriftDetected(event, config({ driftWebhookUrl: undefined }))

    expect(result).toEqual({ notified: false, reason: 'disabled' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('POSTs the incident without auth headers when no secret is set', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 202 }))

    const result = await notifyDriftDetected(
      event,
      config({ driftWebhookUrl: 'https://hook.test/in', driftWebhookSecret: undefined }),
    )

    expect(result).toEqual({ notified: true, status: 202 })
    const [url, init] = vi.mocked(fetch).mock.calls[0]!
    expect(url).toBe('https://hook.test/in')
    const headers = (init as RequestInit).headers as Record<string, string>
    expect(headers.Authorization).toBeUndefined()
    expect(JSON.parse((init as RequestInit).body as string).signature).toBe('abc123')
  })

  it('signs the payload when a secret is set', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }))

    await notifyDriftDetected(
      event,
      config({ driftWebhookUrl: 'https://hook.test/in', driftWebhookSecret: 'sek' }),
    )

    const [, init] = vi.mocked(fetch).mock.calls[0]!
    const headers = (init as RequestInit).headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer sek')
    expect(headers['X-UniSchema-Signature']).toMatch(/^[0-9a-f]{64}$/)
  })

  it('throws when the webhook responds non-2xx', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('boom', { status: 500 }))

    await expect(
      notifyDriftDetected(event, config({ driftWebhookUrl: 'https://hook.test/in' })),
    ).rejects.toThrow(/Drift webhook returned 500/)
  })
})
