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

  it('GET /api/vendors lists all seven built-in vendors', async () => {
    const response = await app.request('/api/vendors')
    const body = (await response.json()) as {
      vendors: Array<{ slug: string; webhookPath: string; tier: number }>
    }

    expect(body.vendors).toHaveLength(7)
    expect(body.vendors.map((vendor) => vendor.slug).sort()).toEqual([
      'blackbaud',
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
