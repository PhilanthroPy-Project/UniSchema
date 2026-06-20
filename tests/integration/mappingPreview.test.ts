import { afterEach, describe, expect, it } from 'vitest'

import app from '../helpers/app.js'

async function postJson(path: string, body: unknown, headers: Record<string, string> = {}) {
  return app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

const previewBody = {
  vendor: 'GiveCampus',
  exportedAt: '2026-06-20T12:00:00.000Z',
  mappings: [
    { source: 'donor_email', target: 'constituentEmail' },
    { source: 'value', target: 'amount' },
    { source: 'currency', target: 'currency' },
  ],
  metadataMappings: [],
  samplePayload: {
    id: 'gc-1',
    donor_email: 'a@b.edu',
    value: 10,
    currency: 'USD',
    donation_type: 'one_time',
  },
}

describe('POST /mappings/preview', () => {
  const originalRequired = process.env.MAPPING_SYNC_REQUIRED
  const originalToken = process.env.MAPPING_SYNC_TOKEN

  afterEach(() => {
    if (originalRequired === undefined) {
      delete process.env.MAPPING_SYNC_REQUIRED
    } else {
      process.env.MAPPING_SYNC_REQUIRED = originalRequired
    }

    if (originalToken === undefined) {
      delete process.env.MAPPING_SYNC_TOKEN
    } else {
      process.env.MAPPING_SYNC_TOKEN = originalToken
    }
  })

  it('returns ConstituentEvent preview for valid artifact and payload', async () => {
    const response = await postJson('/mappings/preview', previewBody)
    const body = (await response.json()) as { success: boolean; event: { constituentEmail: string } }

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.event.constituentEmail).toBe('a@b.edu')
  })

  it('rejects preview when samplePayload is missing', async () => {
    const { samplePayload: _, ...withoutPayload } = previewBody
    const response = await postJson('/mappings/preview', withoutPayload)

    expect(response.status).toBe(400)
  })

  it('returns 422 when mapped email fails validation', async () => {
    const response = await postJson('/mappings/preview', {
      ...previewBody,
      samplePayload: { ...previewBody.samplePayload, donor_email: 'not-an-email' },
    })

    expect(response.status).toBe(422)
  })

  it('returns 401 when mapping sync token is required but missing', async () => {
    process.env.MAPPING_SYNC_REQUIRED = 'true'
    process.env.MAPPING_SYNC_TOKEN = 'preview-secret'

    const response = await postJson('/mappings/preview', previewBody)

    expect(response.status).toBe(401)
  })

  it('returns 500 when mapping sync is misconfigured', async () => {
    process.env.MAPPING_SYNC_REQUIRED = 'true'
    delete process.env.MAPPING_SYNC_TOKEN

    const response = await postJson('/mappings/preview', previewBody)

    expect(response.status).toBe(500)
  })
})
