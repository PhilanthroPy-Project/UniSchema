import { createHmac } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import { ZodError } from 'zod'

import { createWebhookHandler } from '../src/middleware/webhookHandler.js'
import * as driftCapture from '../src/utils/driftCapture.js'
import * as webhookSignature from '../src/utils/webhookSignature.js'
import { runIngestion } from './helpers/ingestion.js'

const TEST_SECRET = 'test-webhook-secret'

function signBody(rawBody: string, secret = TEST_SECRET): string {
  return createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
}

describe('createWebhookHandler', () => {
  const originalSecret = process.env.TEST_WEBHOOK_SECRET

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.TEST_WEBHOOK_SECRET
    } else {
      process.env.TEST_WEBHOOK_SECRET = originalSecret
    }
  })

  it('returns 202 Accepted with an ingestion id on valid payloads', async () => {
    const app = new Hono()
    app.post(
      '/webhooks/test',
      createWebhookHandler({
        vendor: 'cvent',
        failureMessage: 'Failed to map test payload',
      }),
    )

    const response = await app.request('/webhooks/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    })
    const body = (await response.json()) as { accepted: boolean; ingestionId: string }

    expect(response.status).toBe(202)
    expect(body).toMatchObject({ accepted: true, ingestionId: expect.any(String) })
  })

  it('returns 401 when signature verification fails', async () => {
    process.env.TEST_WEBHOOK_SECRET = TEST_SECRET

    const app = new Hono()
    app.post(
      '/webhooks/test',
      createWebhookHandler({
        vendor: 'cvent',
        failureMessage: 'Failed to map test payload',
        secretEnvKey: 'TEST_WEBHOOK_SECRET',
      }),
    )

    const rawBody = JSON.stringify({ ok: true })
    const verifySpy = vi.spyOn(webhookSignature, 'verifyWebhookSignature')

    const response = await app.request('/webhooks/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': 'deadbeef',
      },
      body: rawBody,
    })
    const body = (await response.json()) as { success: boolean; message: string }

    expect(response.status).toBe(401)
    expect(body.message).toBe('Invalid webhook signature')
    expect(verifySpy).toHaveBeenCalledWith(TEST_SECRET, rawBody, 'deadbeef')

    verifySpy.mockRestore()
  })

  it('accepts requests with a valid x-signature header', async () => {
    process.env.TEST_WEBHOOK_SECRET = TEST_SECRET

    const app = new Hono()
    app.post(
      '/webhooks/test',
      createWebhookHandler({
        vendor: 'cvent',
        failureMessage: 'Failed to map test payload',
        secretEnvKey: 'TEST_WEBHOOK_SECRET',
      }),
    )

    const rawBody = JSON.stringify({ ok: true })
    const verifySpy = vi.spyOn(webhookSignature, 'verifyWebhookSignature')

    const response = await app.request('/webhooks/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': signBody(rawBody),
      },
      body: rawBody,
    })

    expect(response.status).toBe(202)
    expect(verifySpy).toHaveBeenCalledWith(TEST_SECRET, rawBody, signBody(rawBody))

    verifySpy.mockRestore()
  })

  it('returns 500 when signature verification is required but secret env var is missing', async () => {
    process.env.WEBHOOK_SIGNATURE_REQUIRED = 'true'
    delete process.env.TEST_WEBHOOK_SECRET

    const app = new Hono()
    app.post(
      '/webhooks/test',
      createWebhookHandler({
        vendor: 'cvent',
        failureMessage: 'Failed to map test payload',
        secretEnvKey: 'TEST_WEBHOOK_SECRET',
      }),
    )

    const response = await app.request('/webhooks/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': signBody('{}'),
      },
      body: JSON.stringify({ ok: true }),
    })
    const body = (await response.json()) as { success: boolean; message: string }

    expect(response.status).toBe(500)
    expect(body.message).toBe('Webhook secret not configured')

    delete process.env.WEBHOOK_SIGNATURE_REQUIRED
  })

  it('accepts vendor-specific x-givecampus-signature headers', async () => {
    process.env.TEST_WEBHOOK_SECRET = TEST_SECRET

    const app = new Hono()
    app.post(
      '/webhooks/test',
      createWebhookHandler({
        vendor: 'givecampus',
        failureMessage: 'Failed to map test payload',
        secretEnvKey: 'TEST_WEBHOOK_SECRET',
        signatureHeader: 'x-givecampus-signature',
      }),
    )

    const rawBody = JSON.stringify({ ok: true })

    const response = await app.request('/webhooks/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-givecampus-signature': signBody(rawBody),
      },
      body: rawBody,
    })

    expect(response.status).toBe(202)

    delete process.env.TEST_WEBHOOK_SECRET
  })

  it('captures schema drift asynchronously and records failed ingestions', async () => {
    const driftSpy = vi.spyOn(driftCapture, 'captureSchemaDrift').mockResolvedValue({
      captured: true,
      driftEventId: 'drift-123',
      basename: 'cvent-2026-06-20T15-04-05-123Z',
    })
    const mapSpy = vi
      .spyOn(await import('../src/mappers/resolve.js'), 'mapVendorPayload')
      .mockImplementation(() => {
        throw new ZodError([
          {
            code: 'invalid_type',
            expected: 'string',
            path: ['donor_email'],
            message: 'Invalid input: expected string, received undefined',
          },
        ])
      })

    const invalidPayload = { AttendeeStub: 'attendee-12345' }
    const app = new Hono()

    app.post(
      '/webhooks/test',
      createWebhookHandler({
        vendor: 'givecampus',
        failureMessage: 'Failed to map GiveCampus payload to master schema',
      }),
    )

    const response = await app.request('/webhooks/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidPayload),
    })
    const body = (await response.json()) as { accepted: boolean; ingestionId: string }

    expect(response.status).toBe(202)
    expect(body.accepted).toBe(true)

    const ingestion = await runIngestion(
      body.ingestionId,
      'givecampus',
      'Failed to map GiveCampus payload to master schema',
    )

    expect(ingestion.status).toBe('failed')
    expect(driftSpy).toHaveBeenCalledOnce()

    driftSpy.mockRestore()
    mapSpy.mockRestore()
  })

  it('returns 400 for invalid JSON bodies without creating ingestions', async () => {
    const app = new Hono()
    app.post(
      '/webhooks/test',
      createWebhookHandler({
        vendor: 'cvent',
        failureMessage: 'Failed to map test payload',
      }),
    )

    const response = await app.request('/webhooks/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ invalid',
    })

    expect(response.status).toBe(400)
  })
})

describe('processIngestion', () => {
  it('records non-Zod mapping failures without invoking drift capture', async () => {
    const driftSpy = vi.spyOn(driftCapture, 'captureSchemaDrift')
    const resolveSpy = vi.spyOn(await import('../src/mappers/resolve.js'), 'mapVendorPayload')
    resolveSpy.mockImplementation(() => {
      throw new Error('Simulated mapping failure')
    })

    const app = new Hono()
    app.post(
      '/webhooks/test',
      createWebhookHandler({
        vendor: 'cvent',
        failureMessage: 'Failed to map Cvent payload to master schema',
      }),
    )

    const response = await app.request('/webhooks/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    })
    const body = (await response.json()) as { accepted: boolean; ingestionId: string }

    const ingestion = await runIngestion(
      body.ingestionId,
      'cvent',
      'Failed to map Cvent payload to master schema',
    )

    expect(ingestion.status).toBe('failed')
    expect(ingestion.error?.message).toBe('Simulated mapping failure')
    expect(driftSpy).not.toHaveBeenCalled()

    driftSpy.mockRestore()
    resolveSpy.mockRestore()
  })

  it('keeps egress rows pending when publishing fails', async () => {
    const publishSpy = vi
      .spyOn(await import('../src/egress/publisher.js'), 'publishEgressEvent')
      .mockRejectedValue(new Error('Simulated egress failure'))

    const app = new Hono()
    app.post(
      '/webhooks/test',
      createWebhookHandler({
        vendor: 'givecampus',
        failureMessage: 'Failed to map GiveCampus payload to master schema',
      }),
    )

    const response = await app.request('/webhooks/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'gc-egress-fail',
        donation_type: 'donation',
        value: 10,
        currency: 'USD',
        donor_email: 'egress-fail@school.edu',
      }),
    })
    const body = (await response.json()) as { ingestionId: string }

    const ingestion = await runIngestion(
      body.ingestionId,
      'givecampus',
      'Failed to map GiveCampus payload to master schema',
    )

    expect(ingestion.status).toBe('completed')

    const { listPendingEgressEvents } = await import('../src/store/egressStore.js')
    expect(listPendingEgressEvents().some((event) => event.eventId === ingestion.result?.eventId)).toBe(
      true,
    )

    publishSpy.mockRestore()
  })
})

describe('webhook signature helpers', () => {
  it('verifies sha256-prefixed signatures', () => {
    const rawBody = JSON.stringify({ id: 'gc-1' })
    const digest = signBody(rawBody)

    expect(webhookSignature.verifyWebhookSignature(TEST_SECRET, rawBody, `sha256=${digest}`)).toBe(
      true,
    )
  })
})
