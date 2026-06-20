import { describe, expect, it, vi } from 'vitest'
import { ZodError } from 'zod'

import app from '../src/index.js'
import * as cventMapper from '../src/mappers/cvent.js'
import * as giveCampusMapper from '../src/mappers/givecampus.js'
import { listPendingEgressEvents } from '../src/store/egressStore.js'
import { listDriftEvents } from '../src/store/driftQueue.js'
import { upsertMapping } from '../src/store/mappingRegistry.js'
import * as driftCapture from '../src/utils/driftCapture.js'
import {
  validCventPayload,
  validGiveCampusPayload,
  validImodulesPayload,
} from './fixtures/payloads.js'
import { runIngestion, waitForIngestion } from './helpers/ingestion.js'

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
  it('returns ok status with version metadata', async () => {
    const response = await app.request('/health')
    const body = await readJson<{ status: string; version: string; egressTarget: string }>(
      response,
    )

    expect(response.status).toBe(200)
    expect(body.status).toBe('ok')
    expect(body.version).toBeTruthy()
    expect(body.egressTarget).toBeTruthy()
  })
})

describe('POST /webhooks/cvent', () => {
  it('accepts valid payloads asynchronously and persists egress events', async () => {
    const response = await postJson('/webhooks/cvent', validCventPayload)
    const body = await readJson<{ accepted: boolean; ingestionId: string }>(response)

    expect(response.status).toBe(202)
    expect(body.accepted).toBe(true)

    const ingestion = await waitForIngestion(body.ingestionId)

    expect(ingestion.status).toBe('completed')
    expect(ingestion.result?.constituentEmail).toBe(validCventPayload.EmailAddress)

    const pending = await listPendingEgressEvents()
    expect(pending.some((event) => event.eventId === ingestion.result?.eventId)).toBe(false)
  })

  it('records flattened Zod errors for invalid payloads', async () => {
    process.env.DRIFT_CAPTURE = 'queue-only'

    const invalidPayload = {
      AttendeeStub: 'attendee-12345',
      EventCode: 'REG-2026-GALA',
    }
    const response = await postJson('/webhooks/cvent', invalidPayload)
    const body = await readJson<{ accepted: boolean; ingestionId: string }>(response)

    expect(response.status).toBe(202)

    const ingestion = await waitForIngestion(body.ingestionId)

    expect(ingestion.status).toBe('failed')
    expect(ingestion.error?.message).toBe('Failed to map Cvent payload to master schema')
    const fieldErrors = ingestion.error?.errors?.fieldErrors as
      | Record<string, string[] | undefined>
      | undefined
    expect(fieldErrors?.EmailAddress).toBeDefined()

    const driftEvents = await listDriftEvents('cvent')
    expect(driftEvents.length).toBeGreaterThan(0)

    delete process.env.DRIFT_CAPTURE
  })

  it('returns 400 when the payload is not a JSON object', async () => {
    const response = await postJson('/webhooks/cvent', ['invalid'])

    expect(response.status).toBe(400)
    const body = await readJson<{ success: boolean }>(response)
    expect(body.success).toBe(false)
  })
})

describe('POST /webhooks/givecampus', () => {
  it('accepts valid payloads asynchronously', async () => {
    const response = await postJson('/webhooks/givecampus', validGiveCampusPayload)
    const body = await readJson<{ ingestionId: string }>(response)

    expect(response.status).toBe(202)

    const ingestion = await waitForIngestion(body.ingestionId)

    expect(ingestion.status).toBe('completed')
    expect(ingestion.result?.constituentEmail).toBe(validGiveCampusPayload.donor_email)
    expect(ingestion.result?.amount).toBe(500)
    expect(ingestion.result?.currency).toBe('USD')
    expect(ingestion.result?.eventType).toBe('DONATION')
    expect(ingestion.result?.sourceSystem).toBe('GIVECAMPUS')
  })

  it('coerces string donation values during async processing', async () => {
    const response = await postJson('/webhooks/givecampus', {
      ...validGiveCampusPayload,
      value: '1000.50',
    })
    const body = await readJson<{ ingestionId: string }>(response)
    const ingestion = await waitForIngestion(body.ingestionId)

    expect(ingestion.result?.amount).toBe(1000.5)
  })

  it('records validation failures for invalid payloads', async () => {
    const response = await postJson('/webhooks/givecampus', {
      id: 'gc-1002',
      donation_type: 'donation',
      value: 'Five Hundred',
      currency: 'USD',
      donor_email: 'alumni@school.edu',
    })
    const body = await readJson<{ ingestionId: string }>(response)
    const ingestion = await waitForIngestion(body.ingestionId)

    expect(ingestion.status).toBe('failed')
    expect(ingestion.error?.message).toBe('Failed to map GiveCampus payload to master schema')
  })

  it('records malformed donor_email failures', async () => {
    const response = await postJson('/webhooks/givecampus', {
      ...validGiveCampusPayload,
      donor_email: 'not-an-email',
    })
    const body = await readJson<{ ingestionId: string }>(response)
    const ingestion = await waitForIngestion(body.ingestionId)

    expect(ingestion.status).toBe('failed')
    const fieldErrors = ingestion.error?.errors?.fieldErrors as
      | Record<string, string[] | undefined>
      | undefined
    expect(fieldErrors?.donor_email).toBeDefined()
  })

  it('records descriptive messages for non-Zod mapping errors', async () => {
    const spy = vi
      .spyOn(giveCampusMapper, 'mapGiveCampusToMaster')
      .mockImplementation(() => {
        throw new Error('Simulated GiveCampus mapping failure')
      })

    const response = await postJson('/webhooks/givecampus', validGiveCampusPayload)
    const body = await readJson<{ ingestionId: string }>(response)
    const ingestion = await runIngestion(
      body.ingestionId,
      'givecampus',
      'Failed to map GiveCampus payload to master schema',
    )

    expect(ingestion.status).toBe('failed')
    expect(ingestion.error?.message).toBe('Simulated GiveCampus mapping failure')

    spy.mockRestore()
  })
})

describe('POST /webhooks/cvent — non-Zod failures', () => {
  it('records a generic message when mapping throws a non-Error value', async () => {
    const spy = vi.spyOn(cventMapper, 'mapCventToMaster').mockImplementation(() => {
      throw 'unexpected failure'
    })

    const response = await postJson('/webhooks/cvent', validCventPayload)
    const body = await readJson<{ ingestionId: string }>(response)
    const ingestion = await runIngestion(
      body.ingestionId,
      'cvent',
      'Failed to map Cvent payload to master schema',
    )

    expect(ingestion.status).toBe('failed')
    expect(ingestion.error?.message).toBe('Unknown mapping error')

    spy.mockRestore()
  })
})

describe('admin-defined mappings at runtime', () => {
  it('uses synced canvas mappings instead of built-in mappers', async () => {
    await upsertMapping(
      {
        vendor: 'GiveCampus',
        exportedAt: '2026-06-20T12:00:00.000Z',
        mappings: [
          { source: 'donor_email', target: 'constituentEmail' },
          { source: 'value', target: 'amount' },
          { source: 'currency', target: 'currency' },
        ],
        metadataMappings: [{ source: 'donation_type', key: 'donationType' }],
      },
      '2026-06-20T12:00:00.000Z',
    )

    const response = await postJson('/webhooks/givecampus', validGiveCampusPayload)
    const body = await readJson<{ ingestionId: string }>(response)
    const ingestion = await waitForIngestion(body.ingestionId)

    expect(ingestion.status).toBe('completed')
    expect(ingestion.result?.normalizedMetadata).toEqual({ donationType: 'donation' })
  })
})

describe('GET /webhooks/ingestions/:id', () => {
  it('returns ingestion status and mapped result', async () => {
    const postResponse = await postJson('/webhooks/cvent', validCventPayload)
    const postBody = await readJson<{ ingestionId: string }>(postResponse)
    await waitForIngestion(postBody.ingestionId)

    const response = await app.request(`/webhooks/ingestions/${postBody.ingestionId}`)
    const body = await readJson<{ success: boolean; ingestion: { status: string } }>(response)

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.ingestion.status).toBe('completed')
  })
})

describe('GET /egress/events', () => {
  it('returns pending warehouse staging rows when push egress is disabled', async () => {
    process.env.EGRESS_TARGET = 'none'

    const postResponse = await postJson('/webhooks/givecampus', validGiveCampusPayload)
    const postBody = await readJson<{ ingestionId: string }>(postResponse)
    await waitForIngestion(postBody.ingestionId)

    const response = await app.request('/egress/events')
    const body = await readJson<{ success: boolean; count: number }>(response)

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.count).toBeGreaterThan(0)

    process.env.EGRESS_TARGET = 'local'
  })
})

describe('drift capture observability', () => {
  it('does not invoke drift capture when disabled', async () => {
    process.env.DRIFT_CAPTURE = 'disabled'
    const driftSpy = vi.spyOn(driftCapture, 'captureSchemaDrift')

    const response = await postJson('/webhooks/cvent', {
      AttendeeStub: 'attendee-12345',
      EventCode: 'REG-2026-GALA',
    })
    const body = await readJson<{ ingestionId: string }>(response)
    await waitForIngestion(body.ingestionId)

    expect(driftSpy).not.toHaveBeenCalled()

    delete process.env.DRIFT_CAPTURE
    driftSpy.mockRestore()
  })
})

describe('POST /webhooks/imodules', () => {
  it('accepts valid iModules payloads asynchronously', async () => {
    const response = await postJson('/webhooks/imodules', validImodulesPayload)
    const body = await readJson<{ ingestionId: string }>(response)

    expect(response.status).toBe(202)

    const ingestion = await waitForIngestion(body.ingestionId)

    expect(ingestion.status).toBe('completed')
    expect(ingestion.result?.sourceSystem).toBe('IMODULES')
    expect(ingestion.result?.eventType).toBe('EVENT_REGISTRATION')
  })
})

describe('POST /webhooks/blackbaud', () => {
  it('accepts valid Blackbaud payloads asynchronously', async () => {
    const { validBlackbaudPayload } = await import('./fixtures/payloads.js')
    const response = await postJson('/webhooks/blackbaud', validBlackbaudPayload)
    const body = await readJson<{ ingestionId: string }>(response)

    expect(response.status).toBe(202)

    const ingestion = await waitForIngestion(body.ingestionId)

    expect(ingestion.status).toBe('completed')
    expect(ingestion.result?.sourceSystem).toBe('BLACKBAUD')
  })
})

describe('POST /webhooks/npsp', () => {
  it('accepts valid NPSP payloads asynchronously', async () => {
    const { validNpspPayload } = await import('./fixtures/payloads.js')
    const response = await postJson('/webhooks/npsp', validNpspPayload)
    const body = await readJson<{ ingestionId: string }>(response)

    expect(response.status).toBe(202)

    const ingestion = await waitForIngestion(body.ingestionId)

    expect(ingestion.status).toBe('completed')
    expect(ingestion.result?.sourceSystem).toBe('NPSP')
  })
})

describe('GET /api/vendors', () => {
  it('lists registered webhook vendors', async () => {
    const response = await app.request('/api/vendors')
    const body = await readJson<{ success: boolean; vendors: Array<{ slug: string }> }>(response)

    expect(response.status).toBe(200)
    expect(body.vendors.map((vendor) => vendor.slug)).toEqual(
      expect.arrayContaining(['givecampus', 'cvent', 'imodules', 'blackbaud', 'npsp']),
    )
  })
})
