import { describe, expect, it } from 'vitest'

import app from '../helpers/app.js'

describe('health and vendor registry routes', () => {
  it('GET /health returns extended metadata', async () => {
    const response = await app.request('/health')
    const body = (await response.json()) as {
      status: string
      version: string
      egressTarget: string
      driftPendingCount: number
      pendingIngestionCount: number
      ingestQueue: string
    }

    expect(response.status).toBe(200)
    expect(body.status).toBe('ok')
    expect(typeof body.version).toBe('string')
    expect(typeof body.driftPendingCount).toBe('number')
    expect(typeof body.pendingIngestionCount).toBe('number')
    expect(['inline', 'pg-boss']).toContain(body.ingestQueue)
  })

  it('GET /api/vendors lists all six built-in vendors', async () => {
    const response = await app.request('/api/vendors')
    const body = (await response.json()) as {
      vendors: Array<{ slug: string; webhookPath: string }>
    }

    expect(body.vendors).toHaveLength(6)
    expect(body.vendors.map((vendor) => vendor.slug).sort()).toEqual([
      'blackbaud',
      'cvent',
      'givecampus',
      'imodules',
      'npsp',
      'slate',
    ])
  })
})
