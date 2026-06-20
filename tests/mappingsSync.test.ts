import { afterEach, describe, expect, it } from 'vitest'

import app from '../src/index.js'
import { getMapping } from '../src/store/mappingRegistry.js'

async function postJson(path: string, body: unknown) {
  return app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function readJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>
}

const validArtifact = {
  vendor: 'GiveCampus',
  exportedAt: '2026-06-20T12:00:00.000Z',
  mappings: [
    { source: 'donor_email', target: 'constituentEmail' },
    { source: 'value', target: 'amount' },
  ],
  metadataMappings: [{ source: 'donation_type', key: 'donationType' }],
}

describe('POST /mappings/sync', () => {
  const originalToken = process.env.MAPPING_SYNC_TOKEN

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.MAPPING_SYNC_TOKEN
    } else {
      process.env.MAPPING_SYNC_TOKEN = originalToken
    }
  })

  it('accepts a valid mapping artifact and stores it in the registry', async () => {
    const response = await postJson('/mappings/sync', validArtifact)
    const body = await readJson<{
      success: boolean
      vendor: string
      mappingCount: number
      syncedAt: string
    }>(response)

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.vendor).toBe('GiveCampus')
    expect(body.mappingCount).toBe(2)
    expect(body.syncedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)

    const stored = await getMapping('givecampus')
    expect(stored?.mappings).toEqual(validArtifact.mappings)
    expect(stored?.metadataMappings).toEqual(validArtifact.metadataMappings)
  })

  it('rejects mappings to non-mappable ConstituentEvent fields', async () => {
    const response = await postJson('/mappings/sync', {
      ...validArtifact,
      mappings: [{ source: 'id', target: 'eventId' }],
    })
    const body = await readJson<{ success: boolean; message: string }>(response)

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.message).toBe('Mapping artifact failed validation')
  })

  it('rejects duplicate target fields in a single artifact', async () => {
    const response = await postJson('/mappings/sync', {
      ...validArtifact,
      mappings: [
        { source: 'donor_email', target: 'constituentEmail' },
        { source: 'email_backup', target: 'constituentEmail' },
      ],
    })
    const body = await readJson<{ success: boolean; message: string }>(response)

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
  })

  it('rejects malformed JSON bodies', async () => {
    const response = await app.request('/mappings/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ not valid json',
    })
    const body = await readJson<{ success: boolean; message: string }>(response)

    expect(response.status).toBe(400)
    expect(body.message).toBe('Request body must be valid JSON')
  })

  it('returns 401 when MAPPING_SYNC_TOKEN is configured but Authorization is missing', async () => {
    process.env.MAPPING_SYNC_TOKEN = 'mapping-sync-test-token'

    const response = await postJson('/mappings/sync', validArtifact)
    const body = await readJson<{ success: boolean; message: string }>(response)

    expect(response.status).toBe(401)
    expect(body.message).toBe('Unauthorized')
  })

  it('returns 500 when mapping sync is required but the token is missing', async () => {
    delete process.env.MAPPING_SYNC_TOKEN
    process.env.MAPPING_SYNC_REQUIRED = 'true'

    const response = await postJson('/mappings/sync', validArtifact)
    const body = await readJson<{ success: boolean; message: string }>(response)

    expect(response.status).toBe(500)
    expect(body.message).toBe('Mapping sync token not configured')

    delete process.env.MAPPING_SYNC_REQUIRED
  })

  it('accepts sync requests with a valid Bearer token', async () => {
    const syncToken = 'mapping-sync-test-token'
    process.env.MAPPING_SYNC_TOKEN = syncToken

    const response = await app.request('/mappings/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: ['Bearer', syncToken].join(' '),
      },
      body: JSON.stringify(validArtifact),
    })
    const body = await readJson<{ success: boolean }>(response)

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
  })
})

describe('GET /mappings/:vendor', () => {
  it('returns a persisted mapping artifact for a known vendor', async () => {
    await postJson('/mappings/sync', validArtifact)

    const response = await app.request('/mappings/givecampus')
    const body = await readJson<{
      success: boolean
      mapping: { mappings: unknown[]; metadataMappings: unknown[] }
    }>(response)

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.mapping.mappings).toHaveLength(2)
    expect(body.mapping.metadataMappings).toHaveLength(1)
  })

  it('returns 404 when no mapping exists for the vendor', async () => {
    const response = await app.request('/mappings/unknown-vendor')
    const body = await readJson<{ success: boolean; message: string }>(response)

    expect(response.status).toBe(404)
    expect(body.success).toBe(false)
  })
})

describe('POST /egress/ack', () => {
  it('marks staged events as exported', async () => {
    process.env.EGRESS_TARGET = 'none'

    const webhookResponse = await postJson('/webhooks/givecampus', {
      id: 'gc-ack-1',
      donation_type: 'donation',
      value: 25,
      currency: 'USD',
      donor_email: 'ack@school.edu',
    })
    const webhookBody = await readJson<{ ingestionId: string }>(webhookResponse)
    const { waitForIngestion } = await import('./helpers/ingestion.js')
    await waitForIngestion(webhookBody.ingestionId)

    const listResponse = await app.request('/egress/events?limit=1')
    const listBody = await readJson<{ events: Array<{ id: string }> }>(listResponse)
    const eventId = listBody.events[0]?.id

    expect(eventId).toBeDefined()

    const ackResponse = await postJson('/egress/ack', { ids: [eventId] })
    const ackBody = await readJson<{ success: boolean; acknowledged: number }>(ackResponse)

    expect(ackResponse.status).toBe(200)
    expect(ackBody.acknowledged).toBe(1)

    const afterAck = await app.request('/egress/events')
    const afterBody = await readJson<{ count: number }>(afterAck)
    expect(afterBody.count).toBe(0)

    process.env.EGRESS_TARGET = 'local'
  })
})
