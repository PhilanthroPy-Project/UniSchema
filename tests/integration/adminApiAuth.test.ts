import { afterEach, describe, expect, it } from 'vitest'

import app from '../helpers/app.js'
import {
  isEgressPullAuthorized,
  resolveEgressPullAuth,
} from '../../src/utils/egressPullAuth.js'
import { resolveMappingSyncAuth } from '../../src/utils/mappingSyncAuth.js'

async function readJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>
}

describe('resolveMappingSyncAuth', () => {
  const originalToken = process.env.MAPPING_SYNC_TOKEN
  const originalRequired = process.env.MAPPING_SYNC_REQUIRED
  const originalNodeEnv = process.env.NODE_ENV

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.MAPPING_SYNC_TOKEN
    } else {
      process.env.MAPPING_SYNC_TOKEN = originalToken
    }

    if (originalRequired === undefined) {
      delete process.env.MAPPING_SYNC_REQUIRED
    } else {
      process.env.MAPPING_SYNC_REQUIRED = originalRequired
    }

    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV
    } else {
      process.env.NODE_ENV = originalNodeEnv
    }
  })

  it('requires a token in production when MAPPING_SYNC_TOKEN is unset', () => {
    delete process.env.MAPPING_SYNC_TOKEN
    process.env.NODE_ENV = 'production'

    expect(resolveMappingSyncAuth()).toEqual({ action: 'misconfigured' })
  })
})

describe('resolveEgressPullAuth', () => {
  const originalToken = process.env.EGRESS_PULL_TOKEN
  const originalRequired = process.env.EGRESS_PULL_REQUIRED
  const originalNodeEnv = process.env.NODE_ENV

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.EGRESS_PULL_TOKEN
    } else {
      process.env.EGRESS_PULL_TOKEN = originalToken
    }

    if (originalRequired === undefined) {
      delete process.env.EGRESS_PULL_REQUIRED
    } else {
      process.env.EGRESS_PULL_REQUIRED = originalRequired
    }

    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV
    } else {
      process.env.NODE_ENV = originalNodeEnv
    }
  })

  it('requires a token in production when EGRESS_PULL_TOKEN is unset', () => {
    delete process.env.EGRESS_PULL_TOKEN
    process.env.NODE_ENV = 'production'

    expect(resolveEgressPullAuth()).toEqual({ action: 'misconfigured' })
  })

  it('rejects Bearer tokens with the wrong length before timing-safe comparison', () => {
    process.env.EGRESS_PULL_TOKEN = 'correct-token'

    const makeContext = (authorization?: string) =>
      ({
        req: {
          header: (name: string) => (name === 'Authorization' ? authorization : undefined),
        },
      }) as never

    expect(isEgressPullAuthorized(makeContext('Bearer x'))).toBe(false)
    expect(isEgressPullAuthorized(makeContext('Bearer wrong-token-value'))).toBe(false)
  })
})

describe('production admin API guards', () => {
  const originalMappingToken = process.env.MAPPING_SYNC_TOKEN
  const originalEgressToken = process.env.EGRESS_PULL_TOKEN
  const originalNodeEnv = process.env.NODE_ENV

  afterEach(() => {
    if (originalMappingToken === undefined) {
      delete process.env.MAPPING_SYNC_TOKEN
    } else {
      process.env.MAPPING_SYNC_TOKEN = originalMappingToken
    }

    if (originalEgressToken === undefined) {
      delete process.env.EGRESS_PULL_TOKEN
    } else {
      process.env.EGRESS_PULL_TOKEN = originalEgressToken
    }

    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV
    } else {
      process.env.NODE_ENV = originalNodeEnv
    }
  })

  it('returns 500 on mapping sync when production token is missing', async () => {
    delete process.env.MAPPING_SYNC_TOKEN
    process.env.NODE_ENV = 'production'

    const response = await app.request('/mappings/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vendor: 'GiveCampus',
        exportedAt: '2026-06-20T12:00:00.000Z',
        mappings: [{ source: 'donor_email', target: 'constituentEmail' }],
        metadataMappings: [],
      }),
    })
    const body = await readJson<{ success: boolean; message: string }>(response)

    expect(response.status).toBe(500)
    expect(body.message).toBe('Mapping sync token not configured')
  })

  it('returns 500 on egress pull endpoints when production token is missing', async () => {
    delete process.env.EGRESS_PULL_TOKEN
    process.env.NODE_ENV = 'production'

    const listResponse = await app.request('/egress/events')
    const listBody = await readJson<{ success: boolean; message: string }>(listResponse)

    expect(listResponse.status).toBe(500)
    expect(listBody.message).toBe('Egress pull token not configured')

    const ackResponse = await app.request('/egress/ack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: ['550e8400-e29b-41d4-a716-446655440000'] }),
    })
    const ackBody = await readJson<{ success: boolean; message: string }>(ackResponse)

    expect(ackResponse.status).toBe(500)
    expect(ackBody.message).toBe('Egress pull token not configured')
  })

  it('returns 500 on ingestion polling when production mapping token is missing', async () => {
    delete process.env.MAPPING_SYNC_TOKEN
    process.env.NODE_ENV = 'production'

    const response = await app.request('/webhooks/ingestions/test-id')
    const body = await readJson<{ success: boolean; message: string }>(response)

    expect(response.status).toBe(500)
    expect(body.message).toBe('Mapping sync token not configured')
  })

  it('returns 500 on mapping GET when production mapping token is missing', async () => {
    delete process.env.MAPPING_SYNC_TOKEN
    process.env.NODE_ENV = 'production'

    const response = await app.request('/mappings/givecampus')
    const body = await readJson<{ success: boolean; message: string }>(response)

    expect(response.status).toBe(500)
    expect(body.message).toBe('Mapping sync token not configured')
  })

  it('returns 500 on drift list when production drift token is missing', async () => {
    delete process.env.DRIFT_AGENT_TOKEN
    process.env.NODE_ENV = 'production'

    const response = await app.request('/drift/events')
    const body = await readJson<{ success: boolean; message: string }>(response)

    expect(response.status).toBe(500)
    expect(body.message).toBe('Drift agent token not configured')
  })

  it('accepts egress pull requests with a valid Bearer token', async () => {
    const pullToken = 'egress-pull-test-token'
    process.env.EGRESS_PULL_TOKEN = pullToken

    const response = await app.request('/egress/events?limit=1', {
      headers: {
        Authorization: ['Bearer', pullToken].join(' '),
      },
    })
    const body = await readJson<{ success: boolean }>(response)

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
  })

  it('returns 401 on mapping GET when token is configured but Authorization is missing', async () => {
    process.env.MAPPING_SYNC_TOKEN = 'mapping-sync-test-token'

    const response = await app.request('/mappings/givecampus')
    const body = await readJson<{ success: boolean; message: string }>(response)

    expect(response.status).toBe(401)
    expect(body.message).toBe('Unauthorized')
  })

  it('returns 401 on ingestion GET when token is configured but Authorization is missing', async () => {
    process.env.MAPPING_SYNC_TOKEN = 'mapping-sync-test-token'

    const response = await app.request('/webhooks/ingestions/test-id')
    const body = await readJson<{ success: boolean; message: string }>(response)

    expect(response.status).toBe(401)
    expect(body.message).toBe('Unauthorized')
  })
})
