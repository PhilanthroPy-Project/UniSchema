import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ZodError } from 'zod'

import app from '../src/index.js'
import { clearDriftQueue, enqueueDriftEvent } from '../src/store/driftQueue.js'

const sampleZodError = new ZodError([
  {
    code: 'invalid_type',
    expected: 'string',
    path: ['EmailAddress'],
    message: 'Invalid input: expected string, received undefined',
  },
])

describe('drift agent API', () => {
  const originalToken = process.env.DRIFT_AGENT_TOKEN

  beforeEach(() => {
    clearDriftQueue()
    process.env.DRIFT_AGENT_TOKEN = 'test-agent-token'
  })

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.DRIFT_AGENT_TOKEN
    } else {
      process.env.DRIFT_AGENT_TOKEN = originalToken
    }
  })

  it('requires auth to include raw payloads', async () => {
    enqueueDriftEvent('cvent', { AttendeeStub: 'x' }, sampleZodError)

    const response = await app.request('/drift/events?status=pending&includePayload=true')

    expect(response.status).toBe(401)
  })

  it('returns pending drift payloads for authorized agents', async () => {
    enqueueDriftEvent('cvent', { AttendeeStub: 'x' }, sampleZodError)

    const response = await app.request('/drift/events?status=pending&includePayload=true', {
      headers: { Authorization: 'Bearer test-agent-token' },
    })

    expect(response.status).toBe(200)

    const body = (await response.json()) as {
      success: boolean
      count: number
      events: Array<{ rawPayload: unknown; status: string }>
    }

    expect(body.success).toBe(true)
    expect(body.count).toBe(1)
    expect(body.events[0]?.rawPayload).toEqual({ AttendeeStub: 'x' })
    expect(body.events[0]?.status).toBe('pending')
  })

  it('marks drift events as processed via ack endpoint', async () => {
    const event = enqueueDriftEvent('givecampus', { id: 'gc-1' }, sampleZodError)

    const ackResponse = await app.request(`/drift/events/${event.id}/ack`, {
      method: 'POST',
      headers: { Authorization: 'Bearer test-agent-token' },
    })

    expect(ackResponse.status).toBe(200)

    const listResponse = await app.request('/drift/events?status=pending', {
      headers: { Authorization: 'Bearer test-agent-token' },
    })

    const body = (await listResponse.json()) as { count: number }

    expect(body.count).toBe(0)
  })

  it('rejects unauthorized drift ack requests', async () => {
    const event = enqueueDriftEvent('cvent', { AttendeeStub: 'x' }, sampleZodError)

    const response = await app.request(`/drift/events/${event.id}/ack`, { method: 'POST' })

    expect(response.status).toBe(401)
  })

  it('returns 404 when acknowledging an unknown drift event', async () => {
    const response = await app.request('/drift/events/missing-id/ack', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-agent-token' },
    })

    expect(response.status).toBe(404)
  })
})
