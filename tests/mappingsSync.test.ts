import { afterEach, describe, expect, it } from 'vitest'

import app from '../src/index.js'
import { clearMappingRegistry, getMapping } from '../src/store/mappingRegistry.js'

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
}

describe('POST /mappings/sync', () => {
  afterEach(() => {
    clearMappingRegistry()
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

    const stored = getMapping('givecampus')
    expect(stored?.mappings).toEqual(validArtifact.mappings)
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
})
