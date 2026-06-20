import { describe, expect, it, vi } from 'vitest'
import { ZodError } from 'zod'

import app from '../src/index.js'
import * as cventMapper from '../src/mappers/cvent.js'
import * as giveCampusMapper from '../src/mappers/givecampus.js'
import * as driftCapture from '../src/utils/driftCapture.js'
import {
  validCventPayload,
  validGiveCampusPayload,
} from './fixtures/payloads.js'

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

describe('GET /health', () => {
  it('returns ok status', async () => {
    const response = await app.request('/health')
    const body = await readJson<{ status: string }>(response)

    expect(response.status).toBe(200)
    expect(body).toEqual({ status: 'ok' })
  })
})

describe('POST /webhooks/cvent', () => {
  it('returns 200 and a mapped ConstituentEvent for valid payloads', async () => {
    const response = await postJson('/webhooks/cvent', validCventPayload)
    const body = await readJson<{
      constituentEmail: string
      eventType: string
      sourceSystem: string
      payload: typeof validCventPayload
      eventId: string
    }>(response)

    expect(response.status).toBe(200)
    expect(body.constituentEmail).toBe(validCventPayload.EmailAddress)
    expect(body.eventType).toBe('EVENT_REGISTRATION')
    expect(body.sourceSystem).toBe('CVENT')
    expect(body.payload).toEqual(validCventPayload)
    expect(body.eventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })

  it('returns 400 with flattened Zod errors for invalid payloads', async () => {
    const driftSpy = vi.spyOn(driftCapture, 'captureSchemaDrift').mockResolvedValue({
      captured: false,
      reason: 'disabled',
    })

    const invalidPayload = {
      AttendeeStub: 'attendee-12345',
      EventCode: 'REG-2026-GALA',
    }
    const response = await postJson('/webhooks/cvent', invalidPayload)
    const body = await readJson<{
      success: boolean
      message: string
      errors: { fieldErrors: Record<string, string[] | undefined> }
    }>(response)

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.message).toBe('Failed to map Cvent payload to master schema')
    expect(body.errors.fieldErrors.EmailAddress).toBeDefined()
    expect(driftSpy).toHaveBeenCalledOnce()

    const [vendor, payload, validationError] = driftSpy.mock.calls[0] ?? []
    expect(vendor).toBe('cvent')
    expect(payload).toEqual(invalidPayload)
    expect(validationError).toBeInstanceOf(ZodError)

    driftSpy.mockRestore()
  })

  it('returns 400 when the payload is not a JSON object', async () => {
    const response = await postJson('/webhooks/cvent', ['invalid'])

    expect(response.status).toBe(400)
    const body = await readJson<{ success: boolean }>(response)
    expect(body.success).toBe(false)
  })
})

describe('POST /webhooks/givecampus', () => {
  it('returns 200 and a mapped ConstituentEvent for valid payloads', async () => {
    const response = await postJson('/webhooks/givecampus', validGiveCampusPayload)
    const body = await readJson<{
      constituentEmail: string
      amount: number
      currency: string
      eventType: string
      sourceSystem: string
    }>(response)

    expect(response.status).toBe(200)
    expect(body.constituentEmail).toBe(validGiveCampusPayload.donor_email)
    expect(body.amount).toBe(500)
    expect(body.currency).toBe('USD')
    expect(body.eventType).toBe('DONATION')
    expect(body.sourceSystem).toBe('GIVECAMPUS')
  })

  it('coerces string donation values before responding', async () => {
    const response = await postJson('/webhooks/givecampus', {
      ...validGiveCampusPayload,
      value: '1000.50',
    })
    const body = await readJson<{ amount: number }>(response)

    expect(response.status).toBe(200)
    expect(body.amount).toBe(1000.5)
  })

  it('returns 400 with flattened Zod errors for invalid payloads', async () => {
    const response = await postJson('/webhooks/givecampus', {
      id: 'gc-1002',
      donation_type: 'donation',
      value: 'Five Hundred',
      currency: 'USD',
      donor_email: 'alumni@school.edu',
    })
    const body = await readJson<{
      success: boolean
      message: string
      errors: Record<string, unknown>
    }>(response)

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.message).toBe('Failed to map GiveCampus payload to master schema')
    expect(body.errors).toBeDefined()
  })

  it('returns 400 when donor_email is malformed', async () => {
    const response = await postJson('/webhooks/givecampus', {
      ...validGiveCampusPayload,
      donor_email: 'not-an-email',
    })
    const body = await readJson<{
      errors: { fieldErrors: Record<string, string[] | undefined> }
    }>(response)

    expect(response.status).toBe(400)
    expect(body.errors.fieldErrors.donor_email).toBeDefined()
  })

  it('returns 400 with a descriptive message for non-Zod mapping errors', async () => {
    const spy = vi
      .spyOn(giveCampusMapper, 'mapGiveCampusToMaster')
      .mockImplementation(() => {
        throw new Error('Simulated GiveCampus mapping failure')
      })

    const response = await postJson('/webhooks/givecampus', validGiveCampusPayload)
    const body = await readJson<{ success: boolean; message: string }>(response)

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.message).toBe('Simulated GiveCampus mapping failure')

    spy.mockRestore()
  })
})

describe('POST /webhooks/cvent — non-Zod failures', () => {
  it('returns 400 with a generic message when mapping throws a non-Error value', async () => {
    const spy = vi.spyOn(cventMapper, 'mapCventToMaster').mockImplementation(() => {
      throw 'unexpected failure'
    })

    const response = await postJson('/webhooks/cvent', validCventPayload)
    const body = await readJson<{ success: boolean; message: string }>(response)

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.message).toBe('Unknown mapping error')

    spy.mockRestore()
  })
})
