import { ZodError } from 'zod'
import { describe, expect, it } from 'vitest'

import app from '../helpers/app.js'
import {
  clearDriftQueue,
  enqueueDriftEvent,
  markDriftEventProcessed,
} from '../../src/store/driftQueue.js'

const sampleZodError = new ZodError([
  {
    code: 'invalid_type',
    expected: 'string',
    path: ['EmailAddress'],
    message: 'Invalid input: expected string, received undefined',
  },
])

describe('health and vendor registry routes', () => {
  it('GET /health returns extended metadata', async () => {
    const response = await app.request('/health')
    const body = (await response.json()) as {
      status: string
      version: string
      egressTarget: string
      driftPendingCount: number
      driftProcessedCount: number
      humanAckRate: number | null
      pendingIngestionCount: number
      ingestQueue: string
    }

    expect(response.status).toBe(200)
    expect(body.status).toBe('ok')
    expect(typeof body.version).toBe('string')
    expect(typeof body.driftPendingCount).toBe('number')
    expect(typeof body.driftProcessedCount).toBe('number')
    expect(body.humanAckRate === null || typeof body.humanAckRate === 'number').toBe(true)
    expect(typeof body.pendingIngestionCount).toBe('number')
    expect(['inline', 'pg-boss']).toContain(body.ingestQueue)
  })

  it('GET /health reports humanAckRate from acknowledged drift events', async () => {
    await clearDriftQueue()
    const first = await enqueueDriftEvent('cvent', { AttendeeStub: 'x' }, sampleZodError)
    await enqueueDriftEvent('givecampus', { id: 'gc-1' }, sampleZodError)
    await markDriftEventProcessed(first.id)

    const response = await app.request('/health')
    const body = (await response.json()) as {
      driftProcessedCount: number
      humanAckRate: number | null
    }

    expect(body.driftProcessedCount).toBe(1)
    expect(body.humanAckRate).toBe(0.5)

    await clearDriftQueue()
  })

  it('GET /api/vendors lists all eight built-in vendors', async () => {
    const response = await app.request('/api/vendors')
    const body = (await response.json()) as {
      vendors: Array<{ slug: string; webhookPath: string; tier: number }>
    }

    expect(body.vendors).toHaveLength(8)
    expect(body.vendors.map((vendor) => vendor.slug).sort()).toEqual([
      'blackbaud',
      'civicrm',
      'cvent',
      'ellucian',
      'givecampus',
      'imodules',
      'npsp',
      'slate',
    ])
    expect(body.vendors.every((vendor) => typeof vendor.tier === 'number')).toBe(true)
  })

  it('GET /api/config/public exposes oidc flag and vendors', async () => {
    const response = await app.request('/api/config/public')
    const body = (await response.json()) as {
      oidcEnabled: boolean
      vendors: Array<{ slug: string }>
    }

    expect(response.status).toBe(200)
    expect(typeof body.oidcEnabled).toBe('boolean')
    expect(body.vendors.length).toBeGreaterThan(0)
  })
})
