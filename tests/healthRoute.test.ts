import { describe, expect, it } from 'vitest'

import app from '../src/index.js'

describe('health and vendor registry routes', () => {
  it('GET /health returns extended metadata', async () => {
    const response = await app.request('/health')
    const body = (await response.json()) as {
      status: string
      version: string
      egressTarget: string
      driftPendingCount: number
    }

    expect(response.status).toBe(200)
    expect(body.status).toBe('ok')
    expect(typeof body.version).toBe('string')
    expect(typeof body.driftPendingCount).toBe('number')
  })

  it('GET /api/vendors lists all built-in vendors', async () => {
    const response = await app.request('/api/vendors')
    const body = (await response.json()) as {
      vendors: Array<{ slug: string; webhookPath: string }>
    }

    expect(body.vendors.length).toBeGreaterThanOrEqual(5)
    expect(body.vendors.find((vendor) => vendor.slug === 'blackbaud')?.webhookPath).toBe(
      '/webhooks/blackbaud',
    )
  })
})
