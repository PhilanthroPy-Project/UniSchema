import { describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import { ZodError } from 'zod'

import { createWebhookHandler } from '../src/middleware/webhookHandler.js'
import * as driftCapture from '../src/utils/driftCapture.js'

describe('createWebhookHandler', () => {
  it('returns mapped payloads on success', async () => {
    const app = new Hono()
    app.post(
      '/webhooks/test',
      createWebhookHandler({
        vendor: 'cvent',
        mapToMaster: () => ({
          eventId: '11111111-1111-4111-8111-111111111111',
          constituentEmail: 'jane.doe@university.edu',
          eventType: 'EVENT_REGISTRATION',
          sourceSystem: 'CVENT',
          payload: {},
          createdAt: '2026-06-20T15:04:05.123Z',
        }),
        failureMessage: 'Failed to map test payload',
      }),
    )

    const response = await app.request('/webhooks/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    })

    expect(response.status).toBe(200)
  })

  it('captures schema drift and returns flattened Zod errors', async () => {
    const driftSpy = vi.spyOn(driftCapture, 'captureSchemaDrift').mockResolvedValue({
      captured: false,
      reason: 'disabled',
    })
    const invalidPayload = { AttendeeStub: 'attendee-12345' }
    const app = new Hono()

    app.post(
      '/webhooks/test',
      createWebhookHandler({
        vendor: 'givecampus',
        mapToMaster: () => {
          throw new ZodError([
            {
              code: 'invalid_type',
              expected: 'string',
              path: ['donor_email'],
              message: 'Invalid input: expected string, received undefined',
            },
          ])
        },
        failureMessage: 'Failed to map GiveCampus payload to master schema',
      }),
    )

    const response = await app.request('/webhooks/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidPayload),
    })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toMatchObject({
      success: false,
      message: 'Failed to map GiveCampus payload to master schema',
    })
    expect(driftSpy).toHaveBeenCalledOnce()

    driftSpy.mockRestore()
  })

  it('returns non-Zod mapping failures without invoking drift capture', async () => {
    const driftSpy = vi.spyOn(driftCapture, 'captureSchemaDrift')
    const app = new Hono()

    app.post(
      '/webhooks/test',
      createWebhookHandler({
        vendor: 'cvent',
        mapToMaster: () => {
          throw new Error('Simulated mapping failure')
        },
        failureMessage: 'Failed to map Cvent payload to master schema',
      }),
    )

    const response = await app.request('/webhooks/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toEqual({
      success: false,
      message: 'Simulated mapping failure',
    })
    expect(driftSpy).not.toHaveBeenCalled()

    driftSpy.mockRestore()
  })
})
