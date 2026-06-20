import { describe, expect, it } from 'vitest'

import app from '../src/index.js'
import { enqueueDriftEvent } from '../src/store/driftQueue.js'
import { ZodError } from 'zod'

async function readJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>
}

describe('GET /drift/events', () => {
  it('lists persisted drift dead-letter events', async () => {
    await enqueueDriftEvent(
      'cvent',
      { AttendeeStub: 'x' },
      new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          path: ['EmailAddress'],
          message: 'Invalid input: expected string, received undefined',
        },
      ]),
    )

    const response = await app.request('/drift/events?vendor=cvent')
    const body = await readJson<{ success: boolean; count: number }>(response)

    expect(response.status).toBe(200)
    expect(body.count).toBeGreaterThan(0)
  })

  it('lists all vendors when no vendor filter is provided', async () => {
    await enqueueDriftEvent(
      'givecampus',
      { id: 'gc-1' },
      new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          path: ['donor_email'],
          message: 'Invalid input: expected string, received undefined',
        },
      ]),
    )

    const response = await app.request('/drift/events')
    const body = await readJson<{ success: boolean; count: number }>(response)

    expect(response.status).toBe(200)
    expect(body.count).toBeGreaterThan(0)
  })

  it('rejects unknown drift vendors', async () => {
    const response = await app.request('/drift/events?vendor=unknown')
    const body = await readJson<{ success: boolean; message: string }>(response)

    expect(response.status).toBe(400)
    expect(body.message).toBe('Invalid vendor')
  })

  it('rejects invalid drift status filters', async () => {
    const response = await app.request('/drift/events?status=archived')
    const body = await readJson<{ success: boolean; message: string }>(response)

    expect(response.status).toBe(400)
    expect(body.message).toBe('status must be pending or processed')
  })
})

describe('GET /webhooks/ingestions/:id', () => {
  it('returns 404 for unknown ingestion ids', async () => {
    const response = await app.request('/webhooks/ingestions/not-a-real-id')
    const body = await readJson<{ success: boolean; message: string }>(response)

    expect(response.status).toBe(404)
    expect(body.message).toBe('Ingestion not found')
  })
})

describe('GET /egress/events', () => {
  it('rejects invalid limit query params', async () => {
    const response = await app.request('/egress/events?limit=0')
    const body = await readJson<{ success: boolean; message: string }>(response)

    expect(response.status).toBe(400)
    expect(body.message).toBe('limit must be between 1 and 500')
  })
})

describe('GET /mappings/:vendor', () => {
  it('returns 400 when vendor param is empty', async () => {
    const response = await app.request('/mappings/%20')
    const body = await readJson<{ success: boolean; message: string }>(response)

    expect(response.status).toBe(400)
    expect(body.message).toBe('Vendor is required')
  })

  it('returns 404 when no mapping exists', async () => {
    const response = await app.request('/mappings/nonexistent-vendor')
    const body = await readJson<{ success: boolean; message: string }>(response)

    expect(response.status).toBe(404)
    expect(body.message).toContain('No mapping found')
  })
})

describe('POST /egress/ack', () => {
  it('rejects malformed ack payloads', async () => {
    const response = await app.request('/egress/ack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [] }),
    })
    const body = await readJson<{ success: boolean; message: string }>(response)

    expect(response.status).toBe(400)
    expect(body.message).toBe('Invalid ack payload')
  })

  it('rejects non-JSON ack bodies', async () => {
    const response = await app.request('/egress/ack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ invalid',
    })
    const body = await readJson<{ success: boolean; message: string }>(response)

    expect(response.status).toBe(400)
    expect(body.message).toBe('Request body must be valid JSON')
  })
})
