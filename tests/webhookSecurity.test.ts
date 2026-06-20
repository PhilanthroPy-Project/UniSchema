import { createHmac } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'

import { getDb } from '../src/db/client.js'
import { webhookIngestions } from '../src/db/schema.js'
import app from '../src/index.js'
import { listPendingEgressEvents } from '../src/store/egressStore.js'
import { validGiveCampusPayload } from './fixtures/payloads.js'

const TEST_SECRET = 'givecampus-hmac-test-key'

function signBody(rawBody: string, secret = TEST_SECRET): string {
  return createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
}

function countIngestions(): number {
  return getDb().select().from(webhookIngestions).all().length
}

async function postGiveCampus(
  body: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  const rawBody = JSON.stringify(body)

  return app.request('/webhooks/givecampus', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: rawBody,
  })
}

describe('webhook security — HMAC enforcement', () => {
  const originalSecret = process.env.GIVECAMPUS_WEBHOOK_SECRET
  const originalRequired = process.env.WEBHOOK_SIGNATURE_REQUIRED

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.GIVECAMPUS_WEBHOOK_SECRET
    } else {
      process.env.GIVECAMPUS_WEBHOOK_SECRET = originalSecret
    }

    if (originalRequired === undefined) {
      delete process.env.WEBHOOK_SIGNATURE_REQUIRED
    } else {
      process.env.WEBHOOK_SIGNATURE_REQUIRED = originalRequired
    }
  })

  it('rejects unsigned spoofed payloads with 401 when a secret is configured', async () => {
    process.env.GIVECAMPUS_WEBHOOK_SECRET = TEST_SECRET
    process.env.WEBHOOK_SIGNATURE_REQUIRED = 'true'

    const beforeCount = countIngestions()
    const response = await postGiveCampus(validGiveCampusPayload)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toMatchObject({
      success: false,
      message: 'Invalid webhook signature',
    })
    expect(countIngestions()).toBe(beforeCount)
    expect(listPendingEgressEvents()).toHaveLength(0)
  })

  it('rejects payloads when the signature was computed for a different body', async () => {
    process.env.GIVECAMPUS_WEBHOOK_SECRET = TEST_SECRET

    const tamperedBody = JSON.stringify({
      ...validGiveCampusPayload,
      value: 999_999,
    })
    const signatureForOriginal = signBody(JSON.stringify(validGiveCampusPayload))

    const beforeCount = countIngestions()
    const response = await app.request('/webhooks/givecampus', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-givecampus-signature': signatureForOriginal,
      },
      body: tamperedBody,
    })

    expect(response.status).toBe(401)
    expect(countIngestions()).toBe(beforeCount)
  })

  it('accepts vendor-signed payloads and creates an ingestion record', async () => {
    process.env.GIVECAMPUS_WEBHOOK_SECRET = TEST_SECRET

    const rawBody = JSON.stringify(validGiveCampusPayload)
    const beforeCount = countIngestions()

    const response = await postGiveCampus(validGiveCampusPayload, {
      'x-givecampus-signature': signBody(rawBody),
    })
    const body = (await response.json()) as { accepted: boolean; ingestionId: string }

    expect(response.status).toBe(202)
    expect(body.accepted).toBe(true)
    expect(countIngestions()).toBe(beforeCount + 1)
  })

  it('returns 500 when signature verification is required but the secret is missing', async () => {
    delete process.env.GIVECAMPUS_WEBHOOK_SECRET
    process.env.WEBHOOK_SIGNATURE_REQUIRED = 'true'

    const response = await postGiveCampus(validGiveCampusPayload, {
      'x-givecampus-signature': signBody(JSON.stringify(validGiveCampusPayload)),
    })
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toMatchObject({
      success: false,
      message: 'Webhook secret not configured',
    })
  })

  it('rejects Cvent spoof attempts without x-cvent-signature when secret is configured', async () => {
    process.env.CVENT_WEBHOOK_SECRET = 'cvent-hmac-test-key'

    const beforeCount = countIngestions()
    const response = await app.request('/webhooks/cvent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        AttendeeStub: 'attendee-spoof',
        EmailAddress: 'spoof@university.edu',
        EventCode: 'REG-2026-GALA',
      }),
    })

    expect(response.status).toBe(401)
    expect(countIngestions()).toBe(beforeCount)

    delete process.env.CVENT_WEBHOOK_SECRET
  })
})
